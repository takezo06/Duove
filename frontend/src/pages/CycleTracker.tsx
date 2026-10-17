import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { mustAsk, tracks, useCycle, type Who } from '../hooks/useCycle';
import { cycleModel, today } from '../lib/cycle';
import { Avatar, primaryButton, secondaryButton, surface } from '../components/Card';
import { CycleHeader, HeaderShell, HeaderSkeleton, TrackingOff, TrackingQuestion } from '../components/cycle/CycleHeader';
import { CycleCalendar } from '../components/cycle/CycleCalendar';
import { DayPanel } from '../components/cycle/DayPanel';
import { CycleStats, MostLogged, PastCycles, TipCard } from '../components/cycle/CycleInsights';
import { LogModal } from '../components/cycle/LogModal';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function CycleTracker() {
  usePageTitle('Cycle Tracker');
  const navigate = useNavigate();
  const todayIso = today();
  const [pick, setPick] = useState<Who | null>(null);
  const [month, setMonth] = useState(todayIso.slice(0, 7));
  const [selected, setSelected] = useState(todayIso);
  const [logging, setLogging] = useState<string | null>(null);
  const calendar = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const c = useCycle(pick, month);
  const { overview } = c;
  // Everyone answers "Do you have periods?" before seeing any cycle, unless 2+ logged periods already say yes
  const askMe = !!overview && mustAsk(overview.me);
  const who = askMe ? null : c.who;
  const periods = who && overview ? overview[who].periods : undefined;
  const model = useMemo(() => cycleModel(periods ?? [], todayIso), [periods, todayIso]);
  const s = model.summary;
  const mine = who === 'me';
  const partnerName = overview?.partner.name ?? '';
  const ready = (day: string) => !!c.logs && !!c.logsFrom && day >= c.logsFrom;

  const select = (day: string, tapped?: boolean) => {
    setSelected(day);
    // Below lg the day sits under the calendar: bring it up after a tap
    if (tapped && window.matchMedia('(max-width: 1023px)').matches)
      requestAnimationFrame(() => panel.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' }));
  };
  const showInCalendar = (day: string) => {
    setMonth(day.slice(0, 7));
    setSelected(day);
    calendar.current?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  if (overview === null) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`${surface} p-8 md:p-12 text-center`}>
          <div className="flex justify-center -space-x-4 mb-5">
            <Avatar src={null} name="You" />
            <Avatar src={null} name="Your partner" dashed />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Cycles are shared here</h1>
          <p className="text-neutral-400 max-w-md mx-auto">Connect with your partner to track periods and see what's coming, together.</p>
          <button onClick={() => navigate('/partner')} className={`${primaryButton} mt-6`}>
            Connect with your partner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {overview === undefined ? (
        c.error ? (
          <HeaderShell title="Cycle tracker" subtitle="Periods, symptoms and predictions for the two of you.">
            <div className="mt-6 pt-6 border-t border-neutral-800">
              <p role="alert" className="text-sm text-rose-300">{c.error}</p>
              <button onClick={c.retry} className={`${secondaryButton} mt-4`}>Try again</button>
            </div>
          </HeaderShell>
        ) : (
          <HeaderSkeleton />
        )
      ) : askMe ? (
        <HeaderShell
          title="Cycle tracking"
          subtitle={tracks(overview.partner) ? `One question about you, then ${partnerName}'s cycle.` : 'One question before you start.'}
        >
          <TrackingQuestion partnerName={partnerName} partnerTracks={tracks(overview.partner)} onAnswer={c.answerTracks} />
        </HeaderShell>
      ) : !who ? (
        <TrackingOff partnerName={partnerName} partnerSaidNo={overview.partner.hasPeriods === false} onTurnOn={() => c.answerTracks(true)} />
      ) : (
        <CycleHeader
          who={who}
          options={c.options}
          setWho={setPick}
          partnerName={partnerName}
          model={model}
          todayIso={todayIso}
          todayLogged={!!c.logs?.[todayIso]}
          logsReady={ready(todayIso)}
          onStart={c.startPeriod}
          onUpdate={c.updatePeriod}
          onLogToday={() => setLogging(todayIso)}
          // Said no, but a cycle of your own can still be turned on from here
          onTrackMine={!mine && overview.me.hasPeriods === false ? () => c.answerTracks(true) : undefined}
        />
      )}

      {overview === undefined && !c.error && (
        <div className="space-y-6" aria-busy="true">
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className={`${surface} h-40 animate-pulse`} />)}
          </div>
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] gap-6">
            <div className={`${surface} h-96 animate-pulse`} />
            <div className={`${surface} h-64 animate-pulse`} />
          </div>
        </div>
      )}

      {who && s && !s.stale && <CycleStats s={s} todayIso={todayIso} />}

      {who && (
        <div ref={calendar} className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] gap-6 items-start scroll-mt-4">
          <CycleCalendar month={month} setMonth={setMonth} selected={selected} onSelect={select} model={model} logs={c.logs} todayIso={todayIso} />
          <div ref={panel} className="scroll-mt-4">
            <DayPanel
              key={`${who}${selected}`}
              day={selected}
              todayIso={todayIso}
              model={model}
              periods={periods ?? []}
              log={c.logs?.[selected]}
              logsReady={ready(selected)}
              logsError={c.logsError}
              retryLogs={c.retryLogs}
              editable={mine}
              onLog={() => setLogging(selected)}
              onStart={c.startPeriod}
              onUpdate={c.updatePeriod}
              onRemove={c.removePeriod}
            />
          </div>
        </div>
      )}

      {who && s && (
        <>
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <PastCycles model={model} mine={mine} name={partnerName} onPick={showInCalendar} />
            <MostLogged logs={c.logs} from={c.logsFrom} mine={mine} name={partnerName} />
          </div>
          <TipCard phase={s.phase} mine={mine} name={partnerName} />
        </>
      )}

      {logging && (
        <LogModal
          day={logging}
          isToday={logging === todayIso}
          existing={c.logs?.[logging]}
          onSave={(input) => c.saveLog(logging, input)}
          onClose={() => setLogging(null)}
        />
      )}
    </div>
  );
}
