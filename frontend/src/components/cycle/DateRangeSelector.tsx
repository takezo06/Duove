import { RangeOption } from '../../hooks/useCycleData';
import { Filter } from 'lucide-react';

interface DateRangeSelectorProps {
  range: RangeOption;
  setRange: (range: RangeOption) => void;
  showCustom: boolean;
  setShowCustom: (show: boolean) => void;
  customStart: string;
  setCustomStart: (val: string) => void;
  customEnd: string;
  setCustomEnd: (val: string) => void;
  applyCustomRange: () => void;
}

export function DateRangeSelector({
  range,
  setRange,
  showCustom,
  setShowCustom,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  applyCustomRange,
}: DateRangeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex items-center gap-1 bg-neutral-800/50 rounded-xl p-1 border border-neutral-700/50">
        <button
          onClick={() => setRange('7days')}
          className={`px-3 py-1.5 text-xs rounded-lg transition ${range === '7days' ? 'bg-rose-500/20 text-rose-400' : 'text-neutral-400 hover:text-white'}`}
        >
          7 Days
        </button>
        <button
          onClick={() => setRange('1month')}
          className={`px-3 py-1.5 text-xs rounded-lg transition ${range === '1month' ? 'bg-rose-500/20 text-rose-400' : 'text-neutral-400 hover:text-white'}`}
        >
          1 Month
        </button>
        <button
          onClick={() => setRange('6months')}
          className={`px-3 py-1.5 text-xs rounded-lg transition ${range === '6months' ? 'bg-rose-500/20 text-rose-400' : 'text-neutral-400 hover:text-white'}`}
        >
          6 Months
        </button>
        <button
          onClick={() => {
            setShowCustom(!showCustom);
            if (!showCustom) setRange('custom');
          }}
          className={`px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1 ${range === 'custom' ? 'bg-rose-500/20 text-rose-400' : 'text-neutral-400 hover:text-white'}`}
        >
          <Filter className="w-3 h-3" />
          Custom
        </button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="bg-neutral-800/50 text-sm text-white px-3 py-1.5 rounded-lg border border-neutral-700 focus:ring-1 focus:ring-rose-400"
          />
          <span className="text-neutral-500 text-xs">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="bg-neutral-800/50 text-sm text-white px-3 py-1.5 rounded-lg border border-neutral-700 focus:ring-1 focus:ring-rose-400"
          />
          <button
            onClick={applyCustomRange}
            className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs rounded-lg transition"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
