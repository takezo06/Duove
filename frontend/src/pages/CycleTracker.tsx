import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCycleData } from '../hooks/useCycleData';
import { CycleCircle } from '../components/cycle/CycleCircle';
import { CalendarGrid } from '../components/cycle/CalendarGrid';
import { DateRangeSelector } from '../components/cycle/DateRangeSelector';
import { StatsCards } from '../components/cycle/StatsCards';
import { useDailyTip } from '../hooks/useDailyTip';
import { CycleHeader } from '../components/cycle/CycleHeader';
import { CyclePopup } from '../components/cycle/CyclePopup';
import { CycleSkeleton } from '../components/cycle/CycleSkeleton';
import { phaseColors } from '../components/cycle/constants';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { Sparkles } from 'lucide-react';

export function CycleTracker() {
  const {
    loading,
    prediction,
    calendar,
    symptomLogs,
    lastPeriodStart,
    viewingPartner,
    partnerName,
    range,
    setRange,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    fetchData,
    togglePartnerView,
    earliestCycleStart,
  } = useCycleData();

  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [stickyDate, setStickyDate] = useState<string | null>(null);
  const [popupSymptom, setPopupSymptom] = useState<any | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [popupPosition, setPopupPosition] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
  } | null>(null);

  const popupRef = useRef<HTMLDivElement>(null);
  const todayStr = new Date().toISOString().split('T')[0];
  const activeDate = stickyDate || hoveredDate;

  // Refresh if we just logged a new cycle
  useEffect(() => {
    const refreshFlag = localStorage.getItem('cycle-refresh');
    if (refreshFlag) {
      fetchData(range);
      localStorage.removeItem('cycle-refresh');
    }
  }, []);

  // Fetch symptom for a date – local then API
  const fetchSymptomForDate = async (date: string): Promise<any> => {
    let symptom = symptomLogs.find((s) => s.log_date === date);
    if (symptom) return symptom;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return null;
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/cycles/symptoms?from=${date}&to=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data[0] || null;
    } catch (err) {
      console.error('Failed to fetch symptom for popup', err);
      return null;
    }
  };

  const handleDayHover = async (date: string | null, element: HTMLElement | null) => {
    if (stickyDate) return;
    if (date && element) {
      setHoveredDate(date);
      setTargetElement(element);
      const symptom = await fetchSymptomForDate(date);
      setPopupSymptom(symptom || null);
    } else {
      setHoveredDate(null);
      setTargetElement(null);
      setPopupSymptom(null);
      setPopupPosition(null);
    }
  };

  const handleDayClick = async (date: string, element: HTMLElement) => {
    if (stickyDate === date) {
      setStickyDate(null);
      setHoveredDate(null);
      setTargetElement(null);
      setPopupSymptom(null);
      setPopupPosition(null);
    } else {
      setStickyDate(date);
      setHoveredDate(null);
      setTargetElement(element);
      const symptom = await fetchSymptomForDate(date);
      setPopupSymptom(symptom || null);
    }
  };

  // Popup position logic
  useEffect(() => {
    if (!targetElement) {
      setPopupPosition(null);
      return;
    }
    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect();
      const popupWidth = 288;
      const popupHeight = popupRef.current ? popupRef.current.offsetHeight : 150;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      let placement: 'top' | 'bottom' = spaceAbove >= popupHeight || spaceAbove > spaceBelow ? 'top' : 'bottom';
      let top = 0;
      if (placement === 'top') {
        top = rect.top - popupHeight;
        if (top < 8 && spaceBelow >= popupHeight) {
          placement = 'bottom';
          top = rect.bottom;
        }
      } else {
        top = rect.bottom;
        if (top + popupHeight > viewportHeight - 8 && spaceAbove >= popupHeight) {
          placement = 'top';
          top = rect.top - popupHeight;
        }
      }
      let clampedTop = Math.max(8, Math.min(top, viewportHeight - popupHeight - 8));
      if (clampedTop + popupHeight > rect.top && clampedTop < rect.bottom) {
        clampedTop = placement === 'top' ? rect.top - popupHeight : rect.bottom;
      }
      const left = rect.left + rect.width / 2 - popupWidth / 2;
      const clampedLeft = Math.max(8, Math.min(left, viewportWidth - popupWidth - 8));
      setPopupPosition({ top: clampedTop, left: clampedLeft, placement });
    };
    updatePosition();
    const frameId = requestAnimationFrame(updatePosition);
    const timerId = setTimeout(updatePosition, 32);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timerId);
    };
  }, [targetElement, popupSymptom]);

  // Outside click closes sticky popup
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!stickyDate) return;
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setStickyDate(null);
        setHoveredDate(null);
        setTargetElement(null);
        setPopupSymptom(null);
        setPopupPosition(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [stickyDate]);

  // Apply custom range
  const applyCustomRange = () => {
    if (customStart && customEnd) {
      fetchData('custom', customStart, customEnd);
    }
  };

  // Tip
  const currentPhase = prediction?.phase || null;
  const dbPhase = currentPhase === 'fertile' ? 'ovulatory' : currentPhase;
  const { tip: dailyTip, loading: tipLoading } = useDailyTip(dbPhase, viewingPartner ? 'partner' : 'self');

  // Cycle day calculation for popup
  const getCycleDayForPopupDate = (dateStr: string): number | null => {
    if (!prediction?.averageCycleLength) return null;
    const avgCycle = prediction.averageCycleLength;
    let referenceStart = lastPeriodStart;
    if (!referenceStart && prediction.cycleDay) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const estStart = new Date(now.getTime() - (prediction.cycleDay - 1) * 86400000);
      referenceStart = estStart.toISOString().split('T')[0];
    }
    if (!referenceStart) return null;
    const start = new Date(referenceStart);
    start.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((date.getTime() - start.getTime()) / 86400000);
    let cycleDay = (diffDays % avgCycle) + 1;
    if (cycleDay <= 0) cycleDay += avgCycle;
    return cycleDay;
  };

  const getPhaseKey = (cycleDay: number | null): keyof typeof phaseColors | null => {
    if (!cycleDay || !prediction) return null;
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

  const activeCycleDay = activeDate ? getCycleDayForPopupDate(activeDate) : null;
  const activePhaseKey = getPhaseKey(activeCycleDay);

  // ---- RENDER ----
  if (loading) return <CycleSkeleton />;

  if (!prediction || !prediction.nextPeriodStart) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
          <h2 className="text-2xl font-semibold text-white mb-2">
            {viewingPartner ? `${partnerName || 'Partner'} has no cycle data yet` : 'No cycle data yet'}
          </h2>
          <p className="text-neutral-400">
            {viewingPartner
              ? 'Ask them to start tracking their cycle.'
              : 'Start tracking by logging your first cycle.'}
          </p>
          {!viewingPartner && (
            <Link
              to="/cycle/log"
              className="mt-4 inline-block px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition"
            >
              Log your first cycle
            </Link>
          )}
        </div>
      </div>
    );
  }

  const { phase, cycleDay, nextPeriodStart, ovulationDay, fertileWindowStart, fertileWindowEnd, daysUntilPeriod, averageCycleLength } = prediction;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 relative">
      <CyclePopup
        ref={popupRef}
        activeDate={activeDate!}
        activeCycleDay={activeCycleDay}
        activePhaseKey={activePhaseKey}
        popupPosition={popupPosition}
        popupSymptom={popupSymptom}
        stickyDate={stickyDate}
      />

      <CycleHeader
        viewingPartner={viewingPartner}
        partnerName={partnerName}
        togglePartnerView={togglePartnerView}
      />

      <CycleCircle phase={phase} cycleDay={cycleDay} daysUntilPeriod={daysUntilPeriod} />

      <StatsCards
        nextPeriodStart={nextPeriodStart}
        ovulationDay={ovulationDay}
        fertileWindowStart={fertileWindowStart}
        fertileWindowEnd={fertileWindowEnd}
        averageCycleLength={averageCycleLength}
      />

      {!viewingPartner && (
        <DateRangeSelector
          range={range}
          setRange={setRange}
          showCustom={range === 'custom'}
          setShowCustom={() => {}}
          customStart={customStart}
          setCustomStart={setCustomStart}
          customEnd={customEnd}
          setCustomEnd={setCustomEnd}
          applyCustomRange={applyCustomRange}
        />
      )}

      <CalendarGrid
        calendar={calendar}
        range={range}
        symptomLogs={symptomLogs}
        lastPeriodStart={lastPeriodStart}
        prediction={prediction}
        onDayHover={handleDayHover}
        onDayClick={handleDayClick}
        todayStr={todayStr}
        earliestCycleStart={earliestCycleStart}
      />

      <div className="bg-neutral-800/30 rounded-xl p-3 border border-neutral-700/50 mt-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <p className="text-xs font-medium text-white">
            {viewingPartner
              ? `Supporting ${partnerName || 'your partner'} during her ${phase} phase`
              : `Tip for your ${phase} phase`}
          </p>
        </div>
        {tipLoading ? (
          <p className="text-xs text-neutral-400 mt-2 animate-pulse">Loading tip...</p>
        ) : (
          <p className="text-xs text-neutral-400 mt-2">{dailyTip || 'Listen to your body today.'}</p>
        )}
      </div>
    </div>
  );
}
