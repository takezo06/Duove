import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { createUserClient } from '../config/supabase';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/auth';
import { dailyLimitMiddleware } from '../middleware/dailyLimit';
import { incrementDailyUsage } from '../services/limitService';
import {
  createLetter,
  getLetters,
  getLetterById,
} from '../services/lettersService';
import { uploadLetterImage, getPresignedUrl } from '../services/storageService';

const router = Router();

// Configure multer for memory storage (max 200 KB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024, // 200 KB
  },
});

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/letters
 * Fetch all letters for a relationship.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const relationshipId = req.query.relationshipId as string;
    if (!relationshipId) {
      res.status(400).json({ error: 'relationshipId query param is required' });
      return;
    }

    const supabase = createUserClient(req.token!);
    const letters = await getLetters(supabase, relationshipId);

    // Generate presigned URLs for images (if any) before sending
    const lettersWithUrls = await Promise.all(
      letters.map(async (letter) => {
        if (letter.image_url) {
          try {
            const url = await getPresignedUrl(supabase, letter.image_url);
            return { ...letter, image_url: url }; // Replace path with presigned URL
          } catch {
            // If presigned URL fails, keep the path (or null)
            return { ...letter, image_url: null };
          }
        }
        return letter;
      })
    );

    res.status(200).json(lettersWithUrls);
  } catch (error) {
    logger.error('GET /api/letters error', { error });
    next(error);
  }
});

/**
 * GET /api/letters/:id
 * Fetch a single letter with a fresh presigned URL for the image.
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const letterId = req.params.id as string;
    const supabase = createUserClient(req.token!);

    const letter = await getLetterById(supabase, letterId);

    // Generate presigned URL if image exists
    let responseLetter = { ...letter };
    if (letter.image_url) {
      try {
        const url = await getPresignedUrl(supabase, letter.image_url);
        responseLetter.image_url = url;
      } catch {
        responseLetter.image_url = null;
      }
    }

    res.status(200).json(responseLetter);
  } catch (error) {
    logger.error('GET /api/letters/:id error', { error });
    next(error);
  }
});

/**
 * POST /api/letters
 * Create a new letter with optional image.
 * Enforces daily limit: 5 letters per user per day.
 */
router.post(
  '/',
  dailyLimitMiddleware('letter'),
  upload.single('image'), // Expect field name 'image'
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { relationshipId, recipientId, content, spotifyId } = req.body;
      const senderId = req.user!.id;

      // Validation
      if (!relationshipId || !recipientId || !content) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      if (content.trim().length === 0) {
        res.status(400).json({ error: 'Content cannot be empty' });
        return;
      }

      const supabase = createUserClient(req.token!);

      // 1. Upload image if present
      let imagePath: string | null = null;
      if (req.file) {
        try {
          imagePath = await uploadLetterImage(supabase, senderId, req.file);
        } catch (uploadError) {
          res.status(400).json({
            error: 'Image upload failed',
            details: uploadError instanceof Error ? uploadError.message : 'Unknown error',
          });
          return;
        }
      }

      // 2. Create the letter in the database
      const letter = await createLetter(
        supabase,
        relationshipId,
        senderId,
        recipientId,
        content,
        spotifyId || null,
        imagePath
      );

      // 3. Increment daily usage
      await incrementDailyUsage(supabase, senderId, 'letter');

      // 4. Return the letter (with presigned URL if image)
      let responseLetter = { ...letter };
      if (letter.image_url) {
        try {
          const url = await getPresignedUrl(supabase, letter.image_url);
          responseLetter.image_url = url;
        } catch {
          // Keep path if presigned fails
        }
      }

      res.status(201).json(responseLetter);
    } catch (error) {
      logger.error('POST /api/letters error', { error });
      next(error);
    }
  }
);

export default router;
