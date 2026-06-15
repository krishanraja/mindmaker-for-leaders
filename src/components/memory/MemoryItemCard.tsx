/**
 * MemoryItemCard Component
 * 
 * Displays a single memory item with quick actions.
 * Mobile-first design with touch-friendly targets.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, Check, AlertCircle, User, Building, Target, AlertTriangle, Settings, Zap, Anchor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { haptics } from '@/lib/haptics';
import { IMPORTANCE_HOT_TIER, type UserMemoryFact, type FactCategory } from '@/types/memory';
import type { SkillSeed } from '@/types/skill';

interface MemoryItemCardProps {
  memory: UserMemoryFact;
  onEdit: (memory: UserMemoryFact) => void;
  onDelete: (id: string) => void;
  onQuickVerify?: (id: string) => void;
  isDeleting?: boolean;
  /** false renders at final state (no entrance fade) for the QC harness / static capture. */
  animated?: boolean;
}

const categoryIcons: Record<FactCategory, React.ElementType> = {
  identity: User,
  business: Building,
  objective: Target,
  blocker: AlertTriangle,
  preference: Settings,
};

const categoryColors: Record<FactCategory, string> = {
  identity: 'bg-blue-500/10 text-blue-600',
  business: 'bg-purple-500/10 text-purple-600',
  objective: 'bg-green-500/10 text-green-600',
  blocker: 'bg-orange-500/10 text-orange-600',
  preference: 'bg-gray-500/10 text-gray-600',
};

const verificationBadges: Record<string, { label: string; className: string }> = {
  verified: { label: 'Verified', className: 'bg-green-500/10 text-green-600' },
  corrected: { label: 'Corrected', className: 'bg-blue-500/10 text-blue-600' },
  inferred: { label: 'Inferred', className: 'bg-yellow-500/10 text-yellow-600' },
  rejected: { label: 'Rejected', className: 'bg-red-500/10 text-red-600' },
};

export const MemoryItemCard: React.FC<MemoryItemCardProps> = ({
  memory,
  onEdit,
  onDelete,
  onQuickVerify,
  isDeleting = false,
  animated = true,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const navigate = useNavigate();

  const handleQuickVerify = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onQuickVerify || isVerifying) return;
    setIsVerifying(true);
    setShowFlash(true);
    const result = await onQuickVerify(memory.id);
    setIsVerifying(false);
    setTimeout(() => setShowFlash(false), 600);
  };

  // For declared blockers, surface a one-tap path into the Skill Builder
  // pre-anchored to this specific pain. Only blockers - objectives/preferences
  // are different shapes (aspirations, settings) that don't translate to a
  // weekly procedure as cleanly.
  const isBlocker = memory.fact_category === 'blocker';
  const handleAutomate = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.light();
    const seed: SkillSeed = {
      kind: 'blocker',
      text: memory.fact_value,
      fact_id: memory.id,
      label: memory.fact_label,
    };
    navigate('/context', { state: { seed } });
  };

  const CategoryIcon = categoryIcons[memory.fact_category] || User;
  const categoryColor = categoryColors[memory.fact_category] || categoryColors.identity;
  const verificationBadge = verificationBadges[memory.verification_status] || verificationBadges.inferred;
  // Hot-tier facts: the brain always keeps these loaded in the model's context.
  // Behavioural claim ("kept in context"), never a truth claim ("this is important")
  // - importance is mostly a day-1 estimate until an outcome sharpens it.
  const isCoreContext = (memory.importance ?? 0) >= IMPORTANCE_HOT_TIER;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <motion.div
      layout
      initial={animated ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: isDeleting ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "bg-card border border-border rounded-2xl p-4 relative overflow-hidden",
        "hover:shadow-md transition-shadow duration-200",
        isDeleting && "pointer-events-none"
      )}
    >
      {/* Quick-verify green flash */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-emerald-500 rounded-2xl pointer-events-none z-10"
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={cn("p-1.5 rounded-lg flex-shrink-0", categoryColor)}>
            <CategoryIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-foreground truncate">
              {memory.fact_label}
            </h3>
            <p className="text-xs text-muted-foreground">
              {formatDate(memory.created_at)}
            </p>
          </div>
        </div>
        
        {/* Quick actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {memory.verification_status === 'inferred' && onQuickVerify && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleQuickVerify}
              disabled={isVerifying}
              className={cn(
                "p-2 rounded-lg min-h-[44px] min-w-[44px]",
                "flex items-center justify-center",
                "hover:bg-emerald-500/10 transition-colors",
                "text-emerald-500 hover:text-emerald-600",
                isVerifying && "opacity-50"
              )}
              aria-label="Quick verify"
            >
              <Check className="w-4 h-4" />
            </motion.button>
          )}
          {isBlocker && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleAutomate}
              className={cn(
                "p-2 rounded-lg min-h-[44px] min-w-[44px]",
                "flex items-center justify-center",
                "hover:bg-amber-500/10 transition-colors",
                "text-amber-500 hover:text-amber-600"
              )}
              aria-label="Automate this pain"
              title="Turn this pain into a Claude skill"
            >
              <Zap className="w-4 h-4" />
            </motion.button>
          )}
          <button
            onClick={() => onEdit(memory)}
            className={cn(
              "p-2 rounded-lg min-h-[44px] min-w-[44px]",
              "flex items-center justify-center",
              "hover:bg-secondary/50 transition-colors",
              "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Edit memory"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(memory.id)}
            disabled={isDeleting}
            className={cn(
              "p-2 rounded-lg min-h-[44px] min-w-[44px]",
              "flex items-center justify-center",
              "hover:bg-destructive/10 transition-colors",
              "text-muted-foreground hover:text-destructive"
            )}
            aria-label="Delete memory"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <p className="text-foreground text-sm line-clamp-2 mb-3">
        {memory.fact_value}
      </p>

      {/* Footer with badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {isCoreContext && (
          <Badge
            variant="secondary"
            className="text-xs bg-accent/10 text-accent"
            title="Core context - the brain keeps this fact loaded in every session"
          >
            <Anchor className="w-3 h-3 mr-1" />
            Core context
          </Badge>
        )}

        <Badge variant="secondary" className={cn("text-xs", verificationBadge.className)}>
          {memory.verification_status === 'verified' && <Check className="w-3 h-3 mr-1" />}
          {verificationBadge.label}
        </Badge>

        <Badge variant="secondary" className="text-xs bg-secondary/50 text-muted-foreground">
          {memory.source_type}
        </Badge>
        
        {memory.confidence_score < 0.7 && (
          <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-600">
            <AlertCircle className="w-3 h-3 mr-1" />
            Low confidence
          </Badge>
        )}
      </div>

      {/* Context snippet if available */}
      {memory.fact_context && (
        <p className="text-xs text-muted-foreground/70 mt-2 italic line-clamp-1">
          "{memory.fact_context}"
        </p>
      )}
    </motion.div>
  );
};

export default MemoryItemCard;
