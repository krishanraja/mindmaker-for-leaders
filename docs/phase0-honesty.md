# Phase 0 · ITEM 4 — Honest Magic (implementation spec)

> **Corpus Law 1 (Honest Magic) + Law 7 (data-realist signals).** Until the learning loop is backed (ITEM 1 fires `touch_memory_fact`, ITEM 2 schedules `memory-lifecycle`/`memory-synthesize`), **no UI may imply learning the backend isn't doing.** This item: (a) remove or guard every vanity/"getting smarter" surface so its signal only moves when the underlying data actually moves; (b) surface the REAL receipts that already exist in the DB but aren't on screen ("why am I seeing this?"); (c) keep the one *honest* onboarding affordance (a new fact "lands hot at the centre") because it is display-only and backed.
>
> Grounded against the live repo `C:/Users/krish/mm-ctrl` (Vite + React 18 + TS + shadcn + Supabase `bkyuxvschuwngtcdhsyg`, DARK theme, prod `ctrl.themindmaker.ai`). Every file/line/function below was read, not guessed. **This is a SPEC. No file in `mm-ctrl` was modified.** Dependencies: this item is *coupled to* ITEM 1 (the `touch_memory_fact` write) and ITEM 2 (the cron) — several guards below flip from "hide" to "show" only after those land. The spec marks each with a **[gated on ITEM 1/2]** tag.

---

## 0. The mechanical truth that governs every decision here

Confirmed by reading the code (not the prior intel doc):

- **`touch_memory_fact` is never called.** Grep across `supabase/functions/**`: the only references to `reference_count`/`last_referenced_at` are *reads* — `memory-lifecycle/index.ts` (lines 49-50, 69, 88, 107, 172) reads them to promote/demote, and `_shared/memory-context-builder.ts` (lines 518, 530) *orders by* `last_referenced_at`. **No write path increments `reference_count` or stamps `last_referenced_at`.** So a fact's `temperature` stays at whatever it was seeded with.
- **`temperature` default.** `useMemoryWeb.ts` line 86 coerces any missing temperature to `'warm'`. The DB default is `warm` (per `_INTELLIGENCE-LAYER.md` §3.2, `user_memory.temperature ... =warm`). So in production **almost every real fact is `warm`**, `hot` is ~always 0 (unless a row was seeded hot), `cold` only appears via the display-only seed ghosts.
- **Consequence:** the **"Y hot" pill is a dead signal** — it can never honestly climb because nothing ever heats a fact through reliance. The temperature *distribution* is therefore not a learning signal today; it is a static reflection of seed defaults. This is the exact "faked green tick / thermometer animating over a dormant engine" the Corpus forbids.
- **`health_score`** (`useMemoryWeb.ts` `calculateHealthScore`, lines 25-40) is a function of counts only: `min(20, facts×2) + verifiedRate×25 + min(20, patterns×4) + min(15, decisions×5) + categories×4`. Since `user_patterns` is empty for real users (synthesize unscheduled) and `user_decisions` rarely written, health_score is effectively `facts-count + verified-rate + category-spread` — i.e. it is **NOT a "getting smarter" measure**; it rises only when you add/verify facts. Labelling it "Memory Health" + animating it as if it self-improves is the dishonest framing, not the number itself.
- **`GettingSmarterDelta`** (`useMemoryWeb.ts` lines 141-150) is `created_at > lastVisit` counts of facts/patterns/decisions. The fact-delta is *real and honest* (you did add N facts). But `new_patterns`/`new_decisions` are **structurally always 0** (engines dormant / no write-back), and the **"Getting smarter:" label overclaims** — it's "you added N facts," not "the system got smarter from your reliance."

---

## 1. Inventory — every vanity / "getting smarter" surface (file → verdict)

Two tiers: **DEAD** (defined + exported from the `memory-web` barrel `src/components/memory-web/index.ts` but **not mounted anywhere** — grep for JSX usage returns only the definition + barrel) and **LIVE** (actually rendered).

