import { Heart } from 'lucide-react';
import { phaseColors } from './constants';

interface CalendarDay {
  date: string;
  bleeding: boolean;
  symptoms: boolean;
}

interface CalendarGridProps {
  calendar: CalendarDay[];
  range: string;
  symptomLogs: any[];
  lastPeriodStart: string | null;
  earliestCycleStart: string | null;
  prediction: any;
  onDayHover: (date: string | null, element: HTMLElement | null) => void;
  onDayClick: (date: string, element: HTMLElement) => void;
  todayStr: string;
}

export function CalendarGrid({
  calendar,
  range,
  symptomLogs,
  lastPeriodStart,
  earliestCycleStart,
  prediction,
  onDayHover,
  onDayClick,
  todayStr,
}: CalendarGridProps) {
  // Compute cycle day for any date, but only if we have data and date is on/after the first known cycle
  const getCycleDayForDate = (dateStr: string): number | null => {
    // 1. Determine the earliest date we should show dots from
    const threshold = earliestCycleStart || lastPeriodStart;
    if (threshold && dateStr < threshold) return null;

    // 2. If we have no cycle data at all, don't compute anything
    if (!prediction?.averageCycleLength) return null;

    // 3. Find a reference start date
    let referenceStart = lastPeriodStart;
    if (!referenceStart && prediction.cycleDay) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const estimatedStart = new Date(now.getTime() - (prediction.cycleDay - 1) * 86400000);
      referenceStart = estimatedStart.toISOString().split('T')[0];
    }
    if (!referenceStart) return null;

    const start = new Date(referenceStart);
    start.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((date.getTime() - start.getTime()) / 86400000);
    let cycleDay = (diffDays % prediction.averageCycleLength) + 1;
    if (cycleDay <= 0) cycleDay += prediction.averageCycleLength;
    return cycleDay;
  };

  const getPhaseForDay = (cycleDay: number): keyof typeof phaseColors | null => {
    if (!prediction || cycleDay <= 0) return null;
    const avgCycle = prediction.averageCycleLength || 28;
    const bleeds = prediction.averageBleedingDays || 5;
    const ovuDay = avgCycle - 14;
    const fertileStart = ovuDay - 5;
    const fertileEnd = ovuDay;

    if (cycleDay <= bleeds) return 'menstrual';
    if (cycleDay >= fertileStart && cycleDay <= fertileEnd) return 'fertile';
    if (cycleDay > fertileEnd && cycleDay < avgCycle) return 'luteal';
    return 'follicular';
  };

  const getSymptomForDate = (dateStr: string) => {
    return symptomLogs.find((s) => s.log_date === dateStr);
  };

  const grouped: Record<string, CalendarDay[]> = {};
  for (const day of calendar) {
    const date = new Date(day.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(day);
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4 mb-6">
      <p className="text-xs text-neutral-500 mb-3">
        {calendar.length} days ({range === '7days' ? 'last 7 days' : range === '1month' ? 'last month' : range === '6months' ? 'last 6 months' : 'custom range'})
      </p>

      {Object.entries(grouped).map(([key, days]) => {
        const [year, month] = key.split('-');
        const monthName = monthNames[parseInt(month, 10) - 1];
        return (
          <div key={key} className="mb-4 last:mb-0">
            <div className="text-sm text-neutral-400 font-medium mb-2">{monthName} {year}</div>
            <div className="grid grid-cols-7 gap-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className="text-[10px] text-neutral-600 text-center">{d}</div>
              ))}
              {Array.from({ length: new Date(parseInt(year), parseInt(month) - 1, 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {days.map((day) => {
                const cycleDayNum = getCycleDayForDate(day.date);
                const phaseKey = cycleDayNum ? getPhaseForDay(cycleDayNum) : null;
                const phaseColor = phaseKey ? phaseColors[phaseKey] : null;
                const isToday = day.date === todayStr;
                const symptom = getSymptomForDate(day.date);
                const hasSex = symptom && symptom.sexual_activity && symptom.sexual_activity.length > 0;

                return (
                  <div key={day.date} className="flex flex-col items-center group">
                    <div className="relative flex items-center justify-center w-8 h-8">
                      <span
                        className={`text-xs transition cursor-pointer flex items-center justify-center rounded-full z-10 ${
                          isToday
                            ? `text-rose-400 font-bold border-2 ${phaseColor ? phaseColor.border : 'border-rose-400'} w-7 h-7`
                            : 'text-neutral-500 group-hover:text-white w-7 h-7 hover:bg-neutral-800/50'
                        }`}
                        onMouseEnter={(e) => onDayHover(day.date, e.currentTarget)}
                        onMouseLeave={() => onDayHover(null, null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDayClick(day.date, e.currentTarget);
                        }}
                      >
                        {new Date(day.date).getDate()}
                      </span>
                      {hasSex && (
                        <Heart className="absolute top-0 right-0 w-3 h-3 text-rose-500 fill-rose-500/30 pointer-events-none z-20 transform translate-x-0.5 -translate-y-0.5" />
                      )}
                    </div>
                    {cycleDayNum && phaseKey && phaseColor && (
                      <div className={`w-2 h-2 rounded-full mt-0.5 ${phaseColor.dot} shadow-sm`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
