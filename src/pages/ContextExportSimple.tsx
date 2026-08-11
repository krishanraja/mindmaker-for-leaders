import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ContextFileButton } from '@/components/memory/ContextFileButton';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { useDevice } from '@/hooks/useDevice';

function ExportContent() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col justify-center py-8">
      <button type="button" onClick={() => navigate('/memory')} className="mb-8 inline-flex w-fit items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Memory
      </button>
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent"><FileText className="h-5 w-5" /></span>
        <h1 className="mt-6 font-mymu-serif text-3xl font-semibold leading-tight text-foreground">Take your context with you.</h1>
        <p className="mt-3 max-w-[38ch] text-sm leading-relaxed text-muted-foreground">Copy one current page into any AI, or download it. No setup and no wizard.</p>
        <div className="mt-7"><ContextFileButton variant="row" /></div>
      </div>
    </div>
  );
}

export default function ContextExportSimple() {
  const { isMobile } = useDevice();
  if (isMobile) {
    return <MobileFrame scroll padding="px-4 pb-24"><ExportContent /></MobileFrame>;
  }
  return <DesktopShell eyebrow="Memory" title="Take it with you" fit={false}><ExportContent /></DesktopShell>;
}
