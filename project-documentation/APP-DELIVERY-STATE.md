# CTRL app delivery state

Updated: 2026-08-10

## Autonomous completion checkpoint

This section supersedes earlier authority and next-action notes in this historical design trace.

- AUTHORITY: on 2026-08-10 the founder approved autonomous continuation to a reviewable completion standard. Local implementation, tests, commit, branch push, and Vercel preview are authorized. Production promotion, domain cutover, production migrations, Edge Function deployment, external sends, and secret provisioning remain separate production actions.
- PRODUCT: CTRL is the one product at `makeyourmindup.ai`. Make Your Mind Up is the warm public entry and judgement-capture experience. Home, Decide, Blind Spot, Memory, Settings, and the signature audio briefing are the primary instrument. Older builders remain only where they are useful as nested harnesses.
- UI CANON: Option E is locked product-wide: Segoe UI Variable Display and Text are optical cuts of one family; compact evidence metadata uses the system mono stack. Google font requests and the missing Gobold dependency are removed from active app, pricing, email, and generated share-card surfaces.
- EXPERIENCE: First Lens is the post-onboarding payoff; the returning surface keeps premium category visualization rather than becoming a text RSS wall. Briefing is a real stateful control and drawer with playback, spoken/text follow-up, human error recovery, and one reversible learning prompt. Settings is permanently reachable. All verified signature controls meet a 44px minimum target.
- DECISIONS: the public flow, decision capture, and Blind Spot each present one primary ask. Blind Spot confirmation is re-grounded server-side against current facts and requires two independent anchors. A database RPC serializes confirmations so retries and concurrent tabs converge on one pattern.
- DATA: Control Center is an optional, fail-closed source adapter into the existing `live-headlines` shared pool. Only high-fit, source-backed rows survive; the original article host retains trust and provenance. Operator `force` and `debug` paths now require the service credential. The bridge remains dormant until `CONTROL_CENTER_URL` and `CONTROL_CENTER_SERVICE_ROLE_KEY` are provisioned as CTRL Edge Function secrets.
- DELIVERY: the same curated pool powers Home and no-login email/audio. Subscriptions are unique by normalized destination, handoffs use a stable idempotency key, result email requires a matching active consent record and an atomic claim, audio is reused on retry, and daily deliveries use a stale-recoverable claim to prevent overlapping cron sends.
- PERFORMANCE: interaction-only Settings, briefing, command-palette, contest, and mobile-capture code is lazy-loaded. The initial client chunk fell from 996.63 KB to 716.76 KB raw, and from 301.21 KB to 217.35 KB gzip.
- VERIFICATION: 856 Vitest tests pass across 52 files; the safe Playwright suite passes 11/11 First Lens, briefing, and Settings journeys at 1440x900, 390x844, and 320x568, including no horizontal overflow, no clipped visible copy, one typography system, 44px targets, failed-question preservation, retry, one-click confirmation, and reset. Typecheck reports zero current errors, standards pass, changed-file lint is clean, all five altered Edge Functions bundle, and the production build plus 3/3 prerenders pass.
- ACCESS: the password pasted into chat remains treated as exposed test data and was not used. No production user record, email, subscription, charge, or external message was created during QA.
- DEPLOYMENT: production remains unchanged until an explicit release action. The next safe release unit is the branch preview plus signed-in acceptance, followed by a separately approved migration/Edge deployment and secret provisioning.
- SECURITY FOLLOW-UP: the tracked Control Center n8n workflow at `scripts/n8n/marcus-daily-brief.workflow.json` contains a credential and is outside this repository's writable scope. Rotate that credential and replace the tracked value with a secret reference before the Control Center bridge is enabled.

This is the canonical resumable state for the active Make Your Mind Up and CTRL unification. Historical roadmaps remain historical. Product rules remain in `docs/CTRL-SYSTEM-SPEC.md` and the surface specs. Finalized product decisions remain append-only in `project-documentation/DECISIONS_LOG.md`.

## Preflight

