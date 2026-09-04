# Intake + Harness Upgrade — LOCKED SPEC (live ledger)

**Initiative:** Tighten the 4 Kit experiences + the Automator toward `ctrl-corpus/intake/` (Agent Skill Builder v3 theory). Goal: richest info at lowest user effort, an invisible layered system, and a world-class clean output harness.
**Repo:** krishanraja/mm-ctrl, branch `feat/voice-profile-automator-ladder`.
**Started:** 2026-06-18. Keep updated until complete.

## Locked decisions (Krish, 2026-06-18)

1. **Monetization: FREE FOR NOW.** Strip the freemium ladder from the WIP (Core 1/mo + Edge Pro). Skill builder is open to any authed user (incl. anonymous kit sessions). Removes the in-flow tier banner = less scroll. Keep the voice profile + pain chips + harness upgrades from that WIP.
2. **Output destination: ALL THREE, LAYERED.** "Your skills" library is the home (retention) + one-click MCP connector (extends `mcp-context`) + clean download fallback.
3. **Voice magic: OPTIONAL POWER PATH.** Keep the 5-pick recognition default; add paste-to-extract (paste real writing → auto-derive the 8 voice dims, no manual .md) as a one-tap shortcut.
4. **In-flow tone pick WRITES the persistent voice profile** (1-tap warm/crisp/formal becomes a reusable saved voice). One source of truth.
5. **Kit voice rule:** kit take-homes (chart, where-you-start, emails) stay branded Mindmaker/Krish voice. The student's captured voice feeds the SKILL they build + their CTRL life, not the class artifact.
6. **Voice forwardness:** nudged once on first skill build (not lazily hidden). Voice-locked harness = the defensibility story.
7. **Domain capture: OPTIONAL with a visible payoff.** One skippable domain field early in the kit ("paste your site and your chart/suggestions come pre-filled"). Keeps the zero-friction door; rewards those who give it.
8. **Peer framing: "YOUR PEERS ARE USING THIS" (Krish revised 2026-06-18).** Krish is happy to use the confident peer voice ("your peers are using this") rather than a hedged heuristic label. Implementation guardrail (keep it defensibly true, not fabricated): use the "peers" voice as the default warm framing; where a real cohort of >=k exists, sharpen to the specific count ("3 founders at SaaS companies built this"); where we have zero signal, stay to the general true-ish "peers like you are using this" and never invent a specific fake count. Confident framing, no bald fabricated specifics.

## The invisible layered system (the defensible core)

- **L0 Context:** domain -> `company_context` (Apollo + Jina + Tavily via `enrich-company-context`) + role. Warms suggestions.
- **L1 Recognition intake:** fork + pick-cascade (kit) / suggestions + cascade (automator). Lowest cognitive effort.
- **L2 Voice:** unified 8-dim profile (`ctrl_voice_profile` fact). Pick / paste-extract.
- **L3 Memory Web grounding:** facts/blockers/decisions.
- **L4 Compiler:** `generate-skill-export/prompt.ts` (Four Honest Tests + voice mapping), informed by mcpmarket best-practice structures.
- **L5 Output:** library + MCP connector + download.

## Equipment already in repo
- `enrich-company-context` (Apollo industry/size + Jina site + Tavily news -> `company_context`).
- `useSkillSuggestions` (role/sector fallback; upgrade to read real firmographics).
- `send-kit-pack` (anonymous kit -> password graduation on same auth.uid; carries kit + voice + Memory Web).
- `mcp-context` (Memory-Web MCP server; extend for skills/MCP connector).
- Voice WIP: `VoiceStyleProfileSheet`, `useVoiceProfile`, `types/voiceProfile.ts`, `memory-context-builder` voice section, `prompt.ts` Four Honest Tests + voice-profile.md.

