import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { useDevice } from '@/hooks/useDevice';
import { useTrackRecord } from '@/hooks/useTrackRecord';
import { buildTrackRecordModel } from '@/components/track-record/trackRecordModel';
import { TrackRecordView } from '@/components/track-record/TrackRecordView';
import { TrackRecordSkeleton } from '@/components/track-record/TrackRecordSkeleton';
import { ShareWinButton } from '@/components/share/ShareWinButton';

// The chief-of-staff voice per state (mock VOICE map). One job: your judgment over time.
// The cold copy never implies an empty scoreboard; it frames the FUTURE value.
type VoiceKey = 'loading' | 'cold' | 'warm' | 'rich';
const VOICE: Record<VoiceKey, { title: string; frame: string }> = {
  loading: { title: 'How your decisions are aging', frame: 'Reading your record.' },
  cold: { title: 'How your decisions will age', frame: 'This fills in the first time you bank a call.' },
  warm: { title: 'How your decisions are aging', frame: 'The first pattern is starting to show.' },
  rich: { title: 'How your decisions are aging', frame: 'Every call you bank, judged on your read, not the result.' },
};

/** The page head shown inside the content (eyebrow + title + one-line frame), per state. */
function PageHead({ voiceKey }: { voiceKey: VoiceKey }) {
  const v = VOICE[voiceKey];
  return (
    <div>
      <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_hsl(var(--accent))]" />
        Track Record
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

  const model = useMemo(() => buildTrackRecordModel(records), [records]);
  const voiceKey: VoiceKey = loading ? 'loading' : model.kind;

  const handleWeigh = () => navigate('/decision');

  // The desktop Share action only appears once there is a real, earned record to share.
  const shareAction =
    !loading && model.kind === 'rich' && model.calibration.pct !== null ? (
      <ShareWinButton
        win={{
          title: 'My decision calibration, on the record',
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
      <DesktopShell eyebrow="Workspace" title="Track Record" actions={shareAction}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-5 flex-none">
            <PageHead voiceKey={voiceKey} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            {loading ? (
              <TrackRecordSkeleton desktop />
            ) : (
              <TrackRecordView model={model} desktop onWeigh={handleWeigh} />
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
          <TrackRecordView model={model} desktop={false} onWeigh={handleWeigh} />
        )}
      </div>
    </MobileFrame>
  );
}
