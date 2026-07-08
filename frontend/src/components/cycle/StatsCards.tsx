interface StatsCardsProps {
  nextPeriodStart: string | null;
  ovulationDay: string | null;
  fertileWindowStart: string | null;
  fertileWindowEnd: string | null;
  averageCycleLength: number;
}

export function StatsCards({
  nextPeriodStart,
  ovulationDay,
  fertileWindowStart,
  fertileWindowEnd,
  averageCycleLength,
}: StatsCardsProps) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div className="bg-neutral-900/50 rounded-xl p-3 text-center border border-neutral-800/50">
        <p className="text-xs text-neutral-500">Next Period</p>
        <p className="text-sm text-white font-medium">{nextPeriodStart ? formatDate(nextPeriodStart) : '—'}</p>
      </div>
      <div className="bg-neutral-900/50 rounded-xl p-3 text-center border border-neutral-800/50">
        <p className="text-xs text-neutral-500">Ovulation</p>
        <p className="text-sm text-white font-medium">{ovulationDay ? formatDate(ovulationDay) : '—'}</p>
      </div>
      <div className="bg-neutral-900/50 rounded-xl p-3 text-center border border-neutral-800/50">
        <p className="text-xs text-neutral-500">Fertile Window</p>
        <p className="text-sm text-white font-medium">
          {fertileWindowStart && fertileWindowEnd
            ? `${formatDate(fertileWindowStart)} – ${formatDate(fertileWindowEnd)}`
            : '—'}
        </p>
      </div>
      <div className="bg-neutral-900/50 rounded-xl p-3 text-center border border-neutral-800/50">
        <p className="text-xs text-neutral-500">Avg Cycle</p>
        <p className="text-sm text-white font-medium">{averageCycleLength} days</p>
      </div>
    </div>
  );
}