- STATE_ROUTE: `project-documentation/APP-DELIVERY-STATE.md`
- SOURCE_LAYERS: `docs/CTRL-SYSTEM-SPEC.md` and `docs/MAIN-APP-POLISH-SPEC.md` are current product rules; `project-documentation/DECISIONS_LOG.md` is finalized history; `project-documentation/CTRL-BUILD-ROADMAP.md` is explicitly historical; the live authenticated preview and current repository are implementation truth.
- PRODUCT_TRUTH: CTRL is the product. Make Your Mind Up supplies the warm entry, brand feeling, and low-friction experience. The leader gets one useful next move, a small personalized AI-native read, decision support, memory, and blind-spot reflection.
- NON_GOALS: no duplicate products, no generic dashboard, no extra feature pile, no production domain cutover without explicit approval, no new data claims unsupported by the current pipeline.
- SURFACE_DEPENDENCIES: public onboarding -> authenticated Home -> Decide / Blind spot / Memory -> briefing and no-login delivery -> integrations.
- VERTICAL_SLICE: public onboarding creates useful context -> Home returns one next move and a ranked brief -> the leader can act without searching the app.
- FIRST_SURFACE: authenticated desktop Home, because live real-data inspection exposed a blocking hierarchy failure.

## Design task contract: desktop Home

- STATE OF USE: desktop deep-work, 1280x720 through 1440x900 plus a tall 1325x1272 window; user is busy and should understand the page in one glance.
- USER + ACTION: a CEO, COO, or founder sees one best next move and the few AI-native changes that deserve attention.
- GOVERNING RULE: one primary action, no page or nested scroll, no clipped primary meaning, no default lateral cut-off, and no unsupported urgency language.
- DATA TRUTH: current deck supplies ranked kickstart, trend, news, and signal items with category, headline, advisory, source, age, and optional magnitude or corroboration. It does not supply a reliable urgency window.
- MATERIALITY: material redesign. The failed horizontal rail changes to a vertical ranked briefing model.
- BRAND + VOICE: dark CTRL instrument, restrained emerald, warm chief-of-staff language, and Make Your Mind Up simplicity.
- AUTHORITY: local rendered mock and preview QA are authorized. Product implementation waits for founder approval of the rendered mock. Production remains a separate approval.
- PROOF: live authenticated inspection with real data; rendered mock at 1280x720 and 1440x900; overflow, action-count, heading, focusable-control, and console checks.

## Current truth

- Repository: `krishanraja/mm-ctrl`, branch `codex/unify-ctrl`, dirty working tree containing the unification build.
- Latest functional preview: Vercel preview created on 2026-08-08. Production is unchanged.
- Live defect evidence: the original desktop Home stretched equal-height cards to 969px in a 1325x1272 viewport. A bounded-height repair reduced the rail to 520px, but 1440x900 inspection still showed truncated lead and supporting meaning, a laterally cut fourth item, dense widget treatment, and a large dead canvas.
- Additional content-contract defect: the current voice-profile next move inherits capability-stage decision copy and the decision-specific CTA, so the headline, explanation, and action disagree.

## Concept trace: desktop Home

- Sanitized brief revision: `HOME-DESKTOP-BRIEF-r2`, with real data fields, viewport rules, accessibility, brand, state range, and failure requirements. Generators did not receive rejected layout artifacts.
- Round 1 generators: `dashboard_concept_a`, `dashboard_concept_b`, `dashboard_concept_c`.
- Round 1 distance result: rejected before founder review because all three converged on the same static editorial-list spine.
- Round 2 generators: `dashboard_round2_focus` (user-controlled focus), `dashboard_round2_temporal` (temporal priority), `dashboard_round2_dialogue` (conversational briefing).
- Pairwise distance: passed. The concepts differed on sequencing, agency, interaction, information structure, and state model.
- Primary judges: `dashboard_judge_one` and `dashboard_judge_two`, given independently randomized candidate orders and the full rejected history.
- Primary verdict: split between Flight Director and Attention Tape.
- Tiebreaker: `dashboard_tiebreaker`, blinded to prior verdicts, selected Attention Tape.
- Disguised repetition: no. The selected spine replaces equal-weight lateral cards with unequal vertical rank and progressive omission.
- Constraint regression: none inherent. Responsive fit, keyboard order, and state range remain implementation gates.
- Discarded strengths to restore: real rank, category motifs as quiet inline cues, source and evidence metadata, one explicit next action, command shortcut, Tune Feed, stable navigation, and restrained emerald-on-dark language.
- Selected spine: Attention Tape, using supported rank and recency language only. One expanded top signal, up to two complete supporting strips, and a lower register only when height permits. Lower-ranked content disappears before type or meaning is compressed.
- Feasibility: uses current `DeckCard` fields and existing routes. No backend schema or new generation service is required.

