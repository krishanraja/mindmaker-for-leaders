import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { useDevice } from '@/hooks/useDevice';
import { useTrackRecord } from '@/hooks/useTrackRecord';
import { useCapabilitySignals } from '@/hooks/useCapabilitySignals';
import { buildTrackRecordModel } from '@/components/track-record/trackRecordModel';
import { TrackRecordView } from '@/components/track-record/TrackRecordView';
import { TrackRecordSkeleton } from '@/components/track-record/TrackRecordSkeleton';
import { ShareWinButton } from '@/components/share/ShareWinButton';
import type { CapabilityNextMove } from '@/lib/capabilityLadder';

// The chief-of-staff voice per state. Plain language: the questions you have
// weighed and how they turned out. The cold copy frames the FUTURE value, never
// an empty scoreboard.
type VoiceKey = 'loading' | 'cold' | 'warm' | 'rich';
const VOICE: Record<VoiceKey, { title: string; frame: string }> = {
  loading: { title: 'The big questions you have weighed', frame: 'Reading your history.' },
  cold: { title: 'The big questions you weigh, kept on the record', frame: 'This fills in the first time you bank a decision.' },
  warm: { title: 'The big questions you have weighed', frame: 'A first pattern is starting to show.' },
  rich: { title: 'The big questions you have weighed', frame: 'Each one tracked by how it actually turned out.' },
};

/** The page head shown inside the content (eyebrow + title + one-line frame), per state. */
function PageHead({ voiceKey }: { voiceKey: VoiceKey }) {
  const v = VOICE[voiceKey];
  return (
    <div>
      <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_hsl(var(--accent))]" />
        History
      </span>
      <h1 className="mt-1.5 text-[25px] font-extrabold leading-tight tracking-tight text-foreground">{v.title}</h1>
      <p className="mt-1.5 max-w-[34ch] text-[13px] leading-snug text-muted-foreground">{v.frame}</p>
    </div>
  );
}

export default function TrackRecordPage() {
  const { isMobile } = useDevice();
  const navigate = useNavigate();
  const { records, loading } = useTrackRecord();
  const { capability } = useCapabilitySignals();

  const model = useMemo(() => buildTrackRecordModel(records), [records]);
  const voiceKey: VoiceKey = loading ? 'loading' : model.kind;

  // Open the decision weigher, optionally prefilled with a suggested question.
  const handleWeigh = (prefill?: string) =>
    navigate('/decision', prefill ? { state: { prefill } } : undefined);

  // The ladder's one next move: route wherever the behaviour lives (weigh,
  // verify facts, voice, context), carrying a prefill when it is a decision.
  const handleCapabilityGo = (move: CapabilityNextMove) =>
    navigate(move.route, move.prefill ? { state: { prefill: move.prefill } } : undefined);

  // The desktop Share action only appears once there is a real, earned record to share.
  const shareAction =
    !loading && model.kind === 'rich' && model.calibration.pct !== null ? (
      <ShareWinButton
        win={{
          title: 'My decision track record, on the record',
          stat: `${model.calibration.pct}%`,
          sub: 'of my calls aged the way I read them',
          text: `I read ${model.calibration.read} of ${model.calibration.scored} of my decision calls the way the evidence landed. CTRL keeps my judgment honest.`,
        }}
        label="Share"
        variant="outline"
      />
    ) : undefined;

  // ----- DESKTOP -----
  if (!isMobile) {
    return (
      <DesktopShell eyebrow="History" title="The questions you have weighed" actions={shareAction}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-5 flex-none">
            <PageHead voiceKey={voiceKey} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            {loading ? (
              <TrackRecordSkeleton desktop />
            ) : (
              <TrackRecordView
                model={model}
                desktop
                onWeigh={handleWeigh}
                capability={capability}
                onCapabilityGo={handleCapabilityGo}
              />
            )}
          </div>
        </div>
      </DesktopShell>
    );
  }

  // ----- MOBILE ----- (calm reading column inside the shared MobileFrame; minimal scroll)
  return (
    <MobileFrame scroll hideScrollbar padding="px-4 pb-24">
      <div className="flex min-h-0 flex-col gap-3.5 py-4">
        <PageHead voiceKey={voiceKey} />
        {loading ? (
          <TrackRecordSkeleton />
        ) : (
          <TrackRecordView
            model={model}
            desktop={false}
            onWeigh={handleWeigh}
            capability={capability}
            onCapabilityGo={handleCapabilityGo}
          />
        )}
      </div>
    </MobileFrame>
  );
}
