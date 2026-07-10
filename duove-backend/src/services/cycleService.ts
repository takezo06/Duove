import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../config/logger';

export interface CycleLog {
  id: string;
  start_date: string;
  end_date: string | null;
  is_manual_override?: boolean;
}

export interface SymptomLog {
  id?: string;
  log_date: string;
  bleeding_intensity: string | null;
  physical_symptoms: string[];
  moods: string[];
  discharge: string | null;
  sex_drive: string | null;
  sexual_activity: string[];
  lifestyle: {
    sleep_hours?: number;
    water_ml?: number;
    steps?: number;
    alcohol?: boolean;
    stress?: 'low' | 'medium' | 'high';
  };
}

export class CycleEngine {
  private cycles: CycleLog[] = [];

  constructor(cycles: CycleLog[]) {
    // Only use cycles that have started (start_date <= today)
    const today = new Date().toISOString().split('T')[0];
    this.cycles = cycles
      .filter(c => c.start_date <= today)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }

  // NEW: Average cycle length calculated from intervals between consecutive start dates
  private getAverageCycleLength(): number {
    const starts = this.cycles.map(c => c.start_date).sort();
    if (starts.length < 2) return 28; // default if not enough data

    const intervals: number[] = [];
    for (let i = 1; i < starts.length; i++) {
      const prev = new Date(starts[i - 1]);
      const curr = new Date(starts[i]);
      const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      // Include only realistic cycle lengths (15–50 days)
      if (diff >= 15 && diff <= 50) intervals.push(diff);
    }

    if (intervals.length === 0) return 28;
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return Math.round(avg);
  }

  // Average number of bleeding days per cycle
  private getAverageBleedingDays(): number {
    const valid = this.cycles
      .filter(c => c.end_date !== null)
      .map(c => {
        const start = new Date(c.start_date);
        const end = new Date(c.end_date!);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return diff;
      })
      .filter(d => d >= 1 && d <= 10);
    if (valid.length === 0) return 5;
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    return Math.round(avg);
  }

  // The most recent cycle start date
  private getLastCycleStart(): Date | null {
    if (this.cycles.length === 0) return null;
    return new Date(this.cycles[this.cycles.length - 1].start_date);
  }

  // Predict next period start by adding average cycle length to last start
  public predictNextPeriod(): Date | null {
    const lastStart = this.getLastCycleStart();
    if (!lastStart) return null;
    const avg = this.getAverageCycleLength();
    const next = new Date(lastStart);
    next.setDate(next.getDate() + avg);
    return next;
  }

  // Predict next period end = predicted start + average bleeding days - 1
  public predictNextPeriodEnd(): Date | null {
    const nextStart = this.predictNextPeriod();
    if (!nextStart) return null;
    const avgBleed = this.getAverageBleedingDays();
    const end = new Date(nextStart);
    end.setDate(end.getDate() + avgBleed - 1);
    return end;
  }

  // Ovulation day = (last start + average cycle length) - 14 days
  public getOvulationDay(): Date | null {
    const lastStart = this.getLastCycleStart();
    if (!lastStart) return null;
    const avg = this.getAverageCycleLength();
    const ovu = new Date(lastStart);
    ovu.setDate(ovu.getDate() + avg - 14);
    return ovu;
  }

  // Fertile window = ovulation day - 5 days to ovulation day
  public getFertileWindow(): { start: Date | null; end: Date | null } {
    const ovu = this.getOvulationDay();
    if (!ovu) return { start: null, end: null };
    const start = new Date(ovu);
    start.setDate(start.getDate() - 5);
    return { start, end: ovu };
  }

