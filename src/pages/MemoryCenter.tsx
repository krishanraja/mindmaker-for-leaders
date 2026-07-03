import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowUpRight, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { haptics } from '@/lib/haptics';
import { MemoryErrorBoundary } from '@/components/memory/MemoryErrorBoundary';
import { MemoryList } from '@/components/memory/MemoryList';
import { MemoryDetailSheet } from '@/components/memory/MemoryDetailSheet';
import { AddMemorySheet } from '@/components/memory/AddMemorySheet';
import { PrivacyControlsPanel } from '@/components/memory/PrivacyControlsPanel';
import { ExportImportPanel } from '@/components/memory/ExportImportPanel';
import { VerificationSwipeStack } from '@/components/memory/VerificationSwipeStack';
import { ContextFileButton } from '@/components/memory/ContextFileButton';
import { LibraryTab } from '@/components/library/LibraryTab';
import { useGeneratedArtifacts } from '@/hooks/useGeneratedArtifacts';
import { useDevice } from '@/hooks/useDevice';
import { useMemoryWeb } from '@/hooks/useMemoryWeb';
import { useMemoryEdges } from '@/hooks/useMemoryEdges';
import { useMarkdownImport } from '@/hooks/useMarkdownImport';
import { useVerificationFlow } from '@/hooks/useVerificationFlow';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { BrainCanvas } from '@/components/memory-web/BrainCanvas';
import { BondReader } from '@/components/memory-web/BondReader';
import type { MemoryBond } from '@/components/memory-web/MemoryWebVisualization';
import type { GraphBond } from '@/components/memory-web/BrainGraph';
import type { UserMemoryFact, UserPattern } from '@/types/memory';

// Cap the gentle verify nudge so it is never a backlog ("30 to verify").
// CTRL-SYSTEM-SPEC s2.4 + the mock: a single quiet "Verify N", small N.
const VERIFY_NUDGE_CAP = 5;

// Bridge the new GraphBond (from BrainGraph) onto the MemoryBond the existing
// BondReader reads. Same honest fields; `spine` is not a concept in the centred
// graph, so it is always false. The wider graph palette collapses back onto the
// reader's coarse territory vocabulary (you / company / ai).
function toMemoryBond(b: GraphBond): MemoryBond {
  const world =
    b.world === 'company' || b.world === 'challenge'
      ? 'company'
      : b.world === 'signal'
        ? 'ai'
        : 'you'; // identity / style / goal / strength all read as "you"
  return {
    id: b.id,
    fact: b.fact,
    world,
    strength: b.strength,
    confirmed: b.confirmed,
    spine: false,
    provenance: b.provenance,
  };
}

// The lightweight read for a tapped pattern node (a strength / blind spot /
// working-style read). A pattern is a CLAIM the brain noticed, not a verified
// fact, so it gets its own honest, un-verifiable read - never the fact reader.
function PatternRead({ pattern }: { pattern: UserPattern }) {
  const KIND_LABEL: Record<string, string> = {
    strength: 'A strength',
    blindspot: 'A blind spot',
    behavior: 'How you work',
    preference: 'How you work',
    anti_preference: 'How you work',
  };
  const kind = KIND_LABEL[pattern.pattern_type] ?? 'A pattern';
  const evidence = pattern.evidence_count ?? 0;
  return (
    <div className="flex w-full flex-col gap-3">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-accent/25 bg-accent/[0.07] px-2.5 py-1 text-[11px] font-semibold text-accent">
        {kind}
      </span>
      <p className="text-[15px] font-semibold leading-snug text-foreground">{pattern.pattern_text}</p>
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Something I have noticed{evidence > 0 ? ` across ${evidence} signal${evidence === 1 ? '' : 's'}` : ''}, not a fact you have confirmed. The more we see it, the more sure I get.
      </p>
    </div>
  );
}