## Rendered artifact

- Revision: `HOME-DESKTOP-ATTENTION-TAPE-v1`
- File: `prototypes/home-desktop-attention-tape-v1.html`
- SHA256: `4BB711105A4974371DA77CB423D86B7E9135C3E4995C123537A787842DADBD97`
- Data status: clearly marked design preview, populated with the current authenticated Home state and corrected route-specific voice-next-move copy.
- Render proof: 1280x720 and 1440x900 both have zero page overflow, one filled primary action, complete visible headings, native focusable controls, and zero console warnings or errors.
- Founder reaction on 2026-08-10: "I like it, feels clearer. I cant see it on mobile though?"
- Classification: positive hierarchy signal plus a material responsive-state gap. No product implementation approval is inferred.

- Revision: `HOME-RESPONSIVE-ATTENTION-TAPE-v2`
- File: `prototypes/home-responsive-attention-tape-v2.html`
- SHA256: `68461D51980105E3E1E2E44D29F400259CCBAB78397245F803E8934069D16527`
- Responsive rule: the attention tape becomes a natural-height vertical brief below 720px, with a compact sticky CTRL header, complete stacked signals, and four-item thumb-reachable bottom navigation. Lower content remains available by page scroll; no component receives its own scrollbar.
- Render proof: desktop placement preserved at 1280x720; mobile tested at 320x568, 360x800, and 390x844 with zero horizontal overflow. At 360px all visible controls are at least 44px in both dimensions where applicable, all four headings fit their containers, the complete lower register remains reachable above the fixed navigation, the focus order follows the visible mobile sequence, and console warnings/errors are empty.
- Founder reaction on 2026-08-10: "looks good, but I did really enjoy the premium nature of the previous visualizations, now it just looks like fancy text RSS feed. it took ages to conceptualize and stabilize those visuals, but I am also ok to hear if you think it's not right for the new strategy. Also think about what experience this conveys to a user who has just undergone the makeyourmindupflow, is it consistent, does it logically make sense how the user feels about what they are consuming, and then landing here?"
- Classification: product-rule and journey-continuity failure, expressed through the design system. The clarity hierarchy worked, but the surface lost CTRL's premium visualization grammar and did not visibly pay off the user's Make Your Mind Up investment. Same-spine revision count: 1.
- Approval: not approved for implementation. The responsive mechanics remain useful evidence, not a visual lock.

- Revision: `HOME-FIRST-LENS-v3`
- File: `prototypes/home-first-lens-v3.html`
- SHA256: `3C988FE391659D397D1B1F7CA03A9CFB4BDEA070AE8EF8CEC8843A4F397E9D0F`
- Journey rule: the first authenticated landing is a visible payoff of Make Your Mind Up, not an immediate generic brief. It reflects only the consented handoff fields already available to CTRL (`q2`, `q4`, `anxietyLane`, and `archetypeTitle`), asks for one-tap confirmation, and preserves the existing rule that the user's raw delayed-decision sentence does not cross the handoff.
- Visual rule: retain the Attention Tape hierarchy, but use one stabilized premium visualization as evidence that CTRL interpreted the leader. Category motifs remain available for real signals and decisions; they do not decorate a wall of equal-weight cards.
- Render proof: checked at 1280x720 and 1440x900, plus 320x568 and 390x844. No horizontal page overflow, all visible controls are at least 44px high, the primary one-tap confirmation works and exposes an explicit pressed state, reduced-motion handling is present, and browser console output is empty. At 390x844, the personal lens, interpretation, and confirmation action all appear in the first viewport above the fixed navigation.
- Founder reaction on 2026-08-10: "looks great".
- Approval: explicitly locked as Decision 69 for local implementation and preview verification. The lock applies to the one-time post-handoff Home state, not every returning Home visit. Production release is not approved.