  // Current cycle day = days since last period start + 1
  public getCurrentCycleDay(): number {
    const lastStart = this.getLastCycleStart();
    if (!lastStart) return 1;
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24));
    return diff + 1;
  }

  // NEW: Corrected phase logic – handles overdue cycles as 'menstrual'
  public getCurrentPhase(): 'menstrual' | 'follicular' | 'fertile' | 'luteal' {
    const day = this.getCurrentCycleDay();
    const avgCycle = this.getAverageCycleLength();
    const bleeds = this.getAverageBleedingDays();
    const ovuDay = avgCycle - 14;
    const fertileStart = ovuDay - 5;
    const fertileEnd = ovuDay;

    // If cycle is overdue (> avgCycle), treat as menstrual (new cycle starting)
    if (day > avgCycle) return 'menstrual';

    if (day <= bleeds) return 'menstrual';
    if (day >= fertileStart && day <= fertileEnd) return 'fertile';
    if (day > fertileEnd && day < avgCycle) return 'luteal';
    return 'follicular';
  }

  // Build prediction object used by the frontend
  public getPrediction(): any {
    const nextStart = this.predictNextPeriod();
    const nextEnd = this.predictNextPeriodEnd();
    const ovu = this.getOvulationDay();
    const fertile = this.getFertileWindow();
    const day = this.getCurrentCycleDay();
    const phase = this.getCurrentPhase();
    const avgCycle = this.getAverageCycleLength();
    const avgBleed = this.getAverageBleedingDays();

    let daysUntilPeriod = null;
    if (nextStart) {
      const now = new Date();
      daysUntilPeriod = Math.ceil((nextStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilPeriod < 0) daysUntilPeriod = 0;
    }

    return {
      nextPeriodStart: nextStart ? nextStart.toISOString().split('T')[0] : null,
      nextPeriodEnd: nextEnd ? nextEnd.toISOString().split('T')[0] : null,
      ovulationDay: ovu ? ovu.toISOString().split('T')[0] : null,
      fertileWindowStart: fertile.start ? fertile.start.toISOString().split('T')[0] : null,
      fertileWindowEnd: fertile.end ? fertile.end.toISOString().split('T')[0] : null,
      cycleDay: day,
      daysUntilPeriod,
      phase,
      averageCycleLength: avgCycle,
      averageBleedingDays: avgBleed,
    };
  }
}

// --- Data access functions (unchanged) ---
export async function getCycleLogs(supabase: SupabaseClient, userId: string): Promise<CycleLog[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('cycle_logs')
    .select('*')
    .eq('user_id', userId)
    .lte('start_date', today)
    .order('start_date', { ascending: true });
  if (error) {
    logger.error('Error fetching cycle logs', { userId, error });
    throw new Error('Failed to fetch cycle logs');
  }
  return data || [];
}

export async function getLatestCycle(supabase: SupabaseClient, userId: string): Promise<CycleLog | null> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('cycle_logs')
    .select('*')
    .eq('user_id', userId)
    .lte('start_date', today)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    logger.error('Error fetching latest cycle', { userId, error });
    throw new Error('Failed to fetch latest cycle');
  }
  return data || null;
}

export async function getSymptomLogs(
  supabase: SupabaseClient,
  userId: string,
  fromDate?: string,
  toDate?: string
): Promise<SymptomLog[]> {
  let query = supabase
    .from('daily_symptom_logs')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false });
  if (fromDate) query = query.gte('log_date', fromDate);
  if (toDate) query = query.lte('log_date', toDate);
  const { data, error } = await query;
  if (error) {
    logger.error('Error fetching symptom logs', { userId, error });
    throw new Error('Failed to fetch symptom logs');
  }
  return data || [];
}

export async function logCycle(
  supabase: SupabaseClient,
  userId: string,
  relationshipId: string,
  startDate: string,
  endDate?: string,
  isManualOverride: boolean = false
) {
  // Upsert: if a cycle with this user+start already exists, update it; else insert.
  const { data, error } = await supabase
    .from('cycle_logs')
    .upsert(
      {
        user_id: userId,
        relationship_id: relationshipId,
        start_date: startDate,
        end_date: endDate || null,
        is_manual_override: isManualOverride,
      },
      {
        onConflict: 'user_id, start_date',   // assumes a unique constraint on these columns
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) {
    logger.error('Error logging cycle', { userId, error });
    throw new Error(`Failed to log cycle: ${error.message}`);
  }
  return data;
}

export async function logSymptoms(
  supabase: SupabaseClient,
  userId: string,
  relationshipId: string,
  logDate: string,
  data: Partial<SymptomLog>
) {
  const payload = {
    user_id: userId,
    relationship_id: relationshipId,
    log_date: logDate,
    ...data,
  };
  const { data: existing, error: fetchError } = await supabase
    .from('daily_symptom_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('log_date', logDate)
    .maybeSingle();

  let result;
  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('daily_symptom_logs')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    result = updated;
    if (updateError) throw updateError;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('daily_symptom_logs')
      .insert(payload)
      .select()
      .single();
    result = inserted;
    if (insertError) throw insertError;
  }
  return result;
}

export async function predictNextCycle(supabase: SupabaseClient, userId: string): Promise<any> {
  const cycles = await getCycleLogs(supabase, userId);
  const engine = new CycleEngine(cycles);
  return engine.getPrediction();
}