export default function MemoryCenter() {
  const navigate = useNavigate();
  const { isMobile } = useDevice();
  const { stats, facts, patterns, isLoading, refresh, verifyFact: verifyMemoryFact } = useMemoryWeb();
  const { edges, strengthenFact, fixFact } = useMemoryEdges();
  const {
    isFlowOpen,
    pendingFacts,
    unverifiedCount,
    verifiedRate,
    openFlow,
    closeFlow,
    verifyFact,
    rejectFact,
    quickVerify,
    refreshPending,
  } = useVerificationFlow();
  const [activeTab, setActiveTab] = useState('brain');
  const [selectedMemory, setSelectedMemory] = useState<UserMemoryFact | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  // The selected bond for the centred brain canvas (desktop rail / mobile sheet).
  const [selectedBond, setSelectedBond] = useState<MemoryBond | null>(null);
  // The selected pattern (strength / blind spot / style) - its own lightweight read.
  const [selectedPattern, setSelectedPattern] = useState<UserPattern | null>(null);
  const { triggerImport, isImporting, fileInputProps } = useMarkdownImport();
  const { artifacts: libraryArtifacts } = useGeneratedArtifacts();

  const handleEditMemory = (memory: UserMemoryFact) => {
    setSelectedMemory(memory);
    setIsDetailOpen(true);
  };

  const handleBondSelect = useCallback((b: GraphBond | null) => {
    setSelectedBond(b ? toMemoryBond(b) : null);
    if (b) { setSelectedPattern(null); haptics.light(); }
  }, []);

  const handlePatternSelect = useCallback((p: UserPattern | null) => {
    setSelectedPattern(p);
    if (p) { setSelectedBond(null); haptics.light(); }
  }, []);

  const clearSelection = useCallback(() => { setSelectedBond(null); setSelectedPattern(null); }, []);

  // Confirm = verify the underlying fact. The canvas reflects the new
  // confirmed state on the next refresh.
  const handleConfirmBond = useCallback(async (factId: string) => {
    await verifyMemoryFact(factId);
    setSelectedBond((prev) => (prev ? { ...prev, confirmed: true } : prev));
  }, [verifyMemoryFact]);

  // Strengthen = the leader vouches (strengthen_memory_fact RPC: confidence up,
  // marked verified). Fix = the leader flags it wrong (fix_memory_fact RPC:
  // disputed + dropped + edges deactivated, and the dispute feeds the
  // correction loop so it is never re-inferred). Both were disabled buttons
  // with a complete backend behind them until now.
  const handleStrengthenBond = useCallback(async (factId: string) => {
    await strengthenFact(factId);
    await refresh();
    setSelectedBond((prev) => (prev ? { ...prev, confirmed: true } : prev));
  }, [strengthenFact, refresh]);

  const handleFixBond = useCallback(async (factId: string) => {
    await fixFact(factId);
    await refresh();
    // The fact left the current set; close its reader instead of showing a ghost.
    setSelectedBond(null);
  }, [fixFact, refresh]);

  // The gentle verify nudge: only shown when there is something to verify, and
  // the number is capped so it reads as a quiet invitation, never a guilt-list.
  const showVerifyNudge = !isLoading && facts.length > 0 && unverifiedCount > 0;
  const verifyN = Math.min(unverifiedCount, VERIFY_NUDGE_CAP);

  // The calm quiet meta line + the single gentle verify nudge (the mock's
  // .meta-line). Stats live small here; nothing shouts. Hidden in cold + loading.
  const metaLine =
    !isLoading && facts.length > 0 ? (
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span className="h-[5px] w-[5px] rounded-full bg-accent shadow-[0_0_8px_hsl(var(--accent))]" />
          {facts.length} {facts.length === 1 ? 'thing' : 'things'} I know
        </span>
        <span className="h-3 w-px bg-border" aria-hidden />
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span className="h-[5px] w-[5px] rounded-full bg-muted-foreground/60" />
          {stats?.verified_count ?? 0} confirmed by you
        </span>
        {showVerifyNudge && (
          <button
            type="button"
            onClick={openFlow}
            className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.07] px-2.5 py-1.5 text-[11.5px] text-foreground transition-colors hover:bg-accent/[0.12]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_hsl(var(--accent))]" />
            <span>
              Verify <b className="font-[650] text-accent">{verifyN}</b> while you&apos;re here
            </span>
          </button>
        )}
        <ContextFileButton variant="pill" />
      </div>
    ) : null;

  // The reader for the selected node (a confirmed-fact bond, or the lightweight
  // read for a strength / blind spot / style pattern). Shared by the desktop rail
  // and the mobile inline panel.
  const reader = selectedPattern ? (
    <PatternRead pattern={selectedPattern} />
  ) : selectedBond ? (
    <BondReader
      bond={selectedBond}
      variant={isMobile ? 'sheet' : 'rail'}
      onConfirm={handleConfirmBond}
      onStrengthen={handleStrengthenBond}
      onFix={handleFixBond}
    />
  ) : null;

  // The Brain tab body: the centred canvas + the node reader. Desktop slides the
  // reader in as a right rail (it has the width to spare). Mobile opens it as a
  // bottom DRAWER that slides up OVER the canvas, so the brain graph keeps its
  // full size instead of being squashed into the top half (the inline panel used
  // to steal ~44% of the height and cram the visual).
  const brainBody = (
    <div className="flex h-full min-h-0 flex-col gap-3 md:flex-row">
      <div className="relative min-h-0 min-w-0 flex-1">
        <BrainCanvas
          facts={facts}
          patterns={patterns}
          edges={edges}
          loading={isLoading}
          selectedFactId={selectedBond?.id ?? null}
          onBondSelect={handleBondSelect}
          onPatternSelect={handlePatternSelect}
          onAdd={() => setIsAddOpen(true)}
          isMobile={isMobile}
        />
      </div>

      {/* Desktop right-rail reader: collapsed until a node is selected so the
          centred graph fills the canvas by default; slides in only on selection. */}
      <AnimatePresence initial={false}>
        {!isMobile && (selectedBond || selectedPattern) && (
          <motion.div
            key="bond-rail"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="hidden flex-shrink-0 overflow-hidden md:flex"
          >
            <div className="scrollbar-hide relative flex w-[300px] flex-shrink-0 overflow-y-auto rounded-2xl border border-border/60 bg-card/40 p-4">
              <button
                type="button"
                onClick={clearSelection}
                aria-label="Close"
                className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              {reader}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // Mobile node reader as a bottom drawer: slides up over the brain (the graph
  // stays full-size behind it), drag-down or tap-away to dismiss. Rendered
  // outside brainBody so it overlays the whole surface, not the canvas column.
  const mobileBondDrawer = (
    <Drawer
      open={isMobile && !!(selectedBond || selectedPattern)}
      onOpenChange={(open) => { if (!open) clearSelection(); }}
    >
      <DrawerContent className="border-border bg-[linear-gradient(180deg,#0d1219,#0a0e12)] md:hidden">
        <DrawerTitle className="sr-only">Reading a connection</DrawerTitle>
        <div className="scrollbar-hide max-h-[64vh] overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-3">
          {reader}
        </div>
      </DrawerContent>
    </Drawer>
  );

  const content = (
    <MemoryErrorBoundary>
      {/* Hidden file input for markdown import */}
      <input {...fileInputProps} />
      <div className="flex min-h-0 flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {/* quiet, secondary facets (the mock's .facets) */}
          <TabsList className="h-auto flex-shrink-0 justify-start gap-1 bg-transparent p-0">
            {[
              { v: 'brain', label: 'Graph' },
              { v: 'memories', label: 'All facts' },
              { v: 'library', label: `Library${libraryArtifacts.length > 0 ? ` (${libraryArtifacts.length})` : ''}` },
              { v: 'privacy', label: 'Privacy' },
              { v: 'data', label: 'Data' },
            ].map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-[550] text-muted-foreground data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="brain" className="mt-3 min-h-0 flex-1 overflow-hidden">
            {brainBody}
          </TabsContent>

          <TabsContent value="memories" className="scrollbar-hide mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <MemoryList
              onEditMemory={handleEditMemory}
              onAddMemory={() => setIsAddOpen(true)}
              onQuickVerify={quickVerify}
            />
          </TabsContent>

          <TabsContent value="library" className="scrollbar-hide mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <LibraryTab />
          </TabsContent>

          <TabsContent value="privacy" className="scrollbar-hide mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <PrivacyControlsPanel />
          </TabsContent>

          <TabsContent value="data" className="scrollbar-hide mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <ExportImportPanel />
          </TabsContent>
        </Tabs>
      </div>

      {mobileBondDrawer}

      <MemoryDetailSheet
        memory={selectedMemory}
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedMemory(null); }}
      />

      <AddMemorySheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />

      <AnimatePresence>
        {isFlowOpen && (
          <VerificationSwipeStack
            facts={pendingFacts}
            onVerify={verifyFact}
            onReject={rejectFact}
            onDismiss={closeFlow}
            onComplete={closeFlow}
            unverifiedCount={unverifiedCount}
            verifiedRate={verifiedRate}
            onContinue={refreshPending}
          />
        )}
      </AnimatePresence>
    </MemoryErrorBoundary>
  );

  if (!isMobile) {
    return (
      <DesktopShell
        eyebrow="Brain"
        title="Your Digital Brain"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => navigate('/context')}
              size="sm"
              className="border-0 bg-accent/10 text-accent hover:bg-accent/20"
            >
              <ArrowUpRight className="mr-1 h-4 w-4" />
              Export to AI
            </Button>
            <Button
              variant="outline"
              onClick={triggerImport}
              disabled={isImporting}
              size="sm"
              className="border-0 bg-secondary/50"
            >
              <FileText className="mr-1 h-4 w-4" />
              {isImporting ? 'Importing...' : 'Import'}
            </Button>
            <Button onClick={() => setIsAddOpen(true)} size="sm" className="border-0">
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </>
        }
      >
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
          {metaLine && <div className="mb-3 flex-shrink-0">{metaLine}</div>}
          {content}
        </div>
      </DesktopShell>
    );
  }

  return (
    <MobileFrame
      onAdd={() => setIsAddOpen(true)}
      onExport={() => navigate('/context')}
      padding="px-4 pt-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))]"
      banner={
        <div className="flex flex-shrink-0 flex-col gap-1.5 px-5 pb-2 pt-1">
          <h1 className="text-[17px] font-bold tracking-tight text-foreground">Your Digital Brain</h1>
          {metaLine && <div>{metaLine}</div>}
        </div>
      }
    >
      {content}
    </MobileFrame>
  );
}
