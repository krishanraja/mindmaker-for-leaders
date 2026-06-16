import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Plus, Shield, Download, ArrowUpRight, FileText, CheckCircle2, Flame, Thermometer, Layers, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { MemoryErrorBoundary } from '@/components/memory/MemoryErrorBoundary';
import { MemoryList } from '@/components/memory/MemoryList';
import { MemoryDetailSheet } from '@/components/memory/MemoryDetailSheet';
import { AddMemorySheet } from '@/components/memory/AddMemorySheet';
import { PrivacyControlsPanel } from '@/components/memory/PrivacyControlsPanel';
import { ExportImportPanel } from '@/components/memory/ExportImportPanel';
import { VerificationBanner } from '@/components/memory/VerificationBanner';
import { VerificationSwipeStack } from '@/components/memory/VerificationSwipeStack';
import { LibraryTab } from '@/components/library/LibraryTab';
import { useGeneratedArtifacts } from '@/hooks/useGeneratedArtifacts';
import { useDevice } from '@/hooks/useDevice';
import { useMemoryWeb } from '@/hooks/useMemoryWeb';
import { useMarkdownImport } from '@/hooks/useMarkdownImport';
import { useVerificationFlow } from '@/hooks/useVerificationFlow';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { BottomNav } from '@/components/memory-web/BottomNav';
import { AppHeader } from '@/components/memory-web/AppHeader';
import { MemoryWebVisualization, type MemoryBond } from '@/components/memory-web/MemoryWebVisualization';
import { BondReader } from '@/components/memory-web/BondReader';
import { showThermometer } from '@/lib/memorySignals';
import type { UserMemoryFact } from '@/types/memory';

