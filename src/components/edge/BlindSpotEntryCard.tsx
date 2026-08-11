import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Eye } from 'lucide-react';

/** One quiet doorway from the full leadership read into the reflection loop. */
export function BlindSpotEntryCard() {
  const navigate = useNavigate();

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      onClick={() => navigate('/blind-spot')}
      className="flex w-full items-center gap-3 rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-500/[0.07] via-card to-orange-400/[0.03] p-4 text-left transition-colors hover:border-rose-400/35"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-400/10">
        <Eye className="h-4 w-4 text-rose-300" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">Look for one blind spot</span>
        <span className="mt-1 block text-xs leading-snug text-muted-foreground">
          One tentative reflection, grounded in what keeps recurring. Nothing is saved unless you confirm it.
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </motion.button>
  );
}