| # | Surface | File | Mounted? | Dishonest signal | Verdict |
|---|---|---|---|---|---|
| V1 | `GettingSmarterBanner` — "Getting smarter: N new facts, P patterns, D decisions {period}" | `src/components/memory-web/GettingSmarterBanner.tsx` | **DEAD** (barrel-only) | "Getting smarter" framing; patterns/decisions always 0 | **REMOVE** (delete file + barrel line). If ever revived, see §3 rewrite. |
| V2 | `MemoryPulseBar` — Flame/hot, Circle/warm, Brain/patterns, ListChecks/decisions pills | `src/components/memory-web/MemoryPulseBar.tsx` | **DEAD** (barrel-only) | "hot" count is a dead signal; patterns ~0 | **REMOVE** (delete file + barrel line). |
| V3 | `IntelligencePanel` — `HealthScoreGauge` radial + patterns + active decisions | `src/components/memory-web/IntelligencePanel.tsx` | **DEAD** (not imported by either dashboard) | "Health Score" gauge framed as intelligence; patterns ~0 | **REMOVE** (delete file). |
| V4 | `MemoryHealthViz` — recharts donut of hot/warm/cold + "Health Score" + budget bars | `src/components/memory-web/MemoryHealthViz.tsx` | **DEAD** (barrel-only) | temperature donut implies a live thermal engine | **REMOVE** (delete file + barrel line). |
| V5 | `LearningEngineSheet` — "Learning Engine" mobile sheet: DailyProvocation + `PatternInsight` + "Capability Roadmap" from legacy `dimension_scores` | `src/components/mobile/LearningEngineSheet.tsx` | **DEAD** (no JSX usage; grep clean) | named "Learning Engine"; roadmap reads the *legacy* assessment stack that never bridges into memory | **REMOVE** (delete file). |
| V6 | **LIVE** MemoryCenter stats strip (desktop tab + mobile header) — `"{facts} facts · {verified}% verified · {hot} hot · {warm} warm"` | `src/pages/MemoryCenter.tsx` lines **185-211** (desktop) and **232-256** (mobile) | **LIVE** | the `hot`/`warm` pills (dead temperature signal) | **GUARD** — drop the hot/warm pills until backed; keep facts + verified. **[gated on ITEM 1/2]** |
| V7 | **LIVE** MobileMemoryDashboard animated "Health Score bar" + pulsing `+{delta.new_facts}` | `src/components/memory-web/MobileMemoryDashboard.tsx` lines **410-464** | **LIVE** | gradient bar animating `health_score` as if self-improving; "Brain" glow | **GUARD/RELABEL** — keep the bar but relabel from health/intelligence to a neutral "profile completeness," keep the honest `+N facts` pulse. |
| V8 | **LIVE** DesktopMemoryDashboard header `"Health {n}%"` + per-fact `temperature` pill (`hot`/`warm`) + the inline web "Health" caption | `src/components/memory-web/DesktopMemoryDashboard.tsx` lines **665-669** (header), **60-62 + 142-143** (per-fact temp pill) | **LIVE** | "Health %" labelled as intelligence; per-fact `hot`/`warm` pill on a dead signal | **GUARD/RELABEL** — relabel header to "Profile" (drop "Health"); hide per-fact temperature pill until reference_count moves. **[gated on ITEM 1]** |

### Why "remove" vs "guard"

- **REMOVE (V1-V5):** these are **dead code** that the prior audit listed as live. Deleting them (a) eliminates the risk they get re-mounted in the Phase-1 rebuild and silently relight the faked signal, and (b) shrinks the dead-70% the roadmap says to delete. They carry the worst copy ("Getting smarter," "Learning Engine," "Health Score" gauge). No user sees them today, so removal is zero-regression and pure debt reduction. **One real consumer to migrate:** `MemoryWebStats.health_score` and `GettingSmarterDelta` are still computed in `useMemoryWeb`/`MemoryCenter` for V6-V8 — do **not** delete the types/computation, only the dead components.
- **GUARD (V6-V8):** these are **live and load-bearing UI** — ripping them out would leave a hole in the only "this is your memory" surfaces. The honest move is to (i) strip the parts driven by the **dead temperature signal** (hot/warm), and (ii) **relabel** the parts that overclaim ("Health"/"Intelligence" → "Profile"/"completeness"). After ITEM 1 (touch) + ITEM 2 (lifecycle cron) ship and `reference_count` demonstrably moves, the hot/warm pills come back **guarded behind a real signal** (only render "hot" once any fact has `reference_count > 0`).

