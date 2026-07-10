import { Link } from 'react-router-dom';
import { Activity, Users, BarChart3, Plus } from 'lucide-react';

interface CycleHeaderProps {
  viewingPartner: boolean;
  partnerName: string | null;
  togglePartnerView: () => void;
}

export function CycleHeader({ viewingPartner, partnerName, togglePartnerView }: CycleHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-rose-400" />
          {viewingPartner ? `${partnerName || 'Partner'}'s Cycle` : 'Cycle Tracker'}
        </h1>
        <p className="text-sm text-neutral-400">
          {viewingPartner
            ? `Viewing ${partnerName || 'partner'}'s cycle insights`
            : 'Your menstrual cycle insights'}
        </p>
      </div>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={togglePartnerView}
          className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition ${
            viewingPartner
              ? 'bg-rose-500/20 text-rose-400 border border-rose-400/30'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
          }`}
        >
          <Users className="w-4 h-4" />
          {viewingPartner ? 'My View' : 'Partner View'}
        </button>
        {!viewingPartner && (
          <>
            <Link
              to="/cycle/analytics"
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm flex items-center gap-2 transition"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </Link>
            <Link
              to="/cycle/log"
              className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm flex items-center gap-2 transition shadow-lg shadow-rose-500/20"
            >
              <Plus className="w-4 h-4" />
              Log
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
