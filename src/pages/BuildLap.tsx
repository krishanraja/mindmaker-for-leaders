import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Lightbulb,
  Wand2,
  Download,
  Loader2,
  CheckCircle2,
  Package,
  FileText,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { CtrlLogo } from '@/components/landing/CtrlLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSkillExport } from '@/hooks/useSkillExport';

const EXAMPLES = [
  'Every Monday I pull last week numbers from Stripe and write a summary for my team.',
  'When a new lead comes in, I research their company and draft a personalized intro email.',
  'I turn messy meeting notes into clear action items and assign owners.',
];

const ROUTED_COPY: Record<string, string> = {
  custom_instruction: 'This works better as a standing instruction than a packaged kit.',
  memory_fact: 'This reads more like a fact about you to remember than a repeatable workflow.',
  saved_style: 'This is really a style or tone to save and reuse.',
};

/**
 * The free, anonymous build lap. A logged-out visitor describes a repetitive
 * workflow and gets a real kit (ZIP) with no account. The win lands first; we
 * offer to save it (upgrade the anonymous session) only at delivery.
 */
export default function BuildLap() {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, isAnonymous, hasSession, createAnonymousSession } = useAuth();
  const {
    isGenerating,
    error,
    triageResult,
    skillData,
    zipFilename,
    generateSkill,
    downloadZip,
    reset,
  } = useSkillExport('free-skill-export');

  const [transcript, setTranscript] = useState('');
  const anonStarted = useRef(false);

  // Ensure a session (anonymous is fine) so the kit can be saved and the build
  // call is attributable for the soft cap. Never blocks the page.
  useEffect(() => {
    if (isLoading || hasSession || isAuthenticated || anonStarted.current) return;
    anonStarted.current = true;
    createAnonymousSession().catch(() => {
      anonStarted.current = false;
    });
  }, [isLoading, hasSession, isAuthenticated, createAnonymousSession]);

  const phase: 'capture' | 'building' | 'result' = isGenerating
    ? 'building'
    : skillData || triageResult
      ? 'result'
      : 'capture';

  const build = () => {
    if (transcript.trim().length < 20) {
      toast.error('Add a little more detail (a sentence or two).');
      return;
    }
    generateSkill(transcript.trim());
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between px-5 py-4 border-b border-border">
        <button onClick={() => navigate('/')} className="flex items-center gap-2" aria-label="Home">
          <CtrlLogo className="h-4 w-auto" />
        </button>
        <button
          onClick={() => navigate('/auth')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign in
        </button>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-5 py-8 sm:py-14">
        <AnimatePresence mode="wait">
          {phase === 'capture' && (
            <motion.div
              key="capture"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                  <Star className="h-3.5 w-3.5" />
                  Free, no account needed
                </div>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                  Build your first AI kit
                </h1>
                <p className="text-muted-foreground">
                  Describe one repetitive task you do. CTRL turns it into a ready-to-use kit you
                  can drop straight into your AI assistant. You get the download in under a minute.
                </p>
              </div>

              <div className="space-y-3">
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Describe a repetitive task, step by step..."
                  className="min-h-[140px] resize-none text-base"
                  aria-label="Describe your workflow"
                />
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTranscript(ex)}
                      className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors text-left"
                    >
                      {ex.length > 48 ? `${ex.slice(0, 48)}...` : ex}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={build}
                  disabled={transcript.trim().length < 20}
                  size="lg"
                  className="w-full"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Build my kit
                </Button>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </motion.div>
          )}

          {phase === 'building' && (
            <motion.div
              key="building"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center space-y-4"
            >
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-muted-foreground">Building your kit...</p>
            </motion.div>
          )}

          {phase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {error && (
                <div className="space-y-3 text-center py-10">
                  <p className="text-destructive">{error}</p>
                  <Button variant="outline" onClick={reset}>
                    Try again
                  </Button>
                </div>
              )}

              {!error && triageResult && !triageResult.passed && (
                <div className="rounded-2xl border border-border bg-card p-6 space-y-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    {ROUTED_COPY[triageResult.result] ?? 'This is better saved another way.'}
                  </p>
                  {triageResult.reasoning && (
                    <p className="text-sm text-foreground">{triageResult.reasoning}</p>
                  )}
                  <Button variant="outline" onClick={reset}>
                    Try a different task
                  </Button>
                </div>
              )}

              {!error && skillData && (
                <>
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-1.5 text-accent">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-medium">Your kit is ready</span>
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight">{skillData.name}</h2>
                    <p className="text-muted-foreground">{skillData.description}</p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      What is inside
                    </p>
                    <ul className="space-y-2 text-sm">
                      <KitLine icon={<FileText className="h-4 w-4" />} label="SKILL.md (the instructions your assistant follows)" />
                      {(skillData.references?.length ?? 0) > 0 && (
                        <KitLine
                          icon={<Package className="h-4 w-4" />}
                          label={`${skillData.references.length} reference file${skillData.references.length === 1 ? '' : 's'}`}
                        />
                      )}
                      {(skillData.test_prompts?.length ?? 0) > 0 && (
                        <KitLine
                          icon={<Lightbulb className="h-4 w-4" />}
                          label={`${skillData.test_prompts.length} test prompt${skillData.test_prompts.length === 1 ? '' : 's'} to try it`}
                        />
                      )}
                    </ul>
                    <Button onClick={downloadZip} size="lg" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download {zipFilename ?? 'kit'}
                    </Button>
                  </div>

                  {isAuthenticated && !isAnonymous ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" className="flex-1" onClick={reset}>
                        Build another
                      </Button>
                      <Button className="flex-1" onClick={() => navigate('/dashboard')}>
                        Open dashboard
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  ) : (
                    <SaveAccountCard onBuildAnother={reset} />
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function KitLine({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-2.5 text-foreground">
      <span className="text-accent">{icon}</span>
      {label}
    </li>
  );
}

/**
 * Account creation at delivery: upgrades the anonymous session in place so the
 * kit and any history are preserved. Optional; the user already has their kit.
 */
function SaveAccountCard({ onBuildAnother }: { onBuildAnother: () => void }) {
  const navigate = useNavigate();
  const { upgradeAnonymousSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!email.trim() || password.length < 6) {
      toast.error('Enter an email and a password of at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      const result = await upgradeAnonymousSession(email.trim(), password);
      if (result.success) {
        toast.success('Saved. Your kit and progress are now yours to keep.');
        navigate('/dashboard');
      } else {
        toast.error(result.error ?? 'Could not create the account. Try again.');
      }
    } catch {
      toast.error('Could not create the account. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold">Save this and keep building</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Create a free account to keep your kit, build more, and track what you are working toward.
      </p>
      <div className="space-y-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          aria-label="Email"
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
          placeholder="Create a password"
          aria-label="Password"
        />
        <Button onClick={save} disabled={saving} size="lg" className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save my kit
        </Button>
      </div>
      <button
        onClick={onBuildAnother}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Not now, build another
      </button>
    </div>
  );
}