---

## 2. The guard pattern (data-realist gate)

Add one shared predicate so "hot is real" is computed once, not re-derived per surface. New file:

`src/lib/memorySignals.ts`
```ts
import type { MemoryWebFact, MemoryWebStats } from '@/types/memory';

/**
 * Law 7 (data-realist): the temperature signal is only honest once the
 * reliance loop is live. A fact is "genuinely hot" only if it has actually
 * been referenced (reference_count > 0) — which only happens after ITEM 1
 * wires touch_memory_fact and ITEM 2 schedules memory-lifecycle. Until any
 * fact has been referenced, the hot/warm thermometer is decorative and must
 * not be shown as a learning signal.
 */
export function temperatureSignalIsLive(facts: MemoryWebFact[]): boolean {
  return facts.some((f) => (f.reference_count ?? 0) > 0);
}

/** Convenience for the stats strip: show hot/warm only when the signal is live. */
export function showThermometer(facts: MemoryWebFact[], stats: MemoryWebStats | null): boolean {
  return !!stats && temperatureSignalIsLive(facts);
}
```

Rationale: `reference_count > 0` is the single mechanical proof that the reliance loop fired. It is false today (cut wire), true after ITEM 1+2. No env flag, no manual toggle — the UI tells the truth automatically as soon as the backend does. This is "the thermometer only moves because reference_count actually moved," made literal.

---

## 3. Line-level changes

### V1-V5 — REMOVE (delete files + barrel exports)

Delete files:
- `src/components/memory-web/GettingSmarterBanner.tsx`
- `src/components/memory-web/MemoryPulseBar.tsx`
- `src/components/memory-web/IntelligencePanel.tsx`
- `src/components/memory-web/MemoryHealthViz.tsx`
- `src/components/mobile/LearningEngineSheet.tsx`

Edit `src/components/memory-web/index.ts` — remove these exports (lines 5-6 and any IntelligencePanel/MemoryHealthViz exports):
```diff
- export { GettingSmarterBanner } from './GettingSmarterBanner';
- export { MemoryPulseBar } from './MemoryPulseBar';
  // (and the IntelligencePanel / MemoryHealthViz export lines, if present in the barrel)
```
Verify no other importer breaks: `grep -rn "GettingSmarterBanner\|MemoryPulseBar\|IntelligencePanel\|MemoryHealthViz\|LearningEngineSheet" src --include=*.tsx --include=*.ts` must return only the barrel (now edited) after deletion. (Confirmed today: no JSX mount sites exist.) `npm run build` to confirm tree-shake/compile.

**Keep** `MemoryWebStats.health_score` and `GettingSmarterDelta` in `src/types/memory.ts` and their computation in `useMemoryWeb.ts` — they still feed V7/V8. Do not touch `calculateHealthScore`; only its *labelling* changes (below).

### V6 — GUARD the MemoryCenter stats strip (hot/warm gated)

`src/pages/MemoryCenter.tsx`. Two render sites (desktop 185-211, mobile 232-256). Import the gate and wrap the temperature pills. **[gated on ITEM 1/2]**

Desktop (lines 201-210) — wrap the existing `hot` block and `warm` span in the live-signal gate:
```diff
- {(stats.temperature_distribution?.hot || 0) > 0 && (
-   <span ...>{stats.temperature_distribution.hot} hot</span>
- )}
- <span ...><Thermometer .../> {stats.temperature_distribution?.warm || 0} warm</span>
+ {showThermometer(facts, stats) && (
+   <>
+     {(stats.temperature_distribution?.hot || 0) > 0 && (
+       <span ...>{stats.temperature_distribution.hot} hot</span>
+     )}
+     <span ...><Thermometer .../> {stats.temperature_distribution?.warm || 0} warm</span>
+   </>
+ )}
```
Mobile (lines 246-253) — same wrap of the inline `· hot · warm` fragments. (`facts` is available in this component via `useMemoryWeb`; if `MemoryCenter` only has `stats`, lift `facts` from the same hook — it already loads it.)

