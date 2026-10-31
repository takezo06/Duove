import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import axios from 'axios';
import { usePageTitle } from '../hooks/usePageTitle';
import { useOverview } from '../hooks/useShared';
import { mustAsk, tracks, type Who } from '../hooks/useCycle';
import { useContraception } from '../hooks/useContraception';
import { supabase } from '../lib/supabase';
import { apiError } from '../lib/apiError';
import { today } from '../lib/cycle';
import { contraceptionModel, type Method } from '../lib/contraception';
import { Avatar, Modal, primaryButton, secondaryButton, surface } from '../components/Card';
import { HeaderShell, HeaderSkeleton, TrackingQuestion } from '../components/cycle/CycleHeader';
import { BackToCycle, ContraHeader, WhoChips } from '../components/contraception/ContraHeader';
import { MethodForm } from '../components/contraception/MethodForm';
import { PackCard } from '../components/contraception/PackCard';
import { EmergencyModal, HistoryCard, Insights, MissedCard } from '../components/contraception/ContraCards';

const api = import.meta.env.VITE_BACKEND_URL;
const minutesNow = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

export function Contraception() {
  usePageTitle('Contraception');
  const navigate = useNavigate();
  const todayIso = today();
  const { data: overview, error: overviewError, reload, set: setOverview } = useOverview();
  const c = useContraception();
  const [pick, setPick] = useState<Who | null>(null);
  const [changing, setChanging] = useState(false);
  const [emergency, setEmergency] = useState(false);

  // Only whoever has periods sets a method here (the cycle page's rule); you first
  const options = overview ? (['me', 'partner'] as const).filter((w) => tracks(overview[w])) : [];
  const askMe = !!overview && mustAsk(overview.me);
  const who: Who | null = askMe ? null : pick && options.includes(pick) ? pick : (options[0] ?? null);
  const partnerName = overview?.partner.name ?? '';
  const mine = who === 'me';
  const method: Method | null | undefined = !c.data || !who ? undefined : mine ? c.data.me.method : (c.data.partner.method ?? null);
  const events = useMemo(() => (c.data ? (mine ? c.data.me.events : (c.data.partner.events ?? [])) : []), [c.data, mine]);
  const model = useMemo(() => (method ? contraceptionModel(method, events, todayIso, minutesNow()) : null), [method, events, todayIso]);

  const answerTracks = async (value: boolean) => {
    await axios.patch(`${api}/profile`, { has_periods: value }, { headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } });
    setOverview((o) => o && { ...o, me: { ...o.me, hasPeriods: value } });
  };

  if (overview === null || c.data === null) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`${surface} p-8 md:p-12 text-center`}>
          <div className="flex justify-center -space-x-4 mb-5">
            <Avatar src={null} name="You" />
            <Avatar src={null} name="Your partner" dashed />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Contraception lives with your cycle</h1>
          <p className="text-neutral-400 max-w-md mx-auto">Connect with your partner to track your cycle and contraception.</p>
          <button onClick={() => navigate('/partner')} className={`${primaryButton} mt-6`}>Connect with your partner</button>
        </div>
      </div>
    );
  }

  const error = overview === undefined && overviewError ? apiError(overviewError, "Couldn't load your contraception. Try again.") : c.error;
  const loading = overview === undefined || c.data === undefined;
  const chips = who && options.length > 1 ? <WhoChips who={who} options={options} partnerName={partnerName} setWho={setPick} /> : undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <BackToCycle />
      {error ? (
        <HeaderShell title="Contraception" subtitle="Your method, what's due and the dates to keep in mind.">
          <div className="mt-6 pt-6 border-t border-neutral-800">
            <p role="alert" className="text-sm text-rose-300">{error}</p>
            <button onClick={() => { reload(); c.retry(); }} className={`${secondaryButton} mt-4`}>Try again</button>
          </div>
        </HeaderShell>
      ) : loading ? (
        <>
          <HeaderSkeleton />
          <div className={`${surface} h-72 animate-pulse`} aria-busy="true" />
        </>
      ) : askMe ? (
        <HeaderShell title="Contraception" subtitle="One question first: contraception is tracked by whoever has periods.">
          <TrackingQuestion partnerName={partnerName} partnerTracks={tracks(overview.partner)} onAnswer={answerTracks} />
        </HeaderShell>
      ) : !who ? (
        <HeaderShell title="Contraception" subtitle="Tracked by whoever has periods, alongside their cycle.">
          <div className="mt-6 pt-6 border-t border-neutral-800">
            <p className="text-neutral-200">Neither of you tracks a cycle here yet.</p>
            <p className="text-sm text-neutral-400 mt-1">Once one of you turns cycle tracking on, the contraception tracker opens for them.</p>
            <button onClick={() => navigate('/cycle')} className={`${secondaryButton} mt-5`}>Go to the cycle tracker</button>
          </div>
        </HeaderShell>
      ) : !method ? (
        mine ? (
          <HeaderShell title="Your contraception" subtitle={`Keep track of your method and what's due. Private unless you share it with ${partnerName}.`} aside={chips}>
            <div className="mt-6 pt-6 border-t border-neutral-800">
              <MethodForm current={null} onSave={c.start} />
            </div>
          </HeaderShell>
        ) : (
          <HeaderShell title={<><span className="text-rose-400">{partnerName}</span>'s contraception</>} subtitle="Shared only if they choose to." aside={chips}>
            <div className="mt-6 pt-6 border-t border-neutral-800 flex items-start gap-3">
              <Lock className="w-4 h-4 text-neutral-400 mt-1 shrink-0" aria-hidden />
              <div>
                <p className="text-neutral-200">{partnerName} keeps this private.</p>
                <p className="text-sm text-neutral-400 mt-1">If {partnerName} shares it, their method and what's due show up here.</p>
              </div>
            </div>
          </HeaderShell>
        )
      ) : model && (
        <>
          <ContraHeader
            model={model}
            method={method}
            mine={mine}
            partnerName={partnerName}
            aside={chips}
            todayIso={todayIso}
            onLog={mine ? (kind, day) => c.log(kind, day) : undefined}
            onChange={() => setChanging(true)}
            onShare={mine ? (shared) => c.update({ shared }) : undefined}
            onStop={mine ? () => c.update({ ended_on: todayIso }) : undefined}
          />
          <PackCard key={method.id} model={model} events={events} methodId={method.id} editable={mine} onLog={(kind, day) => c.log(kind, day)} onRemove={c.remove} />
          {mine && <MissedCard model={model} onEmergency={() => setEmergency(true)} />}
          <Insights model={model} method={method} todayIso={todayIso} />
          {mine && c.data && (
            <HistoryCard
              events={c.data.me.events}
              past={c.data.me.past}
              current={method}
              todayIso={todayIso}
              onRemove={c.remove}
              onEmergency={model.missed ? undefined : () => setEmergency(true)}
            />
          )}
        </>
      )}

      {changing && mine && method && (
        <Modal label="Change your method" wide onClose={() => setChanging(false)}>
          <MethodForm current={method} onSave={async (m, d, s) => { await c.start(m, d, s); setChanging(false); }} onCancel={() => setChanging(false)} />
        </Modal>
      )}
      {emergency && <EmergencyModal onClose={() => setEmergency(false)} onSave={(ec, day) => c.log('emergency', day, ec)} />}
    </div>
  );
}