## Implementation handoff

- TARGET: `krishanraja/mm-ctrl`, branch `codex/unify-ctrl`, local dirty worktree at `0902d59` with unrelated user-owned and existing unification changes preserved.
- SOURCE OF TRUTH: Decision 69, `HOME-FIRST-LENS-v3`, and the existing `portfolio_handoff` / `resolve-handoff` contract.
- AUTHORITY: local code, tests, and local authenticated runtime proof are authorized. Commit, push, preview deployment, and production remain separate actions.
- PASS SIGNALS: a valid handoff resolves into the approved lens without flashing the normal Home; one tap records the inferred focus and exits to normal Home; dismissal exits without writing; refresh does not repeat a completed handoff; users without a handoff see the existing Home unchanged; desktop and mobile match the approved hierarchy without horizontal overflow.
- ROLLBACK: keep the implementation isolated to a new presentational lens component and the existing handoff gate so removing the gate restores the prior Home without data rollback.
- READBACK: focused unit/component tests, repository type/build checks, and local browser verification at target desktop and mobile viewports. A designated authenticated handoff path is required before calling the feature runtime-verified.

## QA target: Decision 69 local implementation

- REPOSITORY: `C:\Users\krish\OneDrive\Documents\CTRL`, remote `krishanraja/mm-ctrl`, branch `codex/unify-ctrl`, base revision `0902d59`, dirty unification worktree preserved.
- DEPLOYMENT: local `http://127.0.0.1:4177`; no Vercel preview or production mutation authorized. Source and local runtime are the same working tree.
- PRIMARY USER + PROMISE: an overwhelmed founder, CEO, or COO who has just completed public CTRL onboarding sees proof that CTRL understood the useful pattern, confirms or corrects it in one tap, and receives one relevant first decision.
- TASKS: understand the first lens; confirm, dismiss, and enter the starter decision; preserve privacy language; hold the hierarchy at 1440x900, 1366x768, and 390x844; keep keyboard focus, touch targets, overflow, loading, malformed-payload, and failed-persistence recovery honest.
- ACCESS: repository, local public fixture, and automated mocked persistence path. Authenticated account access is intentionally not taken from the password pasted in chat; a matching authorized preview session remains required for live Supabase persistence proof.
- TEST DATA: synthetic orchestration-lane handoff only. No production records, emails, messages, charges, or external sends.
- WRITE AUTHORITY: local source edits already approved; browser QA is fixture-only and reversible. Stop before commit, push, deployment, production data, or external send.
- EVIDENCE LOCATION: redacted results in this state file; any screenshot evidence remains local to the browser session and contains synthetic data only.
- PASS SIGNAL: one clear primary action, all three controls operable, visible transition feedback, zero horizontal overflow, no clipping of primary meaning, practical mobile targets, logical keyboard order, zero application console errors, and deterministic tests for resolve, persist, retry, malformed payload, and completion.

## Verification result: Decision 69 local implementation

