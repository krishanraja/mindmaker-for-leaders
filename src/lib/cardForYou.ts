/**
 * cardForYou - the honest, deterministic "how this applies to you" line for a
 * news card's read overlay, plus the weigh-it prefill that turns a story into
 * a decision worth pressure-testing.
 *
 * Composed ONLY from facts the brain already holds (role -> archetype lens,
 * sector) and the category's plain-language meaning - never a fabricated
 * specific. Pure + synchronous so the overlay renders instantly; the seam is
 * shaped so a flagged LLM line can later replace the text without touching
 * the surface.
 */
import { resolveArchetype } from '@/lib/roleArchetype';
import { getNewsCategory, type NewsCategoryId } from '@/types/newsCategory';

export interface ForYouInput {
  role?: string | null;
  sector?: string | null;
  categoryId: NewsCategoryId;
}

// "What it costs to run AI, and when that drops." -> "what it costs to run AI, and when that drops"
function asClause(meaning: string): string {
  const trimmed = meaning.trim().replace(/\.$/, '');
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

export function composeForYouLine({ role, sector, categoryId }: ForYouInput): string {
  const archetype = resolveArchetype(role);
  const category = getNewsCategory(categoryId);
  const where = sector?.trim() ? ` in ${sector.trim()}` : '';
  return `Your seat watches ${archetype.lens}${where}. This story moves ${asClause(category.meaning)}.`;
}

// The story -> decision seam: a starter statement the decision engine can
// decompose. Keeps the leader's language ("we"), leads with the real headline.
export function weighPrefillFor(headline: string): string {
  const clean = headline.trim().replace(/\.$/, '');
  return `Given "${clean}", should we change anything about how we are building with AI right now?`;
}
