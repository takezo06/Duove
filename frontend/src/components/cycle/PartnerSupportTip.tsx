import { Heart, Users } from 'lucide-react';

interface PartnerSupportTipProps {
  phase: 'menstrual' | 'follicular' | 'fertile' | 'luteal';
  partnerName: string | null;
}

export function PartnerSupportTip({ phase, partnerName }: PartnerSupportTipProps) {
  const tips = {
    menstrual: 'They may need extra comfort and patience right now.',
    fertile: 'This is their fertile window – intimacy might be on their mind.',
    luteal: 'They might feel tired or emotional – offer reassurance.',
    follicular: 'Energy levels are rising – plan something fun together!',
  };

  return (
    <div className="bg-rose-400/10 border border-rose-400/20 rounded-xl p-4 mb-6">
      <h3 className="text-rose-400 font-medium flex items-center gap-2">
        <Heart className="w-4 h-4" />
        Supporting {partnerName || 'your partner'}
      </h3>
      <p className="text-neutral-300 text-sm mt-1">{tips[phase] || tips.follicular}</p>
    </div>
  );
}
