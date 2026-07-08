import { phaseColors } from './constants';

interface CycleCircleProps {
  phase: 'menstrual' | 'follicular' | 'fertile' | 'luteal';
  cycleDay: number;
  daysUntilPeriod: number | null;
}

export function CycleCircle({ phase, cycleDay, daysUntilPeriod }: CycleCircleProps) {
  const colors = phaseColors[phase] || phaseColors.follicular;

  return (
    <div className="flex justify-center mb-8">
      <div className="relative group">
        <div
          className={`w-56 h-56 rounded-full border-4 ${colors.border} shadow-2xl flex items-center justify-center flex-col transition-all duration-300 bg-neutral-800/50`}
        >
          <div className="text-center">
            <p className="text-4xl font-bold text-white">{cycleDay > 0 ? cycleDay : '-'}</p>
            <p className={`text-sm ${colors.text} font-medium`}>{cycleDay > 0 ? colors.label : 'Awaiting cycle'}</p>
            {phase === 'fertile' && (
              <p className="text-xs text-teal-300 mt-1 font-semibold">High chance</p>
            )}
            {phase === 'menstrual' && cycleDay > 0 && (
              <p className="text-xs text-red-300 mt-1">Day {cycleDay} of period</p>
            )}
            {daysUntilPeriod !== null && daysUntilPeriod >= 0 && (
              <p className="text-xs text-neutral-400 mt-2">
                {daysUntilPeriod === 0 ? 'Period due today' : `${daysUntilPeriod} days until period`}
              </p>
            )}
          </div>
        </div>
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none"
          style={{ background: colors.border }}
        />
      </div>
    </div>
  );
}
