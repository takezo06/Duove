import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  Loader2,
  BarChart3,
  AlertTriangle,
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Activity,
} from 'lucide-react';

interface SymptomLog {
  log_date: string;
  bleeding_intensity: string | null;
  physical_symptoms: string[];
  moods: string[];
  lifestyle: any;
}

export function CycleAnalytics() {
  usePageTitle('Cycle Analytics');
  const [loading, setLoading] = useState(true);
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<string[]>([]);
  const [symptomFrequency, setSymptomFrequency] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const [symptomsRes, cyclesRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/cycles/symptoms`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/cycles/history`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setSymptoms(symptomsRes.data);
        setCycles(cyclesRes.data);

        // Detect anomalies: variation > 7 days or bleeding > 8 days
        const cycleDurations = cyclesRes.data
          .filter((c: any) => c.end_date)
          .map((c: any) => {
            const start = new Date(c.start_date);
            const end = new Date(c.end_date);
            return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          });
        const anomaliesList: string[] = [];
        for (let i = 1; i < cycleDurations.length; i++) {
          if (Math.abs(cycleDurations[i] - cycleDurations[i - 1]) > 7) {
            anomaliesList.push(`Cycle variation > 7 days (${cycleDurations[i-1]} → ${cycleDurations[i]})`);
          }
        }
        // Check bleeding duration
        for (const cycle of cyclesRes.data) {
          if (cycle.end_date) {
            const start = new Date(cycle.start_date);
            const end = new Date(cycle.end_date);
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            if (days > 8) {
              anomaliesList.push(`Bleeding lasted ${days} days (normal: 2-7)`);
            }
          }
        }
        setAnomalies(anomaliesList.slice(0, 5));

        // Symptom frequency
        const freq: Record<string, number> = {};
        for (const s of symptomsRes.data) {
          for (const sym of s.physical_symptoms || []) {
            freq[sym] = (freq[sym] || 0) + 1;
          }
          for (const mood of s.moods || []) {
            freq[mood] = (freq[mood] || 0) + 1;
          }
        }
        setSymptomFrequency(freq);

      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-rose-400" />
          <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        </div>
        <button
          onClick={() => {/* implement PDF export */}}
          className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Anomaly detection */}
      {anomalies.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-amber-400 font-medium">
            <AlertTriangle className="w-5 h-5" />
            Anomalies Detected
          </div>
          <ul className="mt-2 space-y-1">
            {anomalies.map((msg, i) => (
              <li key={i} className="text-sm text-neutral-300">• {msg}</li>
            ))}
          </ul>
          <p className="text-xs text-neutral-500 mt-2">
            Consider consulting a healthcare provider if you notice patterns.
          </p>
        </div>
      )}

      {/* Symptom frequency */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 mb-6">
        <h2 className="text-white font-medium mb-4">Most Common Symptoms</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(symptomFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([symptom, count]) => (
              <span key={symptom} className="px-3 py-1 bg-neutral-800 rounded-full text-xs text-neutral-300 border border-neutral-700">
                {symptom} ({count})
              </span>
            ))}
        </div>
      </div>

      {/* Cycle history summary */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
        <h2 className="text-white font-medium mb-4">Cycle History</h2>
        <div className="space-y-2">
          {cycles.slice(-6).reverse().map((cycle: any) => (
            <div key={cycle.id} className="flex justify-between text-sm text-neutral-300 border-b border-neutral-800/50 pb-2">
              <span>{new Date(cycle.start_date).toLocaleDateString()}</span>
              <span>{cycle.end_date ? new Date(cycle.end_date).toLocaleDateString() : 'Ongoing'}</span>
              <span className="text-neutral-500">
                {cycle.end_date
                  ? Math.ceil((new Date(cycle.end_date).getTime() - new Date(cycle.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1 + ' days'
                  : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