- STATUS: local implementation and public journey verified; matching authenticated Supabase runtime proof remains gated on a preview deployment and secure user-entered sign-in.
- CODE REVIEW: no remaining critical or important finding in the first-lens scope. Runtime payloads are Zod-validated, the save path is retryable and idempotent for the current active fact, completion is token-scoped, and the controls use CTRL's focus-visible button primitive.
- RENDERED QA: verified at 1440x900, 1366x768, 390x844, and 320x568 in the local public fixture. Horizontal overflow is zero. Desktop confirmation, dismissal, privacy meaning, and starter decision stay unclipped. Mobile confirmation and interpretation fit after reserving the real 56px app header and 64px fixed navigation. All visible actions are at least 44px high.
- FIX/RETEST: the first rendered pass reproduced clipped privacy and controls at 1366x768; low-height compression plus omission of the lowest-priority footer fixed it. The first mobile pass left interpretation under the real shell reserve; compact visual and headline rhythm fixed it. Both original reproductions passed after repair.
- INTERACTION QA: confirmation, dismissal, and starter-decision transitions all passed. Visible focus styling was observed. Application console errors: zero. The existing React Router future-flag warning remains unrelated.
- AUTOMATED PROOF: 15 focused tests passed across starter decisions, lens modeling/schema validation, the rendered component, and handoff persistence/retry/completion. Public onboarding E2E passed from the first calm question through result, briefing consent, handoff creation, auth navigation, and token preservation.
- REPOSITORY PROOF: targeted ESLint passed; typecheck reports zero current errors; standards check passed; production build passed with 2,781 modules; prerender passed 3/3 routes.
- EXISTING BUILD WARNINGS: unresolved runtime Gobold font path, mixed static/dynamic Supabase import, and the existing >500k main chunk. None was introduced as a functional failure by this slice.
- ACCESS LIMIT: the password pasted into chat is treated as exposed test data and was not used. The current Vercel preview does not contain this local revision, so it cannot support source-attributable authenticated acceptance.

## Founder feedback: briefing, Settings, and continuous learning

- Founder feedback on 2026-08-10: "I dislike the Listen button in the top right just being plan text, looks amateur. the audio briefing should be a really cool feature, and the visual standards should be higher than that. Also we lost Settings?"
- Founder feedback on 2026-08-10: "Ideally we should figure out how to continually subtly get users to enrich the data store, with something thats super easy for them - ideate how"
- CLASSIFICATION: restoring a permanently reachable Settings control is a routine trust and navigation invariant. Redesigning the briefing control and introducing a continuous enrichment loop are material interaction and data-governance decisions.
- CURRENT CAPABILITY: CTRL already has real playback state, progress, speed, segment feedback, voice/text briefing conversation, inferred-interest confirmation, explicit memory capture, and fact verification. These are fragmented interactions rather than one legible learning loop. Briefing conversation currently does not propose or persist reusable context.
- ARCHITECTURE RULE: explicit facts about the leader belong in `user_memory`; interests and content preferences remain in their semantic tuning tables; implicit behavior remains feedback; uncertain inference becomes a candidate that the user can confirm. Do not turn `user_memory` into a generic event store.

## Design task contract: BRIEFING-PULSE-v1

- STATE OF USE: a time-poor leader is checking CTRL after onboarding or during a daily return, on desktop or mobile, and may want to consume the brief without navigating the rest of the product.
- USER + ACTION: play today's personalized briefing in one tap, optionally talk back, answer at most one tiny high-value question, and leave knowing what CTRL retained.
- GOVERNING RULE: the briefing is a signature CTRL surface, not a text utility link. Settings remains quietly but permanently reachable. Learning never blocks playback, asks at most one question in a meaningful session, treats skip as neutral, and never silently promotes a high-impact fact or behavioral inference.
- VISUAL RULE: replace plain `Listen` copy with a premium compact briefing pulse showing a physical play affordance, honest state (`Ready`, `Playing`, `Preparing`, unavailable), duration or progress, and restrained animated waveform only when behavior justifies it. Preserve the locked First Lens content and hierarchy.
- INTERACTION RULE: use one default heartbeat, `One thing before you go`, selected for downstream value. A mic or short answer expands into `Tell CTRL what changed`. CTRL mirrors one proposed learning in plain language with `Keep it`, `Edit`, and `Not this`, followed by a reversible undo state.
- PROMPT SELECTION: rank candidate questions by downstream decision impact x uncertainty x freshness x answer ease, minus repetition cost. Prefer stale high-impact facts, active decisions missing context, conflicting explicit signals, and repeated content reactions. Do not ask for low-value profile completeness.
- DATA TRUTH: confirmed explicit facts may become verified `user_memory`; confirmed interests update the existing preference stores; implicit listening and usefulness signals remain tuning data; model-derived or voice-derived claims stage as candidates until confirmed. Respect current memory and transcript-storage settings.
- NON-GOALS: no points, streaks, profile percentage, separate enrichment page, generic `train your AI` language, form disguised as chat, or prompts scattered across every card.
- AUTHORITY: product ideation and a new local rendered revision are authorized by the ongoing design loop. The approved `HOME-FIRST-LENS-v3` artifact remains immutable history. Product implementation waits for founder reaction to the rendered briefing synthesis. Deployment remains a separate approval.
- PROOF: render the revised shell and briefing interaction at 1280x720, 1440x900, 390x844, and 320x568. Exercise ready, playing, preparing, unavailable, answered, skipped, privacy-disabled, reduced-motion, keyboard, and touch states.