Result **today**: strip reads `"{N} facts · {X}% verified"` only (honest: both are real, user-driven). **After ITEM 1/2:** the hot/warm pills reappear automatically once any fact has been referenced.

### V7 — RELABEL the mobile "Health Score bar"

`src/components/memory-web/MobileMemoryDashboard.tsx` lines 410-464. The bar itself is fine (it tracks `health_score`, a real count-of-completeness number). The dishonesty is the *implied* "intelligence/health that self-improves." Two changes:
1. The bar value is fine to keep as `health_score`, but the surrounding framing must not imply autonomous learning. There is no visible "Health" *label* on this bar today (it's just `Brain` icon + bar + `%` + `{facts}f · {patterns}p`), so the minimal honest change is to **drop the glowing `Brain` boxShadow pulse** (lines 418-430) that animates as if the system is "thinking," and keep a static brain icon. Keep `{health_score}%` but read it as completeness. Keep the honest `+{delta.new_facts}` pulse (455-463) — that is a real, user-driven delta.
2. If `patterns_count` is shown (`{stats.patterns_count}p`, line 453): it is structurally 0 until ITEM 2. **Hide the `· {patterns}p` fragment when `patterns_count === 0`** so we never show an empty "0p" that silently admits the engine is dormant; once synthesize runs it reappears with real values.

```diff
- <motion.div animate={{ boxShadow: [ ...pulsing... ] }} ...><Brain .../></motion.div>
+ <Brain className="h-3.5 w-3.5 text-accent flex-shrink-0" />
...
- {stats.total_facts}f &middot; {stats.patterns_count}p
+ {stats.total_facts}f{stats.patterns_count > 0 ? ` · ${stats.patterns_count}p` : ''}
```

### V8 — RELABEL desktop header + GUARD per-fact temperature pill

`src/components/memory-web/DesktopMemoryDashboard.tsx`.
1. Header (lines 665-669): rename the metric from "Health" to "Profile" so we stop branding a completeness count as intelligence:
```diff
- Health{' '}<span className="text-emerald-400 font-semibold">{stats?.health_score || 0}%</span>
+ Profile{' '}<span className="text-emerald-400 font-semibold">{stats?.health_score || 0}%</span>
```
2. Per-fact temperature pill (lines 142-143, styles 60-62): the `hot`/`warm` pill on every fact row is the per-row face of the dead signal. **Guard it on the live predicate** so it disappears until reliance is real. **[gated on ITEM 1]**
```diff
- <span className={cn('text-[9px] ...', TEMP_PILL_STYLES[fact.temperature])}>{fact.temperature}</span>
+ {(fact.reference_count ?? 0) > 0 && (
+   <span className={cn('text-[9px] ...', TEMP_PILL_STYLES[fact.temperature])}>{fact.temperature}</span>
+ )}
```
This is per-fact (not the aggregate gate) on purpose: once ITEM 1 starts touching facts, individual facts that have actually been relied on light up one by one — an honest, gradual reveal, not a flipped global switch.

---

## 4. The REAL receipts that already exist but aren't surfaced

The DB already carries the evidence; two surfaces drop it before render. These are pure *surfacing* changes — no new computation, no backend work. They are the honest substitute for the killed vanity: instead of "you're 12% sharper," the product shows **"here's literally why this is in front of you."**

### R1 — Briefing: the score number under each story (the "0.71" receipt)

**Already surfaced:** `SegmentCard.tsx` lines 213-225 renders `matched_profile_fact` ("Anchored to: ...") and lines 194-198 renders `relevance_reason`. `BriefingCard.tsx` (line 34) consumes the same anchor. So the *fact* receipt is live.

**Not surfaced:** the **number**. `briefing-scoring.ts` computes and stores `relevance_score` (lines 35, 286, 296: `relevance_score = max over lens items of cosine × weight`), and `src/types/briefing.ts` line 87 already types it (`relevance_score?: number | null`). The UI never renders it.

**Minimal change** — `src/components/briefing/SegmentCard.tsx`, extend the existing "Anchored to" receipt block (lines 215-225) to append the score as a confidence chip:
```diff
  <p className="text-[10px] text-muted-foreground leading-relaxed">
-   Anchored to: <span className="text-foreground/80">{segment.matched_profile_fact}</span>
+   Anchored to: <span className="text-foreground/80">{segment.matched_profile_fact}</span>
+   {typeof segment.relevance_score === 'number' && (
+     <span className="ml-1 tabular-nums text-foreground/50">· {segment.relevance_score.toFixed(2)}</span>
+   )}
  </p>
```
Honest because the number is queryable end-to-end (`briefing-diagnose` reproduces it). Renders "Anchored to: watchlist:Anthropic · 0.71" — magic you can audit. Guard on `typeof === 'number'` so v1 (no score) rows render unchanged.

### R2 — Decide: surface the evidence DATE and per-evidence score (the "dated evidence" receipt)

**Already surfaced:** `decision-views.tsx` `ClaimRow` (lines 111-137) renders each evidence row's stance pill + `source_title`/`source_url` link + `retriever` + `excerpt`; the verdict view also surfaces `confidence`, `counter_case` (243-246), the `Breakpoint` badge, and the monitored re-check note (234). This is already a strong, honest receipt.

**Not surfaced:** the DB row `decision_evidence` has **`retrieved_at timestamptz NOT NULL` and `relevance_score numeric`** (migration `20260602000000_decision_engine.sql` lines 64-65) — but the client type `DecisionEvidence` in `src/hooks/useDecisionEngine.ts` (lines 40-48) **omits both fields**, so the verdict UI literally cannot show "as of {date}." The Corpus calls this evidence "dated"; today the date is dropped at the type boundary.

**Minimal change, two files:**
1. `src/hooks/useDecisionEngine.ts` — add the two fields to the interface (lines 40-48) and they flow through automatically (the fetch is `select('*')`):
```diff
  export interface DecisionEvidence {
    id: string;
    claim_id: string;
    source_url: string | null;
    source_title: string | null;
    excerpt: string | null;
    stance: 'supports' | 'refutes' | 'neutral';
    retriever: string;
+   retrieved_at: string | null;
+   relevance_score: number | null;
  }
```
2. `src/components/operator/decision/decision-views.tsx` — in the evidence `<li>` (lines 123-130), append the date next to the retriever:
```diff
  <span className="text-muted-foreground/60">· {e.retriever}</span>
+ {e.retrieved_at && (
+   <span className="text-muted-foreground/50">· as of {new Date(e.retrieved_at).toLocaleDateString()}</span>
+ )}
```
Honest because it is the literal retrieval timestamp the adjudicator used; it also quietly tells the user how fresh the verdict is (load-bearing for the return-ask / decision-watch story in later phases).

### R3 (optional, low-cost) — unify the receipt vocabulary

Both R1 and R2 are "why am I seeing this?" receipts. Use one consistent micro-label/affordance (a small `Anchor`/info glyph + "why?" on tap) so the user learns *one* gesture across Briefing and Decide. Not required for honesty; recommended for the Phase-2/3 "receipts under every output" rail. No backend.

---

## 5. The one BACKED onboarding affordance to KEEP (do not kill)

The Corpus permits "a new fact lands hot at the centre" **only if backed**. It is — and it's display-only, so it's honest:

- `src/lib/seedFacts.ts` `toWebFact()` (lines 84-90) maps a freshly captured `UserMemoryFact` to the web shape with `temperature: 'hot'` — a **display transform for the visualization**, not a DB write. The user sees their own just-spoken words land at the centre ring. This is an onboarding *feeling*, not a persisted learning claim, so it does not lie about the backend.
- `makeSeed()` (lines 25-55) gives industry seed ghosts `temperature: 'cold'` (outer ring, slow pulse, `tags:['seed']`, `confidence 0.3`, clearly secondary). `isSeedFact()` (line 21) keeps them visually distinct.

**Keep both unchanged.** The honesty rail that protects them: this `hot` is *ephemeral display state for a brand-new capture*, never written back to `user_memory.temperature` and never counted into the V6/V8 aggregate thermometer (which reads `stats.temperature_distribution` from the DB, not the web-fact transform). So "lands hot at the centre" coexists with a guarded/hidden aggregate thermometer without contradiction. **Add a one-line code comment** at `toWebFact` noting this is display-only and must never be persisted, so a future refactor doesn't accidentally write it back and re-fake the signal.

---

## 6. Acceptance criteria (how we know it's honest)

1. Grep `grep -rn "Getting smarter\|Learning Engine\|GettingSmarterBanner\|MemoryPulseBar\|IntelligencePanel\|MemoryHealthViz\|LearningEngineSheet" src` returns **zero** (dead vanity gone; barrel clean). `npm run build` green.
2. With a fresh/real account (no fact ever referenced → `reference_count` all 0): **no "hot" pill renders anywhere**, no per-fact temperature pill renders, the desktop header says "Profile" not "Health," and no surface animates as if self-improving. The strip honestly reads `"{N} facts · {X}% verified"`.
3. After ITEM 1 (touch) + ITEM 2 (lifecycle cron) land and at least one fact has `reference_count > 0`: the hot/warm pills and per-fact temperature pills **reappear automatically** (via `temperatureSignalIsLive`/`reference_count>0`), now backed by a real signal. No code change needed to flip them on — the data flips them.
4. Every briefing story shows `Anchored to: {fact} · {score}` (v2 rows); every Decide evidence row shows `· as of {date}`. A user can answer "why am I seeing this?" from the screen for both engines.
5. A newly captured fact still visibly lands hot at the centre of the memory web (onboarding affordance intact), while the aggregate DB thermometer stays honest (hidden until backed).
6. `patterns_count` of 0 never renders as a bare "0p"/empty panel that exposes the dormant engine; it appears only with real values post-ITEM-2.

---

## 7. Risks / coupling notes

- **Coupling:** §3 V6/V8 guards and the §6(3) auto-reveal **depend on ITEM 1 writing `reference_count`** and ITEM 2 running lifecycle. If ITEM 4 ships *before* ITEM 1/2 (allowed — it's net more honest), the thermometers simply stay hidden, which is correct. They must NOT be un-gated until ITEM 1 is live; otherwise we re-fake.
- **`MemoryWebStats.temperature_distribution` will read all-`warm` today** even after the guard, because the guard hides it; do not "fix" the distribution by seeding hot — that would re-introduce the faked signal. The only honest way `hot` grows is reliance.
- **Do not delete `health_score`/`calculateHealthScore`** — V7/V8 still use it; only its label ("Health"→"Profile"/completeness) and the self-improving *animation* change. It is a legitimate completeness gauge, just not an "intelligence" one.
- **`relevance_score` display (R1)** must guard `typeof === 'number'` — v1/legacy briefings have no score and must render unchanged.
- **`PatternInsight`** (used inside the now-deleted `LearningEngineSheet`) may be referenced elsewhere; confirm with grep before assuming it's orphaned — deleting `LearningEngineSheet` only removes that one consumer, not `PatternInsight` itself.
- **Per-fact temperature pill guard (V8.2)** changes a high-frequency row component; verify the list still renders and the conditional doesn't break row layout/spacing on rows where the pill is now absent.

---

## 8. Returned schema (StructuredOutput contract)

The orchestrator's `StructuredOutput` for this item carries: `item` ("ITEM 4 — Honest Magic"), `headline`, `scope_file` (this file's path), `recommendation`, `specifics[]` (the numbered findings), `files_touched[]` ({path, change}), and `risks[]`. See the tool call accompanying this spec; this section documents the same shape so the spec is self-contained.