export default function MemoryCenter() {
  const navigate = useNavigate();
  const { isMobile } = useDevice();
  const { stats, facts, verifyFact: verifyMemoryFact } = useMemoryWeb();
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
  // The selected bond for the four-world brain canvas (mobile sheet reader).
  const [selectedBond, setSelectedBond] = useState<MemoryBond | null>(null);
  const { triggerImport, isImporting, fileInputProps } = useMarkdownImport();
  const { artifacts: libraryArtifacts } = useGeneratedArtifacts();

  const handleEditMemory = (memory: UserMemoryFact) => {
    setSelectedMemory(memory);
    setIsDetailOpen(true);
  };

  // Confirm = the one real backend action (verify the underlying fact). The
  // canvas reflects the new confirmed state on the next refresh.
  const handleConfirmBond = useCallback(async (factId: string) => {
    await verifyMemoryFact(factId);
    setSelectedBond((prev) => (prev ? { ...prev, confirmed: true } : prev));
  }, [verifyMemoryFact]);

  const content = (
    <MemoryErrorBoundary>
      {/* Hidden file input for markdown import */}
      <input {...fileInputProps} />
      <div className="flex-1 min-h-0 flex flex-col space-y-2">
        {/* Verification banner */}
        {unverifiedCount > 0 && (
          <VerificationBanner
            unverifiedCount={unverifiedCount}
            verifiedRate={verifiedRate}
            onStartVerification={openFlow}
          />
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 min-h-0 flex flex-col overflow-hidden"
        >
          <TabsList className="h-9 flex-shrink-0">
            <TabsTrigger value="brain" className="text-xs px-3">
              <Network className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
              Brain
            </TabsTrigger>
            <TabsTrigger value="memories" className="text-xs px-3">
              <Brain className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
              All Facts
            </TabsTrigger>
            <TabsTrigger value="library" className="text-xs px-3">
              <Layers className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
              Library
              {libraryArtifacts.length > 0 && (
                <span className="ml-1 text-muted-foreground">
                  ({libraryArtifacts.length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="privacy" className="text-xs px-3">
              <Shield className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="data" className="text-xs px-3">
              <Download className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
              Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brain" className="mt-2 flex-1 min-h-0 overflow-hidden">
            {/* The four-world walked canvas. On desktop the bond reader is a
                right rail (matching the mock); on mobile a bottom sheet opens
                on tap. Never a blank slate (falls back to empty-state). */}
            <div className="h-full min-h-0 flex gap-3">
              <div className="flex-1 min-w-0 min-h-0 rounded-2xl border border-border/60 bg-card/40 overflow-hidden relative">
                <MemoryWebVisualization
                  facts={facts}
                  showEmptyState={facts.length === 0}
                  onBondSelect={setSelectedBond}
                  selectedFactId={selectedBond?.id ?? null}
                />
                {facts.length > 0 && (
                  <p className="absolute top-2.5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/70 pointer-events-none">
                    {isMobile ? 'Tap a node to read its bond' : 'Click a node to read its bond'}
                  </p>
                )}
              </div>
              {/* Desktop right-rail bond reader (the mock's signature panel). */}
              {!isMobile && (
                <div className="hidden md:flex w-[300px] flex-shrink-0 rounded-2xl border border-border/60 bg-card/40 p-4 overflow-y-auto scrollbar-hide">
                  <BondReader
                    bond={selectedBond}
                    variant="rail"
                    onConfirm={handleConfirmBond}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="memories" className="mt-2 flex-1 overflow-y-auto scrollbar-hide overscroll-contain min-h-0">
            <MemoryList
              onEditMemory={handleEditMemory}
              onAddMemory={() => setIsAddOpen(true)}
              onQuickVerify={quickVerify}
            />
          </TabsContent>

          <TabsContent value="library" className="mt-2 flex-1 overflow-y-auto scrollbar-hide overscroll-contain min-h-0">
            <LibraryTab />
          </TabsContent>

          <TabsContent value="privacy" className="mt-2 flex-1 overflow-y-auto scrollbar-hide overscroll-contain min-h-0">
            <PrivacyControlsPanel />
          </TabsContent>

          <TabsContent value="data" className="mt-2 flex-1 overflow-y-auto scrollbar-hide overscroll-contain min-h-0">
            <ExportImportPanel />
          </TabsContent>
        </Tabs>
      </div>

      <MemoryDetailSheet
        memory={selectedMemory}
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedMemory(null); }}
      />

      <AddMemorySheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

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

      {/* Bond reader sheet (mobile only - desktop uses the right rail). Opens
          when a node in the Brain canvas is tapped. Confirm is the one real
          action (verify); Strengthen/Fix render honest but disabled. */}
      <Sheet
        open={isMobile && !!selectedBond}
        onOpenChange={(open) => { if (!open) setSelectedBond(null); }}
      >
        <SheetContent side="bottom" className="rounded-t-2xl border-border bg-background max-h-[80vh]">
          <BondReader
            bond={selectedBond}
            variant="sheet"
            onConfirm={handleConfirmBond}
          />
        </SheetContent>
      </Sheet>
    </MemoryErrorBoundary>
  );

  if (!isMobile) {
    return (
      <DesktopShell
        eyebrow="Memory"
        title="Memory Browser"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => navigate('/context')}
              size="sm"
              className="border-0 bg-accent/10 text-accent hover:bg-accent/20"
            >
              <ArrowUpRight className="h-4 w-4 mr-1" />
              Export to AI
            </Button>
            <Button
              variant="outline"
              onClick={triggerImport}
              disabled={isImporting}
              size="sm"
              className="border-0 bg-secondary/50"
            >
              <FileText className="h-4 w-4 mr-1" />
              {isImporting ? 'Importing...' : 'Import'}
            </Button>
            <Button onClick={() => setIsAddOpen(true)} size="sm" className="border-0">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </>
        }
      >
        <div className="max-w-4xl w-full mx-auto flex-1 min-h-0 flex flex-col">
          <p className="text-xs text-muted-foreground mb-3 flex-shrink-0">
            Everything your AI knows about you
          </p>
          {stats && (
            <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-xs font-medium">
                <Brain className="h-3 w-3" />
                {stats.total_facts} facts
              </span>
              <motion.button
                onClick={openFlow}
                whileTap={{ scale: 0.95 }}
                animate={stats.verified_rate === 0 ? { opacity: [1, 0.7, 1] } : undefined}
                transition={stats.verified_rate === 0 ? { repeat: Infinity, duration: 2 } : undefined}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-medium cursor-pointer hover:bg-emerald-500/20 transition-colors"
              >
                <CheckCircle2 className="h-3 w-3" />
                {stats.verified_rate}% verified
              </motion.button>
              {showThermometer(facts, stats) && (
                <>
                  {(stats.temperature_distribution?.hot || 0) > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-500 text-xs font-medium">
                      <Flame className="h-3 w-3" />
                      {stats.temperature_distribution.hot} hot
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-medium">
                    <Thermometer className="h-3 w-3" />
                    {stats.temperature_distribution?.warm || 0} warm
                  </span>
                </>
              )}
            </div>
          )}
          {content}
        </div>
      </DesktopShell>
    );
  }

  return (
    <div className="h-screen-safe overflow-hidden flex flex-col bg-background">
      <AppHeader
        onAdd={() => setIsAddOpen(true)}
        onExport={() => navigate('/context')}
      />

      <div className="flex-shrink-0 px-5 pt-1 pb-0.5">
        <p className="text-[11px] text-muted-foreground/80 leading-tight">
          Browse and edit every fact CTRL knows about you.
        </p>
      </div>

      {stats && (
        <div className="flex-shrink-0 px-5 pb-1.5">
          <p className="text-[11px] text-muted-foreground leading-tight">
            <span className="text-accent font-medium">{stats.total_facts} facts</span>
            {' · '}
            <motion.button
              onClick={openFlow}
              whileTap={{ scale: 0.95 }}
              animate={stats.verified_rate === 0 ? { opacity: [1, 0.7, 1] } : undefined}
              transition={stats.verified_rate === 0 ? { repeat: Infinity, duration: 2 } : undefined}
              className="text-emerald-500 font-medium hover:underline"
            >
              {stats.verified_rate}% verified
            </motion.button>
            {showThermometer(facts, stats) && (
              <>
                {(stats.temperature_distribution?.hot || 0) > 0 && (
                  <>
                    {' · '}
                    <span className="text-orange-500 font-medium">{stats.temperature_distribution.hot} hot</span>
                  </>
                )}
                {' · '}
                <span className="text-amber-500 font-medium">{stats.temperature_distribution?.warm || 0} warm</span>
              </>
            )}
          </p>
        </div>
      )}

      <main className="flex-1 min-h-0 overflow-hidden px-4 pt-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] flex flex-col">
        {content}
      </main>

      <BottomNav />
    </div>
  );
}