## Rendered artifact: BRIEFING-PULSE-v1

- FILE: `prototypes/briefing-pulse-v1.html`
- SHA256: `441972837F2275AB10AD8AC88F762813F2A52B799E40492B6A2441BE585CA41A`
- COMPOSITION: the artifact composes the immutable `HOME-FIRST-LENS-v3` base at runtime and changes only the surrounding shell and briefing interaction. The founder-locked lens copy, visualization, privacy statement, confirmation controls, and first decision remain unchanged.
- ENTRY STATE: the post-onboarding header says `Briefing / Starting brief / 2 min`, rather than pretending a new user already has a daily news briefing. One click starts playback and opens the briefing. Returning-user implementation can map the same component to `Today's brief` using real briefing state.
- VISUAL RESULT: a bordered, softly luminous briefing instrument replaces plain `Listen`; it contains a physical play/pause disc, duration or remaining time, restrained waveform, and real progress. A permanent 44px Settings gear sits beside it on desktop and mobile.
- LEARNING LOOP: the sheet supports playback, talk-back, one high-value question, typed or voice change capture, a mirrored memory proposal, `Keep it`, `Edit`, `Not this`, saved confirmation, and `Undo`. `Yes` verifies the existing lens without creating a duplicate fact. `Not now` explicitly saves nothing and carries no negative signal.
- PRIVACY RESULT: Settings exposes `What CTRL knows`, content tuning, delivery, memory suggestions, and transcript storage. With memory suggestions off, the same talk-back path becomes conversation-only and ends with an explicit `Nothing durable was saved` state.
- HONEST STATE RANGE: ready, playing, preparing, and unavailable are represented. Preparing and unavailable hide the waveform transcript and talk controls rather than implying playable audio. The unavailable copy refuses to fill the gap with generic news.
- RESPONSIVE PROOF: zero horizontal overflow at 1440x900, 1280x720, 390x844, and 320x568. The desktop drawer settles at 462px. The mobile sheet becomes a full-width bottom sheet; new visible actions are at least 44px after the fix-and-retest pass.
- INTERACTION PROOF: proposal, keep, undo, Settings, privacy-off conversation, preparing, unavailable, and keyboard-Escape focus restoration passed. Console warnings/errors were empty at all tested sizes. Reduced-motion CSS disables non-essential animation.
- FOUNDER REACTION: "the briefing components do not seem to fit in their container, but other than that looks good".
- FIT CORRECTION: treat this as a same-spine sizing defect, not a conceptual redirect. The oversized player was reduced; talk-back and the enrichment prompt now share one bounded follow-up module instead of appearing as two cards stuffed inside a drawer; constrained-height layouts omit the transcript excerpt before compressing the primary controls; the mobile sheet may use the viewport height minus 12px.
- FIT PROOF: at the founder's live 687x698 browser size, the player and complete one-question loop fit inside the sheet with no horizontal overflow. At 1280x720 the 462px drawer contains the full player and follow-up module with zero internal vertical remainder. At 390x844 and 320x568, the player, follow-up module, proposal, and all 44px actions remain within their container with zero horizontal overflow. Console warnings/errors remain empty.
- FOLLOW-UP FOUNDER REACTION: "looks good, except the text wraps awkwardly and the fonts are all over the place and really inconsistent. fix both everywhere".
- FIRST TYPOGRAPHY CORRECTION, NOW SUPERSEDED: the briefing temporarily used Inter/system sans for all headings, body, quotes, inputs and actions, with SF Mono only for metadata, status, timestamps and compact labels. The introduced Georgia/Times serif treatment, inherited 16px action sizes, arbitrary `25ch` headline cap, `34ch` description cap, and aggressive `overflow-wrap:anywhere` rules were removed. Headings use natural balanced wrapping; body copy uses pretty wrapping; words do not break or hyphenate unexpectedly. All briefing actions use one action scale and remain 44px high.
- FIRST TYPOGRAPHY PROOF, HISTORICAL: at 1280x720, the player and question headings both rendered as one natural line in the 462px drawer; the question explanation used two lines without an orphan or broken word. At the founder's 687x698 size, player heading, question heading, explanation and actions remained one line where space allowed. At 390x844 and 320x568, wrapping occurred only when required and remained balanced, with zero horizontal overflow. Dynamic capture, proposal, saved and privacy states inherited the same sans family; only their metadata labels remained mono. Console warnings/errors were empty.
- FOLLOW-UP FOUNDER REACTION: "ok looks good, but we could have nice looking icons in the nav bar instead of blank circles".
- NAVIGATION CORRECTION: replace placeholder circles with one restrained inline-SVG family: sun for Today, balance for Decide, eye plus blind-spot marker for Blind spot, layers for Memory, person for Profile, shield-check for Compliance, and sliders for Settings. Icons use the same 1.65px rounded stroke language, inherit navigation color, and reserve the emerald glow for the active destination. Desktop uses 18px icons; the mobile bottom navigation uses the same family at 19px.
- NAVIGATION PROOF: all seven desktop destinations render their assigned icon at 1280x720; all four mobile destinations render the same icons at the founder's live 687x698 mobile layout. Active/inactive colors remain token-correct, horizontal overflow is zero, and console warnings/errors remain empty.
- TYPOGRAPHY PREFERENCE: "I still feel like the fonts you used in the audio briefing 'your judgement stays in the loop' was a nice aesthetic, can you make that the canon?"
- REJECTED INTERPRETATION: applying Georgia only to headings while keeping adjacent explanatory and conversational copy in Inter produced the founder reaction, "the fonts juts dont match visually at all now, they do not work together". The mismatch was real: the serif read as an applied accent rather than the product voice.
- REJECTED SECOND INTERPRETATION: extending Georgia across the complete human-language surface did not solve the underlying visual relationship. Founder reaction: "no, now it all looks weird. the entire font system looks totally off." The typography decision is reopened; no canon is locked.
- REOPENING SAFETY, HISTORICAL: the rejected serif tokens were removed before the comparison and the rejected prototype remained historical evidence only.
- COMPARISON ARTIFACT: `prototypes/typography-combinations-v1.html`, SHA256 `79035BE98C332216FD814552CB214DA26FA5C4DBE9BD0985B664262E49DCF265`.
- COMPARISON METHOD: six systems render identical briefing, question, actions and First Lens copy with fixed color, spacing and hierarchy. A uses Sitka Display + Sitka Text; B uses Constantia throughout; C uses Cambria + Calibri; D uses Georgia + Verdana; E uses Segoe UI throughout; F uses Trebuchet MS throughout. All named fonts are present in the founder's browser, so no comparison card is silently falling back.
- COMPARISON PROOF: three columns at 1280x720, one column at 390x844 and 320x568, zero horizontal overflow, working select/change-selection behavior, optional copy-choice affordance, and zero console warnings/errors. No option is preselected.
- FOUNDER SELECTION: the founder replied `e`, selecting Option E from the controlled comparison.
- SELECTED CANON: human-facing CTRL surfaces use one Segoe family. `Segoe UI Variable Display` owns headings and display statements; `Segoe UI Variable Text` owns body copy, navigation, inputs and actions. Both share the same visual grammar. The system-mono token remains limited to evidence, state, timestamps and compact metadata. The CTRL wordmark remains a brand-mark exception.
- PRODUCT TOKENS: `src/index.css` defines `--font-ctrl-display`, `--font-ctrl-text`, and `--font-ctrl-system`. Existing Make Your Mind Up utility names are retained as migration aliases, but now resolve to the selected CTRL canon rather than preserving a competing serif system.
- SELECTED TYPOGRAPHY PROOF: at 1280x720 the question is one line inside the 462px drawer. At 390x844 and 320x568 it becomes a deliberate two-line thought with no broken words. At 1440x900, 1280x720, 390x844 and 320x568 there is zero horizontal overflow; all visible actions are at least 44px; navigation, playback, talk-back, capture and memory-proposal states resolve to the selected display or text cut; only metadata remains mono. Browser console logs are empty. Standards, production build and prerender pass.
- STATUS: Option E is founder-locked and applied to `BRIEFING-PULSE-v1`, the integrated product briefing, Settings surfaces, and the canonical product tokens. No commit, push, preview deployment, or production change is inferred.

