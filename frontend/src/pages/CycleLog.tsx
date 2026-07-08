import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import {
  Loader2,
  Calendar,
  Heart,
  Activity,
  Droplet,
  Smile,
  Flame,
  Moon,
  Coffee,
  HeartPulse,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

const BLEEDING_OPTIONS = ['spotting', 'light', 'medium', 'heavy'];
const PHYSICAL_SYMPTOMS = ['cramps', 'bloating', 'headache', 'acne', 'breast tenderness', 'fatigue', 'backache', 'nausea'];
const MOOD_OPTIONS = ['happy', 'sad', 'anxious', 'irritable', 'energetic', 'moody', 'calm', 'emotional'];
const DISCHARGE_OPTIONS = ['sticky', 'creamy', 'egg-white', 'watery', 'dry'];
const DRIVE_OPTIONS = ['high', 'medium', 'low'];
const SEX_ACTIVITY = ['unprotected', 'protected', 'masturbation'];

// Category icons and colors
const categoryConfig = {
  bleeding: { icon: Droplet, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Bleeding' },
  physical: { icon: Activity, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Physical Symptoms' },
  moods: { icon: Smile, color: 'text-pink-400', bg: 'bg-pink-400/10', label: 'Moods' },
  discharge: { icon: Flame, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Discharge' },
  sex_drive: { icon: HeartPulse, color: 'text-rose-400', bg: 'bg-rose-400/10', label: 'Sex Drive' },
  sexual_activity: { icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Sexual Activity' },
  lifestyle: { icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-400/10', label: 'Lifestyle' },
};

export function CycleLog() {
  const [loading, setLoading] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [bleeding, setBleeding] = useState<string | null>(null);
  const [physical, setPhysical] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [discharge, setDischarge] = useState<string | null>(null);
  const [drive, setDrive] = useState<string | null>(null);
  const [sexActivity, setSexActivity] = useState<string[]>([]);
  const [sleep, setSleep] = useState<number | null>(null);
  const [stress, setStress] = useState<'low' | 'medium' | 'high' | null>(null);
  const [alcohol, setAlcohol] = useState(false);
  const [isCycleStart, setIsCycleStart] = useState(false);
  const [cycleEndDate, setCycleEndDate] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['bleeding', 'physical', 'moods']);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExistingLog = async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/cycles/symptoms?from=${logDate}&to=${logDate}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.length > 0) {
          const existing = res.data[0];
          setExistingId(existing.id);
          setBleeding(existing.bleeding_intensity);
          setPhysical(existing.physical_symptoms || []);
          setMoods(existing.moods || []);
          setDischarge(existing.discharge);
          setDrive(existing.sex_drive);
          setSexActivity(existing.sexual_activity || []);
          setSleep(existing.lifestyle?.sleep_hours ?? null);
          setStress(existing.lifestyle?.stress || null);
          setAlcohol(existing.lifestyle?.alcohol || false);
          setIsEditing(true);
        } else {
          setIsEditing(false);
          setExistingId(null);
        }
      } catch (err) {
        console.error('Error fetching log:', err);
      }
    };
    fetchExistingLog();
  }, [logDate]);

  const toggleArrayItem = (array: string[], item: string, setter: (arr: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const isSectionExpanded = (section: string) => expandedSections.includes(section);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const payload = {
        log_date: logDate,
        bleeding_intensity: bleeding,
        physical_symptoms: physical,
        moods: moods,
        discharge: discharge,
        sex_drive: drive,
        sexual_activity: sexActivity,
        lifestyle: {
          sleep_hours: sleep,
          stress: stress,
          alcohol: alcohol,
        },
      };
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/cycles/symptoms`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (isCycleStart && !isEditing) {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/cycles/log`,
          { start_date: logDate, end_date: cycleEndDate || null },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      navigate('/cycle');
    } catch (err) {
      console.error('Error saving log:', err);
      alert('Failed to save log.');
    } finally {
      setLoading(false);
    }
  };

  const renderOptionButtons = (
    options: string[],
    selected: string | string[] | null,
    onChange: (val: any) => void,
    isMulti = false,
    allowNone = true
  ) => {
    const handleClick = (option: string) => {
      if (isMulti) {
        // Toggle array item
        const arr = (selected as string[]) || [];
        if (arr.includes(option)) {
          onChange(arr.filter(i => i !== option));
        } else {
          onChange([...arr, option]);
        }
      } else {
        // Single select: if same option clicked, set to null (deselect)
        if (selected === option) {
          onChange(null);
        } else {
          onChange(option);
        }
      }
    };

    const isSelected = (option: string) => {
      if (isMulti) {
        return (selected as string[] || []).includes(option);
      }
      return selected === option;
    };

    return (
      <div className="flex flex-wrap gap-2 mt-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleClick(opt)}
            className={`px-3 py-1.5 rounded-full text-xs border transition ${
              isSelected(opt)
                ? 'bg-rose-500/20 border-rose-400/30 text-rose-300'
                : 'bg-neutral-800/50 border-neutral-700 text-neutral-400 hover:bg-neutral-700/50 hover:text-white'
            }`}
          >
            {opt}
          </button>
        ))}
        {allowNone && !isMulti && (
          <button
            onClick={() => onChange(null)}
            className={`px-3 py-1.5 rounded-full text-xs border transition ${
              selected === null
                ? 'bg-neutral-700/50 border-neutral-600 text-white'
                : 'bg-neutral-800/50 border-neutral-700 text-neutral-500 hover:bg-neutral-700/50 hover:text-white'
            }`}
          >
            None
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-6 h-6 text-rose-400" />
        <h1 className="text-2xl font-semibold text-white">{isEditing ? 'Edit Log' : 'Log Symptoms'}</h1>
      </div>

      {/* Date picker */}
      <div className="mb-4">
        <label className="text-sm text-neutral-400 block mb-1">Date</label>
        <input
          type="date"
          value={logDate}
          onChange={(e) => setLogDate(e.target.value)}
          className="w-full bg-neutral-800/50 text-sm text-white px-4 py-2.5 rounded-xl border border-neutral-700 focus:ring-2 focus:ring-rose-400/50 focus:border-transparent"
        />
      </div>

      {/* Cycle start toggle */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-neutral-800/30 rounded-xl border border-neutral-700/50">
        <input
          type="checkbox"
          checked={isCycleStart}
          onChange={(e) => setIsCycleStart(e.target.checked)}
          className="w-4 h-4 accent-rose-500"
        />
        <label className="text-sm text-white">This is the first day of my period</label>
      </div>
      {isCycleStart && (
        <div className="mb-4 ml-6">
          <label className="text-sm text-neutral-400 block mb-1">End date (optional)</label>
          <input
            type="date"
            value={cycleEndDate}
            onChange={(e) => setCycleEndDate(e.target.value)}
            className="w-full bg-neutral-800/50 text-sm text-white px-4 py-2.5 rounded-xl border border-neutral-700 focus:ring-2 focus:ring-rose-400/50"
          />
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {Object.entries(categoryConfig).map(([key, config]) => {
          const isExpanded = isSectionExpanded(key);
          const Icon = config.icon;
          return (
            <div
              key={key}
              className="bg-neutral-800/30 rounded-xl border border-neutral-700/50 overflow-hidden"
            >
              <button
                onClick={() => toggleSection(key)}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-700/20 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <span className="text-sm font-medium text-white">{config.label}</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-neutral-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                )}
              </button>

              {isExpanded && (
                <div className="p-4 pt-0 border-t border-neutral-700/30">
                  {key === 'bleeding' && (
                    renderOptionButtons(BLEEDING_OPTIONS, bleeding, setBleeding, false, true)
                  )}
                  {key === 'physical' && (
                    <>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {PHYSICAL_SYMPTOMS.map((sym) => (
                          <button
                            key={sym}
                            onClick={() => toggleArrayItem(physical, sym, setPhysical)}
                            className={`px-3 py-1.5 rounded-full text-xs border transition ${
                              physical.includes(sym)
                                ? 'bg-blue-500/20 border-blue-400/30 text-blue-300'
                                : 'bg-neutral-800/50 border-neutral-700 text-neutral-400 hover:bg-neutral-700/50 hover:text-white'
                            }`}
                          >
                            {sym}
                          </button>
                        ))}
                        <button
                          onClick={() => setPhysical([])}
                          className={`px-3 py-1.5 rounded-full text-xs border transition ${
                            physical.length === 0
                              ? 'bg-neutral-700/50 border-neutral-600 text-white'
                              : 'bg-neutral-800/50 border-neutral-700 text-neutral-500 hover:bg-neutral-700/50 hover:text-white'
                          }`}
                        >
                          None
                        </button>
                      </div>
                    </>
                  )}
                  {key === 'moods' && (
                    <>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {MOOD_OPTIONS.map((mood) => (
                          <button
                            key={mood}
                            onClick={() => toggleArrayItem(moods, mood, setMoods)}
                            className={`px-3 py-1.5 rounded-full text-xs border transition ${
                              moods.includes(mood)
                                ? 'bg-pink-500/20 border-pink-400/30 text-pink-300'
                                : 'bg-neutral-800/50 border-neutral-700 text-neutral-400 hover:bg-neutral-700/50 hover:text-white'
                            }`}
                          >
                            {mood}
                          </button>
                        ))}
                        <button
                          onClick={() => setMoods([])}
                          className={`px-3 py-1.5 rounded-full text-xs border transition ${
                            moods.length === 0
                              ? 'bg-neutral-700/50 border-neutral-600 text-white'
                              : 'bg-neutral-800/50 border-neutral-700 text-neutral-500 hover:bg-neutral-700/50 hover:text-white'
                          }`}
                        >
                          None
                        </button>
                      </div>
                    </>
                  )}
                  {key === 'discharge' && (
                    renderOptionButtons(DISCHARGE_OPTIONS, discharge, setDischarge, false, true)
                  )}
                  {key === 'sex_drive' && (
                    renderOptionButtons(DRIVE_OPTIONS, drive, setDrive, false, true)
                  )}
                  {key === 'sexual_activity' && (
                    <>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {SEX_ACTIVITY.map((act) => (
                          <button
                            key={act}
                            onClick={() => toggleArrayItem(sexActivity, act, setSexActivity)}
                            className={`px-3 py-1.5 rounded-full text-xs border transition ${
                              sexActivity.includes(act)
                                ? 'bg-purple-500/20 border-purple-400/30 text-purple-300'
                                : 'bg-neutral-800/50 border-neutral-700 text-neutral-400 hover:bg-neutral-700/50 hover:text-white'
                            }`}
                          >
                            {act}
                          </button>
                        ))}
                        <button
                          onClick={() => setSexActivity([])}
                          className={`px-3 py-1.5 rounded-full text-xs border transition ${
                            sexActivity.length === 0
                              ? 'bg-neutral-700/50 border-neutral-600 text-white'
                              : 'bg-neutral-800/50 border-neutral-700 text-neutral-500 hover:bg-neutral-700/50 hover:text-white'
                          }`}
                        >
                          None
                        </button>
                      </div>
                    </>
                  )}
                  {key === 'lifestyle' && (
                    <div className="space-y-3 mt-1">
                      <div>
                        <label className="text-xs text-neutral-400">Sleep (hours)</label>
                        <input
                          type="number"
                          min={0}
                          max={24}
                          value={sleep ?? ''}
                          onChange={(e) => setSleep(e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="e.g. 8"
                          className="w-full bg-neutral-800/50 text-sm text-white px-3 py-2 rounded-lg border border-neutral-700 focus:ring-1 focus:ring-rose-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400">Stress Level</label>
                        <div className="flex gap-2 mt-1">
                          {['low', 'medium', 'high'].map((level) => (
                            <button
                              key={level}
                              onClick={() => setStress(stress === level ? null : level as 'low' | 'medium' | 'high')}
                              className={`px-3 py-1.5 rounded-full text-xs border transition ${
                                stress === level
                                  ? 'bg-indigo-500/20 border-indigo-400/30 text-indigo-300'
                                  : 'bg-neutral-800/50 border-neutral-700 text-neutral-400 hover:bg-neutral-700/50 hover:text-white'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                          <button
                            onClick={() => setStress(null)}
                            className={`px-3 py-1.5 rounded-full text-xs border transition ${
                              stress === null
                                ? 'bg-neutral-700/50 border-neutral-600 text-white'
                                : 'bg-neutral-800/50 border-neutral-700 text-neutral-500 hover:bg-neutral-700/50 hover:text-white'
                            }`}
                          >
                            None
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={alcohol}
                          onChange={(e) => setAlcohol(e.target.checked)}
                          className="w-4 h-4 accent-rose-500"
                        />
                        <label className="text-sm text-white">Consumed alcohol</label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full mt-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {isEditing ? 'Update Log' : 'Save Log'}
      </button>
    </div>
  );
}
