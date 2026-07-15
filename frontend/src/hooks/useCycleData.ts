import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import axios from 'axios';

export type RangeOption = '7days' | '1month' | '6months' | 'custom';

export function useCycleData() {
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<any>(null);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<any[]>([]);
  const [lastPeriodStart, setLastPeriodStart] = useState<string | null>(null);
  const [earliestCycleStart, setEarliestCycleStart] = useState<string | null>(null);
  const [viewingPartner, setViewingPartner] = useState(false);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [range, setRange] = useState<RangeOption>('1month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fetchData = useCallback(async (rangeOption: RangeOption, start?: string, end?: string) => {
    setLoading(true);
    setSymptomLogs([]);
    setCalendar([]);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setLoading(false);
        return;
      }

      // 1. Compute date range from the selected option
      let fromDate = '';
      let toDate = '';
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      if (rangeOption === '7days') {
        const from = new Date(now);
        from.setDate(now.getDate() - 7);
        fromDate = from.toISOString().split('T')[0];
        toDate = todayStr;
      } else if (rangeOption === '1month') {
        const from = new Date(now);
        from.setMonth(now.getMonth() - 1);
        fromDate = from.toISOString().split('T')[0];
        toDate = todayStr;
      } else if (rangeOption === '6months') {
        const from = new Date(now);
        from.setMonth(now.getMonth() - 6);
        fromDate = from.toISOString().split('T')[0];
        toDate = todayStr;
      } else if (rangeOption === 'custom' && start && end) {
        fromDate = start;
        toDate = end;
      }

      // 2. Fetch stats – pass from/to so the partner stats endpoint returns a filtered calendar
      const statsEndpoint = viewingPartner
        ? `${import.meta.env.VITE_BACKEND_URL}/api/cycles/partner/stats`
        : `${import.meta.env.VITE_BACKEND_URL}/api/cycles/stats`;

      const statsParams: any = {};
      if (fromDate) statsParams.from = fromDate;
      if (toDate) statsParams.to = toDate;

      const statsRes = await axios.get(statsEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
        params: statsParams,
      });
      const statsData = statsRes.data;
      setPrediction(statsData.prediction);
      setLastPeriodStart(statsData.lastPeriodStart || null);

      if (viewingPartner) {
        setPartnerName(statsData.partnerName || 'Partner');
      }

      // 3. Fetch symptom logs (self or partner) with the same date range
      const symptomsEndpoint = viewingPartner
        ? `${import.meta.env.VITE_BACKEND_URL}/api/cycles/partner/symptoms`
        : `${import.meta.env.VITE_BACKEND_URL}/api/cycles/symptoms`;

      const symptomsRes = await axios.get(symptomsEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
        params: { from: fromDate, to: toDate },
      });
      const rawSymptoms = symptomsRes.data || [];
      const formattedSymptoms = rawSymptoms.map((item: any) => ({
        ...item,
        log_date: item.log_date || item.logDate || item.date,
      }));
      setSymptomLogs(formattedSymptoms);

      // 4. Fetch cycle history (self or partner) – needed for bleeding days and earliest start
      const historyEndpoint = viewingPartner
        ? `${import.meta.env.VITE_BACKEND_URL}/api/cycles/partner/history`
        : `${import.meta.env.VITE_BACKEND_URL}/api/cycles/history`;

      const historyRes = await axios.get(historyEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allCycles = historyRes.data || [];

      if (allCycles.length > 0) {
        const starts = allCycles.map((c: any) => c.start_date).filter(Boolean);
        if (starts.length > 0) {
          const earliest = starts.reduce((a: string, b: string) => (a < b ? a : b));
          setEarliestCycleStart(earliest);
        }
      }

      const isBleedingDay = (dateStr: string) => {
        return allCycles.some((c: any) => {
          const cStart = c.start_date;
          const cEnd = c.end_date || c.start_date;
          return dateStr >= cStart && dateStr <= cEnd;
        });
      };

      // 5. Build calendar from fromDate to toDate (the stats endpoint may also return a calendar, but we rebuild here to include all details)
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);
      const calendarDays: any[] = [];
      let current = new Date(startDate);

      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        const symptom = formattedSymptoms.find((s: any) => s.log_date === dateStr);
        calendarDays.push({
          date: dateStr,
          bleeding: isBleedingDay(dateStr),
          symptoms: symptom?.physical_symptoms?.length > 0 || false,
          ...symptom,
        });
        current.setDate(current.getDate() + 1);
      }

      // 6. Extend calendar with future predicted days (up to next-next period)
      const nextPeriodStart = statsData.prediction?.nextPeriodStart;
      const avgCycle = statsData.prediction?.averageCycleLength || 28;

      if (nextPeriodStart) {
        const nextPeriodDate = new Date(nextPeriodStart);
        const futureLimit = new Date(nextPeriodDate);
        futureLimit.setDate(futureLimit.getDate() + avgCycle);

        const lastExistingDate = calendarDays.length > 0
          ? calendarDays[calendarDays.length - 1].date
          : todayStr;
        let cursor = new Date(lastExistingDate);
        cursor.setDate(cursor.getDate() + 1);

        while (cursor < futureLimit) {
          const dateStr = cursor.toISOString().split('T')[0];
          if (!calendarDays.find(d => d.date === dateStr)) {
            calendarDays.push({
              date: dateStr,
              bleeding: false,
              symptoms: false,
            });
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      }

      calendarDays.sort((a, b) => a.date.localeCompare(b.date));
      setCalendar(calendarDays);
    } catch (err) {
      console.error('Error fetching cycle data:', err);
    } finally {
      setLoading(false);
    }
  }, [viewingPartner]);

  useEffect(() => {
    setPrediction(null);
    fetchData(range, customStart, customEnd);
  }, [range, viewingPartner, customStart, customEnd]);

  const togglePartnerView = () => setViewingPartner(prev => !prev);

  return {
    loading,
    prediction,
    calendar,
    symptomLogs,
    lastPeriodStart,
    earliestCycleStart,
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
  };
}
