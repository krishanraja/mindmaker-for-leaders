import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ArrowRight, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMissions } from '@/hooks/useMissions';
import { motion } from 'framer-motion';

interface PromptSet {
  category_key: string;
  title: string;
  description: string;
  prompts_json: unknown;
  priority_rank: number;
}

// Evolve prompts based on completed missions and progress
function evolvePrompts(
  originalPrompts: PromptSet[],
  completedMissions: number,
  momentum: string
): PromptSet[] {
  if (completedMissions === 0) return originalPrompts;

  return originalPrompts.map((set) => {
    const prompts = Array.isArray(set.prompts_json) ? set.prompts_json : [];

    // Add evolved prompts based on progress
    const evolved = [...prompts];
    if (completedMissions >= 1 && set.category_key === 'strategic_vision') {
      evolved.push(
        "Now that you've completed your first AI mission, ask your team: 'What did we learn about our AI readiness that surprised us?'"
      );
    }
    if (completedMissions >= 3 && momentum === 'accelerating') {
      evolved.push(
        `You're on a streak with ${completedMissions} missions completed. Try: "What's the next level of AI adoption that feels just out of reach? What would make it possible?"`
      );
    }
    if (momentum === 'slowing') {
      evolved.push(
        "Progress has slowed. Consider asking: 'What's the one thing blocking our AI progress that nobody is talking about?'"
      );
    }

    return {
      ...set,
      prompts_json: evolved,
    };
  });
}

export function AdaptivePrompts() {
  const { user } = useAuth();
  const { stats } = useMissions();
  const [promptSets, setPromptSets] = useState<PromptSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrompts = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Get the latest assessment
        const { data: assessment } = await supabase
          .from('leader_assessments')
          .select('id')
          .eq('leader_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!assessment) {
          setLoading(false);
          return;
        }

        // Get prompt sets
        const { data: prompts } = await supabase
          .from('leader_prompt_sets')
          .select('category_key, title, description, prompts_json, priority_rank')
          .eq('assessment_id', assessment.id)
          .order('priority_rank');

        if (prompts) {
          const evolved = evolvePrompts(
            prompts as PromptSet[],
            stats.completedCount,
            stats.momentum
          );
          setPromptSets(evolved);
        }
      } catch (err) {
        console.error('Error fetching prompts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrompts();
  }, [user?.id, stats.completedCount, stats.momentum]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedIdx(key);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (loading) {
    return (
      <Card className="border rounded-2xl">
        <CardContent className="p-4">
          <div className="h-20 bg-secondary rounded-xl skeleton-shimmer" />
        </CardContent>
      </Card>
    );
  }

  if (promptSets.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="border rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              Evolved Prompts
            </h3>
            {stats.completedCount > 0 && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                Adapted to your progress
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            These prompts evolve based on your completed missions and momentum.
          </p>

          <div className="space-y-4">
            {promptSets.slice(0, 3).map((set, setIdx) => {
              const prompts = Array.isArray(set.prompts_json) ? set.prompts_json : [];
              return (
                <div key={setIdx}>
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    {set.title}
                  </h4>
                  <div className="space-y-2">
                    {prompts.slice(0, 3).map((prompt: unknown, pIdx: number) => {
                      const promptObj = (typeof prompt === 'object' && prompt !== null ? prompt : {}) as { text?: string; prompt?: string };
                      const text = typeof prompt === 'string' ? prompt : promptObj.text || promptObj.prompt || '';
                      const key = `${setIdx}-${pIdx}`;
                      const isNew = pIdx >= prompts.length - 1 && stats.completedCount > 0;
                      return (
                        <div
                          key={key}
                          className="flex items-start gap-2 p-2 rounded-lg bg-secondary/30 border border-border/50 group"
                        >
                          <div className="flex-1">
                            <p className="text-xs text-foreground font-mono leading-relaxed">
                              {text}
                            </p>
                            {isNew && (
                              <Badge variant="outline" className="text-[10px] mt-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                New
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(text, key)}
                            className="shrink-0 h-7 w-7 p-0 opacity-60 hover:opacity-100"
                          >
                            {copiedIdx === key ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