## External: mcpmarket.com
- Marketplace of MCP servers + Claude Code skills (`/server/*`, `/tools/skills/*`). Reference for world-class harness structure + a runtime template source.
- Key in `~/.claude/secrets/TOKENS.md` (`sk_user_...`). CAVEAT: their edge hard-blocks non-browser requests (403/429); real API base/docs needed before runtime pulls. Usable as design reference now.

## Build sequence (pieces)
1. **Voice, unified** + strip the freemium ladder (free for now) + paste-extract power path.
2. **Harness output** — generate a real sample skill, inspect, tighten prompt.ts + voice-profile.md to "100% clean."
3. **Output destination** — library + MCP connector + clean download.
4. **L0 warm start** — optional domain capture -> enrich -> blended honest peer suggestions across kit + automator.
5. **Intake tightening across the 5** — scroll/one-click, parity vs recognition principle.

## ★★★ SHIPPED + MERGED + LIVE (2026-06-18). PR #204 merged to main (merge 8279f11). Prod deploy READY + smoke-verified on ctrl.themindmaker.ai.
- RECONCILED with a parallel PR #203 ("Automator redesign: 3-step + voice + quota") that had merged to main first. Per Krish: free-for-now WON (reverted #203's automator_usage quota), our approved 5-step voice-aware cascade + single ctrl_voice_profile + paste-extract WON; #203's additive extras kept (useTier, EdgeProTab PlanMatrix, EdgePaywall, cockpit/sidebar/desktop-shell tweaks, enhanced quality-gate [now 17/17], docs/PRICING). #203's orphaned voice components (VoiceProfileCard/SaveProfileCard/lib/voiceProfile/useAutomatorQuota) left as DEAD CODE -> follow-up cleanup.
- Supabase: generate-skill-export + extract-voice-profile + mcp-context deployed; automator_usage migration confirmed applied (no drift); no other migrations.
- Docs: repo (CLAUDE.md + ARCHITECTURE/FEATURES/HISTORY/DECISIONS_LOG/README + reconciled VOICE_PROFILE.md/PRICING.md/VALUE_PROP/Master_Messaging) all current + em-dash clean; this corpus ledger current.
- NEEDS KRISH: rotate the chat-pasted sbp_ token + test-login pw. FOLLOW-UPS: delete #203's orphaned voice/quota dead code; human glance at PlanMatrix/PRICING since Edge Pro now gates the live MCP pull + briefing + Edge artifacts (not the build).

## ▶ CURRENT STEP
Piece 1 BUILT (working tree, branch feat/voice-profile-automator-ladder), build + lint green:
- Freemium ladder STRIPPED (free for now): deleted AutomatorTierBanner/useSkillBuildAccess/constants.skillTier/_shared.skill-tier; backend gate removed in generate-skill-export; AutomatePainCard + ContextExport + KitHome + SendPackCard copy collapsed to single open state.
- Voice UNIFIED: automatorModel toneToVoiceProfile/toneIdFromProfile; AutomatorCascade tone step is voice-aware (cold samples WRITE the profile via onAdoptTone; returning = SavedVoice "still sound like you?" Keep/Adjust; paste affordance); AutomatorFlow wires profile + auto-selects saved tone.
- Paste-extract: NEW edge fn supabase/functions/extract-voice-profile (LLM -> 8 dims, anon-session safe); VoiceStyleProfileSheet got the paste panel (prefills picks to confirm, never silent-saves).
- Desktop TWO-PANE added (Krish: desktop is the primary surface): AutomatorScaffold = live "your skill is taking shape" panel (lg+ only); ContextExport desktop builder widened 402px -> max-w-4xl; mobile unchanged.
- Paste affordance opens the sheet straight into paste mode (initialPasteMode).
- DEPLOYED (Krish authorized): extract-voice-profile + generate-skill-export live on bkyuxvschuwngtcdhsyg.
- LIVE-VERIFIED via Playwright login (krish@themindmaker.ai) on the local build against deployed fns:
  - Desktop two-pane suggestions (HowItWorks panel) + voice step (scaffold filling: Built from/Works on/Shaped as ticked) - exquisite, screenshots in prototypes/_shots/auto.desktop.*.png
  - Mobile single column clean - auto.mobile.*.png
  - Paste-extract round-trip end-to-end: paste -> deployed edge fn -> "Filled from your writing" prefilled picks - paste.2-result.png
