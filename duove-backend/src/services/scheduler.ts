import cron from 'node-cron';
import { logger } from '../config/logger';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';

// Create an admin client for scheduled jobs (use service role key for internal tasks)
const supabaseAdmin = createClient(
  config.supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Assign a new weekly prompt every Monday at 00:00 UTC.
 * (Currently placeholder – you'll need to seed prompts manually or from a list.)
 */
async function assignWeeklyPrompt() {
  try {
    // Get next Monday's date
    const now = new Date();
    const daysUntilMonday = (1 - now.getUTCDay() + 7) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    const assignedDate = nextMonday.toISOString().split('T')[0];

    // Check if a prompt is already assigned for that date
    const { data: existing } = await supabaseAdmin
      .from('qa_prompts')
      .select('id')
      .eq('assigned_date', assignedDate)
      .maybeSingle();

    if (existing) {
      logger.debug('Prompt already assigned for', { assignedDate });
      return;
    }

    // For now, we use a placeholder – in production, you'd fetch from a curated list
    // or generate via AI. Let's hardcode an example prompt.
    const samplePrompts = [
      { text: "What's one thing your partner did this week that made you feel loved?", category: 'relationship' },
      { text: "What's a dream you've been thinking about lately?", category: 'relationship' },
      { text: "What's a challenge you're facing right now, and how can your partner support you?", category: 'relationship' },
      { text: "What's a memory that makes you smile when you think of your partner?", category: 'relationship' },
      { text: "What's something new you'd like to try together?", category: 'relationship' },
    ];

    // Pick a random prompt (you could rotate or use AI later)
    const randomIndex = Math.floor(Math.random() * samplePrompts.length);
    const prompt = samplePrompts[randomIndex];

    const { error } = await supabaseAdmin
      .from('qa_prompts')
      .insert({
        text: prompt.text,
        category: prompt.category,
        assigned_date: assignedDate,
      });

    if (error) {
      logger.error('Failed to assign weekly prompt', { error });
    } else {
      logger.info('Weekly prompt assigned for', { assignedDate, text: prompt.text });
    }
  } catch (error) {
    logger.error('Error in assignWeeklyPrompt', { error });
  }
}

/**
 * Check for answers that should be revealed (24h after both answered).
 * Runs every hour.
 */
async function revealPendingAnswers() {
  try {
    // Get all answers where:
    // - both partners have answered
    // - revealed_at is null
    // - submitted_at is older than 24 hours
    const { data: pendingAnswers, error } = await supabaseAdmin
      .from('qa_answers')
      .select(`
        id,
        prompt_id,
        relationship_id,
        user_id,
        submitted_at
      `)
      .is('revealed_at', null)
      .lt('submitted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      logger.error('Error fetching pending reveals', { error });
      return;
    }

    // Group by prompt_id + relationship_id
    const groups: Record<string, { promptId: string; relationshipId: string; userIds: string[] }> = {};
    for (const answer of pendingAnswers || []) {
      const key = `${answer.prompt_id}-${answer.relationship_id}`;
      if (!groups[key]) {
        groups[key] = {
          promptId: answer.prompt_id,
          relationshipId: answer.relationship_id,
          userIds: [],
        };
      }
      groups[key].userIds.push(answer.user_id);
    }

    // For each group, check if both partners have answered
    for (const [key, group] of Object.entries(groups)) {
      const { promptId, relationshipId, userIds } = group;
      if (userIds.length >= 2) {
        // Both have answered – reveal!
        const { error: revealError } = await supabaseAdmin
          .from('qa_answers')
          .update({ revealed_at: new Date().toISOString() })
          .eq('prompt_id', promptId)
          .eq('relationship_id', relationshipId);

        if (revealError) {
          logger.error('Error revealing answers', { promptId, relationshipId, error: revealError });
        } else {
          logger.info('Answers revealed for', { promptId, relationshipId });
        }
      }
    }
  } catch (error) {
    logger.error('Error in revealPendingAnswers', { error });
  }
}

/**
 * Starts all schedulers.
 */
export function startScheduler(): void {
  // Daily reminder (already existing)
  cron.schedule('0 8 * * *', () => {
    const message = '🌅 Daily reminder: Take a moment to connect with your partner today!';
    logger.info(message);
    console.log(message);
  });

  // Assign weekly prompt every Monday at 00:00 UTC
  cron.schedule('0 0 * * 1', () => {
    assignWeeklyPrompt();
  });

  // Reveal pending answers every hour
  cron.schedule('0 * * * *', () => {
    revealPendingAnswers();
  });

  logger.info('All schedulers started');
}
