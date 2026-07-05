import cron from 'node-cron';
import { logger } from '../config/logger';
import { createServiceClient } from '../config/supabaseAdmin';

/**
 * Assign a new weekly prompt every Monday at 00:00 UTC.
 */
async function assignWeeklyPrompt() {
  try {
    const supabaseAdmin = createServiceClient();
    const now = new Date();
    const daysUntilMonday = (1 - now.getUTCDay() + 7) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    const assignedDate = nextMonday.toISOString().split('T')[0];

    const { data: existing } = await supabaseAdmin
      .from('qa_prompts')
      .select('id')
      .eq('assigned_date', assignedDate)
      .maybeSingle();

    if (existing) {
      logger.debug('Prompt already assigned for', { assignedDate });
      return;
    }

    const samplePrompts = [
      { text: "What's one thing your partner did this week that made you feel loved?", category: 'relationship' },
      { text: "What's a dream you've been thinking about lately?", category: 'relationship' },
      { text: "What's a challenge you're facing right now, and how can your partner support you?", category: 'relationship' },
      { text: "What's a memory that makes you smile when you think of your partner?", category: 'relationship' },
      { text: "What's something new you'd like to try together?", category: 'relationship' },
    ];

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
 * Reveal answers 24h after both partners have answered.
 */
async function revealPendingAnswers() {
  try {
    const supabaseAdmin = createServiceClient();
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

    for (const [, group] of Object.entries(groups)) {
      if (group.userIds.length >= 2) {
        const { error: revealError } = await supabaseAdmin
          .from('qa_answers')
          .update({ revealed_at: new Date().toISOString() })
          .eq('prompt_id', group.promptId)
          .eq('relationship_id', group.relationshipId);

        if (revealError) {
          logger.error('Error revealing answers', { promptId: group.promptId, relationshipId: group.relationshipId, error: revealError });
        } else {
          logger.info('Answers revealed for', { promptId: group.promptId, relationshipId: group.relationshipId });
        }
      }
    }
  } catch (error) {
    logger.error('Error in revealPendingAnswers', { error });
  }
}

/**
 * Archive fulfilled cravings older than 24 hours.
 */
async function archiveFulfilledCravings() {
  try {
    const supabaseAdmin = createServiceClient();
    const { error } = await supabaseAdmin
      .from('cravings')
      .update({ archived_at: new Date().toISOString() })
      .eq('fulfilled', true)
      .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .is('archived_at', null);

    if (error) {
      logger.error('Error archiving fulfilled cravings', { error });
    } else {
      logger.info('Archived fulfilled cravings older than 24 hours');
    }
  } catch (error) {
    logger.error('Error in archiveFulfilledCravings', { error });
  }
}

/**
 * Starts all schedulers.
 */
export function startScheduler(): void {
  // Daily reminder
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

  // Archive fulfilled cravings every hour
  cron.schedule('0 * * * *', () => {
    archiveFulfilledCravings();
  });

  logger.info('All schedulers started');
}