## Integrated product implementation: Decision 72

- PRODUCT SURFACE: the header now presents one premium briefing instrument with honest ready, generating, playing, and progress states. One click opens an existing brief or generates and opens the new brief automatically.
- RESPONSIVE SHELL: the briefing is a 462px right drawer on desktop and a viewport-safe bottom sheet on mobile. The player, talk-back, and one optional learning question are primary; segment notes remain available under one disclosure.
- REAL PIPELINES: playback uses the existing briefing context and generated briefing record; talk-back uses the existing briefing-conversation voice/text path; the learning prompt selects a real pending verification and writes through `verify_memory_fact`; memory and transcript behavior respects the existing Settings controls.
- CONSENT UX: corrections may be spoken or typed, are mirrored before save, and expose `Keep it`, `Edit`, `Not this`, and a five-second `Undo` state. Skipping records nothing. No generic profile-completion prompt is fabricated when CTRL has no meaningful question.
- SETTINGS: Settings is permanently reachable on desktop and mobile. Its Privacy and data surface now exposes the existing durable-memory, transcript-storage, retention, and memory review controls rather than duplicating those controls in the briefing.
- TYPOGRAPHY: the integrated surfaces use the founder-selected Segoe Variable display/text cuts and reserve mono for state, duration, timestamps, and compact metadata.
- BROWSER PROOF: verified at 1280x720, 390x844, and 320x568. Horizontal overflow is zero; visible actions are at least 44px; the mobile sheet scrolls internally when required; correction, proposal, keep, undo, keyboard Escape, and trigger-focus restoration pass. A clean tab has no application errors; the existing React Router future-flag warning remains unrelated.
- REPOSITORY PROOF: targeted ESLint passes; typecheck reports zero current errors; focused briefing-conversation tests pass 3/3; standards pass; production build passes with 2,782 modules; prerender passes 3/3 routes. Full-repository lint still reports the pre-existing legacy baseline outside this slice.
- EXISTING BUILD WARNINGS: unresolved runtime Gobold font path, mixed static/dynamic Supabase import, and the existing greater-than-500k main chunk. None is introduced as a functional failure by this slice.
- QA HARNESS: `/preview?surface=briefing-shell` and `/preview?surface=settings-shell` render the real product components against synthetic local state for deterministic viewport and interaction review. They are unlinked QA surfaces, not alternate product implementations.
- RELEASE STATE: local implementation and verification are complete. Commit, push, Vercel preview deployment, authenticated preview acceptance, and production remain separate approvals.

## Paused work

- A matching Vercel preview remains a separate approval after founder review of the integrated local product surfaces.
- Do not alter the locked First Lens content while redesigning the surrounding shell and briefing interaction.
- The original standalone briefing prototype remains frozen design evidence; the integrated React components are now the selected implementation.

## Exactly one next action

Founder reviews the integrated local briefing and Settings surfaces; if approved, create a Vercel preview for authenticated account acceptance as a separately authorized release step.
