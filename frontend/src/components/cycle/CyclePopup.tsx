import { forwardRef } from 'react';
import { phaseColors } from './constants';
import { Droplet, Activity, Smile, Flame, Heart, Moon } from 'lucide-react';

interface CyclePopupProps {
  activeDate: string;
  activeCycleDay: number | null;
  activePhaseKey: keyof typeof phaseColors | null;
  popupPosition: { top: number; left: number; placement: 'top' | 'bottom' } | null;
  popupSymptom: any | null;
  stickyDate: string | null;
}

export const CyclePopup = forwardRef<HTMLDivElement, CyclePopupProps>(
  ({ activeDate, activeCycleDay, activePhaseKey, popupPosition, popupSymptom, stickyDate }, ref) => {
    if (!popupPosition) return null;

    const activePhaseColor = activePhaseKey ? phaseColors[activePhaseKey] : null;

    const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
      <div
        ref={ref}
        className="fixed z-50 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-4 w-72 transition-all duration-200"
        style={{
          top: popupPosition.top,
          left: popupPosition.left,
          maxHeight: '340px',
          overflowY: 'visible',
          pointerEvents: stickyDate ? 'auto' : 'none',
          marginTop: popupPosition.placement === 'bottom' ? '12px' : '-12px',
        }}
      >
        <div className="max-h-[308px] overflow-y-auto w-full h-full pr-1">
          {/* Arrow pointers */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-0 h-0 pointer-events-none z-30"
            style={{
              [popupPosition.placement === 'top' ? 'bottom' : 'top']: '-10px',
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              [popupPosition.placement === 'top' ? 'borderTop' : 'borderBottom']: '10px solid #404040',
            }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 w-0 h-0 pointer-events-none z-30"
            style={{
              [popupPosition.placement === 'top' ? 'bottom' : 'top']: '-8.5px',
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              [popupPosition.placement === 'top' ? 'borderTop' : 'borderBottom']: '10px solid #171717',
            }}
          />

          {/* Content */}
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-white font-medium">{formatDate(activeDate)}</span>
            {activeCycleDay && (
              <span className={`text-xs font-medium ${activePhaseColor?.text || 'text-neutral-400'}`}>
                Day {activeCycleDay}
              </span>
            )}
          </div>

          {popupSymptom ? (
            <div className="space-y-1 text-sm relative z-10">
              {popupSymptom.bleeding_intensity != null && popupSymptom.bleeding_intensity !== '' && (
                <div className="flex items-center gap-2 text-neutral-300">
                  <Droplet className="w-3.5 h-3.5 text-red-400" />
                  <span>Bleeding: {popupSymptom.bleeding_intensity}</span>
                </div>
              )}
              {popupSymptom.physical_symptoms?.length > 0 && (
                <div className="flex items-center gap-2 text-neutral-300">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <span>{popupSymptom.physical_symptoms.join(', ')}</span>
                </div>
              )}
              {popupSymptom.moods?.length > 0 && (
                <div className="flex items-center gap-2 text-neutral-300">
                  <Smile className="w-3.5 h-3.5 text-pink-400" />
                  <span>{popupSymptom.moods.join(', ')}</span>
                </div>
              )}
              {popupSymptom.discharge && (
                <div className="flex items-center gap-2 text-neutral-300">
                  <Flame className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Discharge: {popupSymptom.discharge}</span>
                </div>
              )}
              {popupSymptom.sex_drive && (
                <div className="flex items-center gap-2 text-neutral-300">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <span>Drive: {popupSymptom.sex_drive}</span>
                </div>
              )}
              {popupSymptom.sexual_activity?.length > 0 && (
                <div className="flex items-center gap-2 text-neutral-300">
                  <Heart className="w-3.5 h-3.5 text-purple-400 fill-purple-400/20" />
                  <span>Sex: {popupSymptom.sexual_activity.join(', ')}</span>
                </div>
              )}
              {popupSymptom.lifestyle?.sleep_hours && (
                <div className="flex items-center gap-2 text-neutral-300">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sleep: {popupSymptom.lifestyle.sleep_hours}h</span>
                </div>
              )}
              {popupSymptom.lifestyle?.stress && (
                <div className="text-neutral-300">Stress: {popupSymptom.lifestyle.stress}</div>
              )}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 relative z-10">No logs for this day</p>
          )}
        </div>
      </div>
    );
  }
);
