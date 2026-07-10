import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCycleData } from '../hooks/useCycleData';
import { CycleCircle } from '../components/cycle/CycleCircle';
import { CalendarGrid } from '../components/cycle/CalendarGrid';
import { DateRangeSelector } from '../components/cycle/DateRangeSelector';
import { StatsCards } from '../components/cycle/StatsCards';
import { useDailyTip } from '../hooks/useDailyTip';
import { phaseColors } from '../components/cycle/constants';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import {
  Loader2,
  Activity,
  Users,
  BarChart3,
  Plus,
  Sparkles,
  Smile,
  Flame,
  Heart,
  Moon,
  Droplet,
} from 'lucide-react';

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

  // Refresh if we just logged a new cycle (via localStorage flag)
  useEffect(() => {
    const refreshFlag = localStorage.getItem('cycle-refresh');
    if (refreshFlag) {
      fetchData(range);
      localStorage.removeItem('cycle-refresh');
    }
  }, []); // runs once on mount

  // Cycle day for popup
  const getCycleDayForPopupDate = (dateStr: string): number | null => {
    if (!prediction?.averageCycleLength) return null;
    const avgCycle = prediction.averageCycleLength;
    let referenceStart = lastPeriodStart;
    if (!referenceStart && prediction.cycleDay) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const estStart = new Date(
        now.getTime() - (prediction.cycleDay - 1) * 86400000
      );
      referenceStart = estStart.toISOString().split('T')[0];
    }
    if (!referenceStart) return null;
    const start = new Date(referenceStart);
    start.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (date.getTime() - start.getTime()) / 86400000
    );
    let cycleDay = (diffDays % avgCycle) + 1;
    if (cycleDay <= 0) cycleDay += avgCycle;
    return cycleDay;
  };

  const getPhaseKey = (
    cycleDay: number | null
  ): keyof typeof phaseColors | null => {
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

  const activeCycleDay = activeDate
    ? getCycleDayForPopupDate(activeDate)
    : null;
  const activePhaseKey = getPhaseKey(activeCycleDay);
  const activePhaseColor = activePhaseKey
    ? phaseColors[activePhaseKey]
    : null;

  // Fetch symptom for a date – first from local, then from API
  const fetchSymptomForDate = async (date: string): Promise<any> => {
    // 1. Check local logs
    let symptom = symptomLogs.find((s) => s.log_date === date);
    if (symptom) return symptom;

    // 2. Fetch from backend
    try {
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
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

  const handleDayHover = async (
    date: string | null,
    element: HTMLElement | null
  ) => {
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

  // Outside click closes sticky popup
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!stickyDate) return;
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setStickyDate(null);
        setHoveredDate(null);
        setTargetElement(null);
        setPopupSymptom(null);
        setPopupPosition(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () =>
      document.removeEventListener('mousedown', handleOutsideClick);
  }, [stickyDate]);

  // Position popup near target element
  useEffect(() => {
    if (!targetElement) {
      setPopupPosition(null);
      return;
    }
    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect();
      const popupWidth = 288;
      const popupHeight = popupRef.current
        ? popupRef.current.offsetHeight
        : 150;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      let placement: 'top' | 'bottom' =
        spaceAbove >= popupHeight || spaceAbove > spaceBelow
          ? 'top'
          : 'bottom';
      let top = 0;
      if (placement === 'top') {
        top = rect.top - popupHeight;
        if (top < 8 && spaceBelow >= popupHeight) {
          placement = 'bottom';
          top = rect.bottom;
        }
      } else {
        top = rect.bottom;
        if (
          top + popupHeight > viewportHeight - 8 &&
          spaceAbove >= popupHeight
        ) {
          placement = 'top';
          top = rect.top - popupHeight;
        }
      }
      let clampedTop = Math.max(
        8,
        Math.min(top, viewportHeight - popupHeight - 8)
      );
      if (
        clampedTop + popupHeight > rect.top &&
        clampedTop < rect.bottom
      ) {
        clampedTop =
          placement === 'top' ? rect.top - popupHeight : rect.bottom;
      }
      const left = rect.left + rect.width / 2 - popupWidth / 2;
      const clampedLeft = Math.max(
        8,
        Math.min(left, viewportWidth - popupWidth - 8)
      );
      setPopupPosition({
        top: clampedTop,
        left: clampedLeft,
        placement,
      });
    };
    updatePosition();
    const frameId = requestAnimationFrame(updatePosition);
    const timerId = setTimeout(updatePosition, 32);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timerId);
    };
  }, [targetElement, popupSymptom]);

  const currentPhase = prediction?.phase || null;
  const dbPhase = currentPhase === 'fertile' ? 'ovulatory' : currentPhase;
  const { tip: dailyTip, loading: tipLoading } = useDailyTip(
    dbPhase,
    viewingPartner ? 'partner' : 'self'
  );

  // Refresh when new cycle logged (backup event listener)
  useEffect(() => {
    const handler = () => fetchData(range);
    window.addEventListener('cycle-logged', handler);
    return () => window.removeEventListener('cycle-logged', handler);
  }, [range, fetchData]);

  // Apply custom date range
  const applyCustomRange = () => {
    if (customStart && customEnd) {
      fetchData('custom', customStart, customEnd);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  if (!prediction || !prediction.nextPeriodStart) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
          <h2 className="text-2xl font-semibold text-white mb-2">
            {viewingPartner
              ? `${partnerName || 'Partner'} has no cycle data yet`
              : 'No cycle data yet'}
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

  const {
    phase,
    cycleDay,
    nextPeriodStart,
    ovulationDay,
    fertileWindowStart,
    fertileWindowEnd,
    daysUntilPeriod,
    averageCycleLength,
  } = prediction;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 relative">
      {/* Popup */}
      {activeDate && popupPosition && targetElement && (
        <div
          ref={popupRef}
          className="fixed z-50 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-4 w-72 transition-all duration-200"
          style={{
            top: popupPosition.top,
            left: popupPosition.left,
            maxHeight: '340px',
            overflowY: 'visible',
            pointerEvents: stickyDate ? 'auto' : 'none',
            marginTop:
              popupPosition.placement === 'bottom' ? '12px' : '-12px',
          }}
        >
          <div className="max-h-[308px] overflow-y-auto w-full h-full pr-1">
            <div
              className="absolute left-1/2 -translate-x-1/2 w-0 h-0 pointer-events-none z-30"
              style={{
                [popupPosition.placement === 'top'
                  ? 'bottom'
                  : 'top']: '-10px',
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                [popupPosition.placement === 'top'
                  ? 'borderTop'
                  : 'borderBottom']: '10px solid #404040',
              }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 w-0 h-0 pointer-events-none z-30"
              style={{
                [popupPosition.placement === 'top'
                  ? 'bottom'
                  : 'top']: '-8.5px',
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                [popupPosition.placement === 'top'
                  ? 'borderTop'
                  : 'borderBottom']: '10px solid #171717',
              }}
            />

            <div className="flex items-center justify-between mb-2 relative z-10">
              <span className="text-white font-medium">
                {formatDate(activeDate)}
              </span>
              {activeCycleDay && (
                <span
                  className={`text-xs font-medium ${
                    activePhaseColor?.text || 'text-neutral-400'
                  }`}
                >
                  Day {activeCycleDay}
                </span>
              )}
            </div>

            {popupSymptom ? (
              <div className="space-y-1 text-sm relative z-10">
                {popupSymptom.bleeding_intensity != null &&
                  popupSymptom.bleeding_intensity !== '' && (
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Droplet className="w-3.5 h-3.5 text-red-400" />
                      <span>
                        Bleeding: {popupSymptom.bleeding_intensity}
                      </span>
                    </div>
                  )}
                {popupSymptom.physical_symptoms?.length > 0 && (
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      {popupSymptom.physical_symptoms.join(', ')}
                    </span>
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
                    <span>
                      Sex: {popupSymptom.sexual_activity.join(', ')}
                    </span>
                  </div>
                )}
                {popupSymptom.lifestyle?.sleep_hours && (
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      Sleep: {popupSymptom.lifestyle.sleep_hours}h
                    </span>
                  </div>
                )}
                {popupSymptom.lifestyle?.stress && (
                  <div className="text-neutral-300">
                    Stress: {popupSymptom.lifestyle.stress}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-500 relative z-10">
                No logs for this day
              </p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-rose-400" />
            {viewingPartner
              ? `${partnerName || 'Partner'}'s Cycle`
              : 'Cycle Tracker'}
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

      {/* Main Circle */}
      <CycleCircle
        phase={phase}
        cycleDay={cycleDay}
        daysUntilPeriod={daysUntilPeriod}
      />

      {/* Stats Cards */}
      <StatsCards
        nextPeriodStart={nextPeriodStart}
        ovulationDay={ovulationDay}
        fertileWindowStart={fertileWindowStart}
        fertileWindowEnd={fertileWindowEnd}
        averageCycleLength={averageCycleLength}
      />

      {/* Date Range Selector */}
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

      {/* Calendar Grid */}
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

      {/* Tip Box */}
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
          <p className="text-xs text-neutral-400 mt-2 animate-pulse">
            Loading tip...
          </p>
        ) : (
          <p className="text-xs text-neutral-400 mt-2">
            {dailyTip || 'Listen to your body today.'}
          </p>
        )}
      </div>
    </div>
  );
}
