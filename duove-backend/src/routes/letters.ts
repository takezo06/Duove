import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { authMiddleware } from '../middleware/auth';
import { createUserClient } from '../config/supabase';
import { createServiceClient } from '../config/supabaseAdmin';

const router = Router();
router.use(authMiddleware);

// ---- Spotify song search ----
router.get('/search-song', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });

    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(
            process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
          ).toString('base64'),
        },
      }
    );

    const spotifyToken = tokenRes.data.access_token;

    const searchRes = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${spotifyToken}` },
      params: { q, type: 'track', limit: 10 },
    });

    const tracks = searchRes.data.tracks.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      artist: item.artists.map((a: any) => a.name).join(', '),
      albumArt: item.album.images[0]?.url || '',
    }));

    res.json(tracks);
  } catch (err) {
    next(err);
  }
});

// ---- POST / – send a love letter ----
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    const { data: rel } = await supabase
      .from('relationships')
      .select('id, user_id, partner_id')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (!rel) return res.status(404).json({ error: 'No active relationship' });

    const partnerId = rel.user_id === userId ? rel.partner_id : rel.user_id;

    const {
      heading,
      message,
      recipient_name,
      sender_name,
      spotifyTrackId,
      spotifyTrackName,
      spotifyArtistName,
      spotifyAlbumArt,
    } = req.body;

    // Recipient name fallback
    let finalRecipientName = recipient_name;
    if (!finalRecipientName) {
      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', partnerId)
        .single();
      finalRecipientName = partnerProfile?.display_name || 'My love';
    }

    // Sender name fallback
    let finalSenderName = sender_name;
    if (!finalSenderName) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single();
      finalSenderName = userProfile?.display_name || 'Me';
    }

    const { data, error } = await supabase
      .from('love_letters')
      .insert({
        relationship_id: rel.id,
        sender_id: userId,
        heading: heading || 'Untitled',
        message,
        recipient_name: finalRecipientName,
        sender_name: finalSenderName,
        spotify_track_id: spotifyTrackId || null,
        spotify_track_name: spotifyTrackName || null,
        spotify_artist_name: spotifyArtistName || null,
        spotify_album_art: spotifyAlbumArt || null,
      })
      .select()
      .single();

    if (error) throw error;

    // ---- Notify the partner (non-blocking) ----
    try {
      const supabaseAdmin = createServiceClient();
      const { error: notifError } = await supabaseAdmin.from('notifications').insert({
        user_id: partnerId,
        type: 'love_letter',
        title: `${finalSenderName} sent you a love letter`,
        message: heading || 'You have a new love letter!',
        data: { letter_id: data.id },
        read: false,
        created_at: new Date().toISOString(),
      });

      if (notifError) {
        console.error('Notification insert error:', notifError);
      } else {
        console.log('Notification sent to partner:', partnerId);
      }
    } catch (notifErr) {
      console.error('Failed to create notification:', notifErr);
      // Do NOT fail the whole request – the letter is already saved
    }

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// GET / – retrieve letters (both partners), optionally single by id
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    const { data: rel } = await supabase
      .from('relationships')
      .select('id, user_id, partner_id')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (!rel) return res.json([]);

    // If an ID is provided, return just that letter (if it belongs to the relationship)
    const letterId = req.query.id as string | undefined;
    if (letterId) {
      const { data, error } = await supabase
        .from('love_letters')
        .select('*')
        .eq('id', letterId)
        .eq('relationship_id', rel.id)
        .single();

      if (error) return res.json([]);
      // Enrich with sender/recipient names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', [rel.user_id, rel.partner_id]);

      const enriched = {
        ...data,
        sender_name: data.sender_name || profiles?.find(p => p.id === data.sender_id)?.display_name || 'Unknown',
        recipient_name: data.recipient_name || profiles?.find(p => p.id === (data.sender_id === rel.user_id ? rel.partner_id : rel.user_id))?.display_name || 'Unknown',
      };
      return res.json([enriched]); // return as array for consistency
    }

    // Otherwise, fetch limited list
    const limit = parseInt(req.query.limit as string) || 20;
    const { data, error } = await supabase
      .from('love_letters')
      .select('*')
      .eq('relationship_id', rel.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', [rel.user_id, rel.partner_id]);

    const enriched = data.map((letter: any) => {
      const sender = profiles?.find((p: any) => p.id === letter.sender_id);
      const recipientId = letter.sender_id === rel.user_id ? rel.partner_id : rel.user_id;
      const recipient = profiles?.find((p: any) => p.id === recipientId);
      return {
        ...letter,
        sender_name: letter.sender_name || sender?.display_name || 'Unknown',
        recipient_name: letter.recipient_name || recipient?.display_name || 'Unknown',
      };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

export default router;