- Build + lint green throughout. Working tree clean. NOT committed/PR'd yet.
Piece 1 PR = #204 (open, not merged).

## Piece 2 DONE + VERIFIED (committed to PR #204, dd578bf; generate-skill-export redeployed)
Inspected a real generated skill (free path works, triage Four-Honest-Tests). Tightened the harness (prompt.ts), all 3 verified end-to-end via real generation:
1. NO fabricated voice samples - uses the real VOICE_PROFILE/transcript sample VERBATIM; when none, describes the register in prose (no fake quote). [was: model invented "sales increased 5%"]
2. voice-profile.md renders the REAL 8-dimension map (signoff/disagreement/archetype/sentence-length/first-person/punctuation/hard-rules) + verbatim sample; REQUIRED only when a real profile exists (no thin/padded file).
3. "## Learning loop" section added (honest, no auto-update overclaim; points back to CTRL induction engine) -> quality gate now 16/16 (was 15/16).
BONUS BUG FOUND+FIXED: useVoiceProfile saved verification_status:'confirmed' (invalid enum) -> 400, voice-profile save was BROKEN. Fixed to 'verified'; verified insert 201 + full round-trip.
Learning-loop futures explained to Krish (L0 in-skill self-correct -> L1 run ledger/sharpness score -> L2 round-trip to CTRL induction [skill_induction_arm exists] -> L3 live via MCP versioned endpoint -> L4 cohort learning). Sample artifacts: ctrl-corpus/_piece2-sample-*.json.

## Piece 3 DONE + VERIFIED (PR #204, 96ffff0; mcp-context redeployed) - LAYERED OUTPUT
- mcp-context: new list_skills + get_skill MCP tools -> a leader's agent pulls their built CTRL skills LIVE. Verified end-to-end (mint -> tools/list -> list_skills -> get_skill returns full SKILL.md).
- LibraryTab: "Connect these to your agent" MCP banner + per-item Download(.md). The three destinations are real: library (home) + MCP (live) + download.
- Cleaned 4 QA test skills from the account.

## Piece 4 DONE + VERIFIED (PR #204, f58e287) - WARM START
- useSkillSuggestions: curated deliverables lead with the confident "{peers} are using this" voice (role + company profile; best-effort company_context/Apollo industry sharpen), never a fabricated count. Mined keep their own grounded reason. Verified desktop+mobile ("Leaders like you are using this" + clean).
- Automator: optional "Add your company site" -> enrich-company-context -> re-mine. Best-effort.
- DEFERRED (honest): domain capture inside the kit cascade (the kit profile step already captures sector; Automator has the domain affordance); company_context read-back is RLS-best-effort.

## Piece 5 DONE + VERIFIED (PR #204, 071fffd) - PARITY SWEEP
- Audit: the 4 kit intakes are already at structural parity (100% recognition, forked adaptive, two-pane desktop, no cramping). Piece 2's enum fix restored the kit voice capture.
- KitVoiceProfileCard: honest per-kit carry-over copy + paste option.
- DELIBERATELY kept AB(10)/Vibe(9) step counts (trim = richness-vs-brevity product call; recognition keeps each step fast).

## ★ ALL 5 PIECES COMPLETE. Everything in PR #204 (krishanraja/mm-ctrl, branch feat/voice-profile-automator-ladder), NOT merged - founder reviews + merges.
Edge fns LIVE on prod (authorized): generate-skill-export (gate removed + harness tightenings), extract-voice-profile (new), mcp-context (skills tools). Frontend deploys on merge (Vercel).
NEEDS KRISH: review + merge PR #204; rotate the chat-pasted sbp_ token + test-login pw (standing pattern).
