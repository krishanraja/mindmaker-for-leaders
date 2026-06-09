import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';
import type { GettingSmarterDelta } from '@/types/memory';

interface Props {
  delta: GettingSmarterDelta | null;
}

export function GettingSmarterBanner({ delta }: Props) {
  if (!delta || (delta.new_facts === 0 && delta.new_patterns === 0 && delta.new_decisions === 0)) {
    return null;
  }

  const parts: string[] = [];
  if (delta.new_facts > 0) parts.push(`${delta.new_facts} new fact${delta.new_facts > 1 ? 's' : ''}`);
  if (delta.new_patterns > 0) parts.push(`${delta.new_patterns} new pattern${delta.new_patterns > 1 ? 's' : ''}`);
  if (delta.new_decisions > 0) parts.push(`${delta.new_decisions} new decision${delta.new_decisions > 1 ? 's' : ''}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/5 border border-accent/10"
    >
      <Brain className="h-4 w-4 text-accent flex-shrink-0" />
      <p className="text-xs text-foreground">
        <span className="font-medium">Getting smarter:</span> {parts.join(', ')} {delta.period}
      </p>
    </motion.div>
  );
}
