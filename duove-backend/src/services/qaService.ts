import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../config/logger';

export interface QAPrompt {
  id: string;
  text: string;
  category: string;
  assigned_date: string;
  created_at: string;
}

export interface QAAnswer {
  id: string;
  prompt_id: string;
  relationship_id: string;
  user_id: string;
  partner_id: string;
  answer_text: string;
  image_url: string | null;
  submitted_at: string;
  revealed_at: string | null;
}

/**
 * Get the current active prompt for a given date.
 * If no prompt is assigned for today, returns null.
 */
export async function getCurrentPrompt(
  supabase: SupabaseClient,
  date: string
): Promise<QAPrompt | null> {
  const { data, error } = await supabase
    .from('qa_prompts')
    .select('*')
    .eq('assigned_date', date)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching current prompt', { date, error });
    throw new Error('Failed to fetch current prompt');
  }

  return data;
}

/**
 * Get the prompt for a specific week (by date).
 */
export async function getPromptByDate(
  supabase: SupabaseClient,
  date: string
): Promise<QAPrompt | null> {
  return getCurrentPrompt(supabase, date);
}

/**
 * Submit an answer to a prompt.
 */
export async function submitAnswer(
  supabase: SupabaseClient,
  promptId: string,
  relationshipId: string,
  userId: string,
  partnerId: string,
  answerText: string,
  imageUrl?: string | null
): Promise<QAAnswer> {
  const { data, error } = await supabase
    .from('qa_answers')
    .insert({
      prompt_id: promptId,
      relationship_id: relationshipId,
      user_id: userId,
      partner_id: partnerId,
      answer_text: answerText.trim(),
      image_url: imageUrl || null,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error('Error submitting answer', { promptId, userId, error });
    throw new Error('Failed to submit answer');
  }

  return data;
}

/**
 * Check if both partners have answered a prompt.
 */
export async function haveBothAnswered(
  supabase: SupabaseClient,
  promptId: string,
  relationshipId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('qa_answers')
    .select('user_id', { count: 'exact', head: false })
    .eq('prompt_id', promptId)
    .eq('relationship_id', relationshipId);

  if (error) {
    logger.error('Error checking answers', { promptId, relationshipId, error });
    throw new Error('Failed to check answers');
  }

  // Count unique users who have answered
  const uniqueUsers = new Set(data?.map((a) => a.user_id) || []);
  return uniqueUsers.size >= 2;
}

/**
 * Get answers for a prompt (with reveal logic).
 * - If both have answered AND revealed_at is set, return both answers.
 * - If not revealed, return null for both answers (or show "waiting").
 */
export async function getAnswersForPrompt(
  supabase: SupabaseClient,
  promptId: string,
  relationshipId: string,
  userId: string
): Promise<{
  prompt: QAPrompt;
  answers: QAAnswer[];
  bothAnswered: boolean;
  revealed: boolean;
  yourAnswer: QAAnswer | null;
  partnerAnswer: QAAnswer | null;
}> {
  // 1. Get the prompt
  const { data: prompt, error: promptError } = await supabase
    .from('qa_prompts')
    .select('*')
    .eq('id', promptId)
    .single();

  if (promptError || !prompt) {
    throw new Error('Prompt not found');
  }

  // 2. Get all answers for this prompt + relationship
  const { data: answers, error: answersError } = await supabase
    .from('qa_answers')
    .select('*')
    .eq('prompt_id', promptId)
    .eq('relationship_id', relationshipId);

  if (answersError) {
    logger.error('Error fetching answers', { promptId, relationshipId, error: answersError });
    throw new Error('Failed to fetch answers');
  }

  // 3. Check if both have answered
  const uniqueUsers = new Set(answers?.map((a) => a.user_id) || []);
  const bothAnswered = uniqueUsers.size >= 2;

  // 4. Check if answers are revealed (both answered AND revealed_at is set)
  const allRevealed = answers?.every((a) => a.revealed_at !== null) || false;
  const revealed = bothAnswered && allRevealed;

  // 5. Separate your answer vs partner's answer
  const yourAnswer = answers?.find((a) => a.user_id === userId) || null;
  const partnerAnswer = answers?.find((a) => a.user_id !== userId) || null;

  // 6. If not revealed, hide content
  if (!revealed) {
    if (yourAnswer) {
      // Your own answer is always visible to you
    }
    if (partnerAnswer) {
      // Hide partner's answer content
      partnerAnswer.answer_text = 'Waiting for reveal...';
      partnerAnswer.image_url = null;
    }
  }

  return {
    prompt,
    answers: answers || [],
    bothAnswered,
    revealed,
    yourAnswer,
    partnerAnswer,
  };
}

/**
 * Reveal answers (called by cron job 24h after both answered).
 */
export async function revealAnswers(
  supabase: SupabaseClient,
  promptId: string,
  relationshipId: string
): Promise<void> {
  const { error } = await supabase
    .from('qa_answers')
    .update({ revealed_at: new Date().toISOString() })
    .eq('prompt_id', promptId)
    .eq('relationship_id', relationshipId);

  if (error) {
    logger.error('Error revealing answers', { promptId, relationshipId, error });
    throw new Error('Failed to reveal answers');
  }

  logger.info('Answers revealed', { promptId, relationshipId });
}
