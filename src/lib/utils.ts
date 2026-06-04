import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Cap a dynamic, unpredictable-length label before it feeds a large heading.
 *
 * Dynamic strings (skill labels, decision titles) can run arbitrarily long and
 * blow a balanced headline out to several ragged lines. Trim to a word boundary
 * under `max` and append an ellipsis. Pair with `text-balance` on the heading so
 * the remaining text still wraps cleanly. Returns the input untouched when short.
 */
export function capLabel(s: string, max = 48): string {
  const trimmed = s.trim()
  if (trimmed.length <= max) return trimmed
  const slice = trimmed.slice(0, max)
  const lastSpace = slice.lastIndexOf(" ")
  const head = (lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).replace(/[\s.,;:]+$/, "")
  return `${head}…`
}
