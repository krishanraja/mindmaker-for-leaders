// TrackRecordSkeleton - the in-shell branded loading state for the You tab. Reuses the
// shared SkeletonCard/SkeletonBar/LoadingCaption primitives (CTRL-SYSTEM-SPEC s6: no raw
// spinners; loading is branded + anticipatory) and previews the SHAPE of the calibration
// hero + aged-call rows that are coming, faithful to the loading mock in you-2028.html.

import { LoadingCaption, SkeletonBar, SkeletonCard } from '@/components/system/SkeletonCard';
import { cn } from '@/lib/utils';

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3.5 overflow-hidden rounded-2xl border border-border bg-[linear-gradient(180deg,#0f141c,#0a0e13)] px-4 py-4">
      <span className="-ml-4 h-[66px] w-1 flex-none bg-[linear-gradient(180deg,#1c2430,#11161e)]" aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonBar className="h-3 w-[70%]" />
        <SkeletonBar className="h-3 w-[45%]" />
      </div>
    </div>
  );
}

export function TrackRecordSkeleton({ desktop = false }: { desktop?: boolean }) {
  const rows = desktop ? 4 : 3;
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-3.5', desktop && 'grid grid-cols-[1.05fr_1fr] gap-6')}>
      <SkeletonCard variant="lead" className={desktop ? 'min-h-[260px]' : ''} />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
        {!desktop && (
          <LoadingCaption>Pulling your banked calls and how they aged</LoadingCaption>
        )}
      </div>
      {desktop && <LoadingCaption>Pulling your banked calls and how they aged</LoadingCaption>}
    </div>
  );
}
