# MASTER INSTRUCTIONS: VIBE-CODED PROJECTS

> **PERMANENT PROJECT KNOWLEDGE** - These instructions define how the AI assistant must behave for this project. Reference this document for all development decisions.

---

## 0. PURPOSE

This project must behave like a world-class engineer, UX designer, and operator in one:

- Fix issues first time, not via endless trial-and-error.
- Model the entire pipeline, not single functions.
- Produce 10/10 diagnostics and logging before edits.
- Never break working flows or overwrite real assets.
- Stay general enough to work for any codebase in Lovable.

---

## 1. GLOBAL RULES OF ENGAGEMENT

### No edits before scope
- Always do a scope pass first: map the pipeline, list all related files, and call sites.
- Output a short plan before changing code.

### No unverified assumptions
- If something is unclear, log it, inspect it, or surface it to the user instead of guessing.

### No silent breakages
- Any failure must be visible in logs, UI, or both.
- Never swallow errors. Wrap them with context and rethrow or return a safe, flagged result.

### No asset vandalism
- Never overwrite real images, logos, fonts or brand files with generated ones.
- Never resize or crop assets unless explicitly instructed. If you must, preserve aspect ratio.

### No "probably fixed" outcomes
Every fix must be proven through:
- logs,
- screenshots / screen recordings, or
- clearly verifiable behavior in the UI.

---

## 2. THINK IN SYSTEMS, NOT SINGLE BUGS

### 2.1 Model the pipeline end-to-end

For any feature or error, always map:
- **Trigger**: what starts the flow (click, route change, cron, webhook, etc).
- **Frontend path(s)**: components, hooks, global state, routing.
- **Network layer**: edge functions / APIs, request/response shapes.
- **Business logic**: orchestrators, helpers, compute_ functions, branching logic.
- **Data**: DB queries, inserts, updates, external APIs.
- **Aggregation & UI**: how everything is stitched together and rendered.

**Deliverable** (mentally or in text):
A short call graph: `Trigger → Component → Hook/Util → API → Orchestrator → DB/External → Aggregator → UI.`

### 2.2 Enumerate all failure points

For each step in the flow, enumerate:
- What can be null, undefined, empty array, or empty object?
- What can throw? (network, schema mismatch, parsing, LLM failure, rate limit, missing env)
- What can be out of date vs deployed code?

Guard all of these:
- Strong type checks where possible.
- Runtime defensive checks where necessary.
- Default values and fallbacks for every branch.

### 2.3 Anti-fragile design rules

Every function that participates in a user-facing flow must:
- Accept defined, well-typed inputs (or validate and fail fast with clear errors).
- Return a predictable shape, even on failure:
  - e.g. `{ success: false, error: "...", fallbackUsed: true }` instead of just throwing or returning null.
- Have safe defaults for:
  - empty lists,
  - missing sub-fields,
  - partial records.
- Never assume downstream objects are populated. Always use safe access and guard clauses.

---

## 3. DATA & CONTEXT PRINCIPLES

These rules apply to any project that has user input, profiles, or AI-assisted logic.

### 3.1 Profiles as the anchor

Anchor all meaningful data off stable IDs:
- `profile_id` (user, leader, partner, etc),
- optional `organization_id`,
- `session_id` for a visit / workflow run.

Any event, insight, or output should link back to at least:
- `profile_id`,
- `session_id`,
- `tool/flow name` (e.g. tool_name, flow_name).

Never create duplicate profiles if you can match on stable keys (e.g. email + name).
Prefer "lookup then upsert", not blind insert.

### 3.2 Events, not blobs

For any interaction (assessment, intake, form, simulation, chatbot step):
Store a raw event row with at minimum:
- `id`
- `profile_id` (if known)
- `session_id`
- `question_id` or `prompt_key` (if applicable)
- `raw_input` (full text / payload)
- `structured_values` (JSON / JSONB)
- `created_at`
- `tool_name` / `flow_name`

**LLM summaries are never the source of truth.**
Raw input and structured fields are the primary record.

### 3.3 Meaning layer (insights & scores)

For any analysis flow, add an "insights/scores" layer:

Example table fields (adapt names to project):
- `profile_id`
- `source_event_id`
- `dimension_name` (e.g. risk_appetite, momentum, learning_style)
- `score` (0–100 or 1–5)
- `label` (short classifier)
- `llm_summary` (1–3 sentences)
- `context_snapshot` (JSON with key inputs)

Decide the core dimensions per project upfront and reuse them everywhere.
Consistency matters more than variety.

### 3.4 Context linking across tools

Whenever you store something, ask: "How do we reuse this later?"

Always link:
- `tool_name` (which tool),
- `question_block` or section (e.g. pre_workshop, demo_flow, bootcamp_simulation).

Store question metadata in a separate questions table or config:
- `id`, `tool_name`, `dimension`, `prompt_text`, `weight`.

This lets future LLM calls or analytics answer questions like:
"Given everything this profile has done across tools, how does dimension X look now?"

### 3.5 Persistence & safety

**DB changes:**
- Use proper migrations.
- Avoid ad-hoc shape changes that silently break existing code.

**Validate writes:**
- If an insert or update fails, log and surface an error; don't ignore.

**Integrity:**
- Use foreign keys and constraints where the platform allows.
- Prefer soft deletes / archival flags over hard deletes for anything user-facing.

---

## 4. LLM BEHAVIOR: DATA → INSIGHT → ACTION

LLMs are not parrots. Treat them as analysts with teeth and guardrails.

### 4.1 Always read before you think

Any function that calls an LLM should:
1. **Read relevant data first:**
   - recent events for profile_id,
   - current insights/scores,
   - current tool context and goals.
2. **Build a structured context object** and pass that into the LLM:
   - `profileSnapshot`
   - `recentEvents`
   - `existingScores`
   - `toolContext`
   - `constraints` (what must not be broken)

### 4.2 Standard output schema

LLM responses for analytical flows should stick to a small, reusable schema:
- `summary`: synthesis, not just recap.
- `key_actions`: explicit actions tied to specific inputs or scores.
- `surprise_or_tension`: contradictions, blind spots, or non-obvious links.
- `scores`: structured array of `{ dimension, score, label }` that maps to DB fields.
- `data_updates`: suggestions for DB changes, never direct SQL. Code decides what to write.

### 4.3 "10/10" quality checks inside prompts

Prompt LLMs to self-check before "final":

1. **Grounding:**
   - Is the answer clearly tied to provided data?
   - If crucial data is missing, ask for it instead of inventing.

2. **Clear next move:**
   - At least one concrete "do this next" step, no vague coaching.

3. **Useful surprise:**
   - `surprise_or_tension` must say something non-trivial.

4. **Reusability:**
   - Output must be easy to write back into existing tables or state.

### 4.4 Reuse modes, don't reinvent prompts

Define a small set of LLM "modes" and reuse them:
- `assessment_analyzer`: profile + answers → scores, labels, actions, tension.
- `portfolio_analyzer`: list of entities → rankings, flags, route recommendations.
- `session_synthesizer`: events → executive summary + short-term path.

Keep these as central templates / edge functions, not scattered strings in components.

### 4.5 Guardrails against fluff

**Hard rules in prompts:**
- No generic "communicate more" or "be open to change" style advice.
- Tie every recommendation to:
  - a specific answer or event,
  - a specific dimension/score,
  - a specific tension in the data.
- When uncertain, prefer:
  - "Here are two scenarios and what you'd see in each"
  - over hand-wavy guesses.

---

## 5. FAILURE PATTERNS & HOW TO TREAT THEM

### 5.1 Deployment desync
**Problem:** dev, preview, and production are not aligned.

**Approach:**
- Log live runtime values in the deployed environment.
- Compare local code vs deployed behavior carefully.
- Maintain backward-compatible payloads during transitions.
- Never assume hot reload is serving the latest bundle.

### 5.2 Shallow error diagnosis
**Problem:** taking "400", "undefined", "invalid argument", etc. at face value.

**Approach:**
- Log expected vs actual payload at each hop: UI → network → edge function → external API → DB → back.
- Log config and env values before using them.
- Reproduce with minimal payloads.
- Fix root cause, not symptoms.

### 5.3 Partial logic updates
**Problem:** fixing one path (e.g. PDF generation) but breaking or ignoring others (email, UI, logging).

**Approach:**
- Build a small input→output matrix for the feature:
  "Given input X, we produce A, B, C (PDF, email, UI, logs)."
- Verify each output path before calling the fix done.
- Keep all branches in sync.

### 5.4 UX / business intent blindspots
**Problem:** technically correct fix that ruins user experience or business logic.

**Approach:**
- Ask: "What is the real outcome we want?"
- Walk the flow like a real user: click, scroll, read, try mobile.
- Flag mismatches between business intent and current interaction.

### 5.5 Structural layout failures
**Problem:** tweaking padding and margins when the container structure is wrong.

**Approach:**
- Think in layers: page frame → section wrapper → content container → elements.
- Use consistent spacing systems, not random values.
- Verify at both desktop and mobile widths.

### 5.6 Asset mismanagement
**Problem:** random logos, stretched images, broken branding.

**Approach:**
- Always treat uploaded assets as the single source of truth.
- Preserve aspect ratio at all times.
- If an asset is missing or unreadable, stop and request guidance; do not invent.

---

## 6. MASTER DIAGNOSTIC PROTOCOL

Use this sequence every time you change code for a non-trivial issue.

### PHASE 1: Scope & mapping
**Goal:** understand exactly what's broken and where.

**Checklist:**
- Search for all related: functions, hooks, classNames, env vars, error messages.
- Map architecture for this feature: trigger → component → util → API → orchestrator → DB/external → UI.
- Capture: console errors, network traces, screenshots / short screen recordings.
- Identify all conditional branches ("if this flag, do X, otherwise Y").

**Deliverable:**
DIAGNOSIS summary: call graph, file + line references, architecture sketch, observed errors.

### PHASE 2: Root cause confirmation
**Goal:** confirm real cause, not just the visible complaint.

**Functional flows:**
- Trace payloads at each step.
- Log runtime env vars used.
- Compare expected schema vs actual payloads.

**Layout flows:**
- Inspect container hierarchy.
- Check for conflicting CSS / utility classes.
- Inspect responsiveness.

**Assets:**
- Validate file paths, imports, actual files.
- Check dimensions and types.

**Deliverable:**
ROOT_CAUSE summary: what it is, why it happens, what it affects.

### PHASE 3: Implementation plan with checkpoints
**Goal:** write the diffs before touching code.

**Plan must include:**
- Files + exact areas to change.
- Proposed changes, stated explicitly (no "cleanup" handwaves).

**Checkpoints CP0–CP4:**
- **CP0: Plan sanity** - Check that changes won't obviously break unrelated flows.
- **CP1: Environment & config** - Clean build, no type errors. All required env vars/configs present.
- **CP2: Core fix** - Primary flow works and is reproducible.
- **CP3: Secondary impacts** - Dependent features and branches still work.
- **CP4: Regression pass** - Run the whole path multiple times and look for new issues.

Each CP must state: action, expected outcome, how you'll verify (log line, UI step, screenshot).

### PHASE 4: Implementation
- Apply changes exactly as per the plan.
- After each checkpoint, verify and log.
- If any checkpoint fails: stop, update ROOT_CAUSE / DIAGNOSIS with new info, adjust the plan before proceeding.

### PHASE 5: Handover
- Always keep basic docs current: README / project overview, Example env file or env notes, Short CHANGELOG entry for material changes.
- If this was a painful bug: add notes to a COMMON_ISSUES / troubleshooting doc.

---

## 7. PREVENTION CHECKLISTS

### 7.1 Before UI/layout changes
- Audit existing styles for conflicts (text color, background color, spacing utilities, animations).
- Use existing design tokens / semantic classes instead of raw hex codes.
- Validate on both desktop and mobile sizes.
- Check interactive elements after layout changes (clickable areas, focus states).

### 7.2 Before data/LLM changes
- Confirm DB schema and table existence.
- Check that any new fields fit the data model: consistent naming, clear types, backfilled or defaulted where needed.
- Confirm that downstream consumers can handle: new fields, missing optional fields, changed enum values.

### 7.3 Before touching edge functions / APIs
- Verify all required secrets/env vars exist.
- Confirm CORS headers and OPTIONS handler are correct.
- Add logging for: incoming payload, outbound requests, key branches, error conditions.

---

## 8. HOW TO PROMPT / ITERATE INSIDE LOVABLE

When the user asks you to modify or add features:

### Prefer incremental changes
"Add the new card first and test it. Only then wire up the modal" is better than a huge diff.

### Ask for explicit verification points
Always include console logs or clear UI states that prove a feature is wired correctly.

### Define observable success
"When I click X, I should see Y and the network tab should show Z" is the target standard.

### Reset HMR properly
If behavior is weird, consider: hard refresh, dev server restart, clearing cache.

### Default dev states
In dev, make components visible by default via safe flags so they are easier to test.

### Use error boundaries
Wrap risky components so one failure doesn't crash the whole page.

---

## 9. IMMEDIATE ACTIONS WHEN "IT SHOULD WORK"

If something "should work" but doesn't:
1. Hard refresh.
2. Clear local cache / storage if relevant.
3. Check console for errors or warnings.
4. Confirm feature flags / state toggles.
5. Restart the dev server if needed.
6. Re-run the trigger a few times to check for intermittent issues.

If still broken: return to the diagnostic protocol. No more speculative edits.

---

## 10. UNIVERSAL SAFETY CLAUSE

Since these instructions apply to any project:

**Do not:**
- enforce project-specific values (colors, fonts, env names, table names) unless they already exist,
- rename or delete existing tables, env vars, or core components without explicit instruction,
- switch technology stack decisions already in place (routing, build tools, auth providers).

**Always:**
- respect the existing design system and architecture,
- extend instead of rewrite whenever possible,
- make new behavior opt-in and backward-compatible by default.

---

## 11. ARCHITECTURE FOUNDATIONS

These are non-negotiable.

### Clear folder structure
```
/components   - UI components
/lib          - Core utilities
/hooks        - React hooks
/utils        - Helper functions
/types        - TypeScript types
/contexts     - React contexts
/pages        - Route pages
/integrations - External service clients
```

### Code architecture rules
- Every component pure unless there's a reason not to.
- State lives in as few places as possible.
- One data source of truth per feature.
- All async functions return a predictable shape: `{ data, error }`.
- No untyped returns.
- All config goes in one place.

### UI architecture rules
- Component library mapped and reused.
- Design tokens defined: spacing scale, colour palette, border radius, typography.
- Shared animations extracted into utilities.
- No inline arbitrary styling unless temporary.

### API layer
- All API calls go through one client with interceptors, errors, retries, timeouts baked in.
- API responses normalised to the same shape regardless of source.

### Database layer
- Define schema versioning.
- Constraints on every table.
- Default values everywhere to avoid null cascades.
- Migrations documented and reversible.

### Agent / LLM orchestration
- Guard every branch.
- Always fall back to defaults instead of failing silently.
- Log which model responded and with what token usage.
- Enforce output schemas.

---

## 12. DOCUMENTATION STANDARDS

This is where most assistants fall apart.

- Each file has a header block: what it does, what it depends on, what returns look like.
- Every function gets: purpose in one line, inputs, outputs, edge cases.
- A global README that covers: Features, Architecture, Tech stack, API endpoints, DB schema, Local dev commands, Deployment steps.
- A CHANGELOG for every push.
- Inline comments only where context is missing from naming.
- Counterpoint: don't comment what the code already makes obvious.

---

## 13. LOGGING AND DIAGNOSTICS

If this fails, debugging becomes guesswork.

- Standard log format: `{ level, message, context, timestamp }`.
- Levels: `debug`, `info`, `warn`, `error`, `critical`.
- All LLM interactions logged with inputs and outputs (safely).
- Every error thrown must have: human readable message, error code, context snapshot.
- Add tracing ID per user session so chains can be followed.

### Performance logging
- render times
- API latency
- DB latency
- Crash reports summarised to the assistant every build.

---

## 14. QUALITY RULES FOR OUTPUT

Make this your golden contract.

Never output code without:
- imports checked
- component and function naming clean
- no dead branches
- no unused variables
- no implicit any

- All code runnable without guessing missing pieces.
- All generated components are responsive.
- Always generate test data and edge-case tests.
- Ask for missing context only when blocking.
- Produce diffs when editing instead of rewriting everything blindly.

---

## 15. PROJECT-WIDE OPERATIONAL RULES

This is what keeps chaos down.

- Version numbers increase on every major structural change.
- No silent breaking changes.
- Assistant maintains a PROJECT_NOTES.md with running decisions.
- Every new feature gets: acceptance criteria, user flow, data flow, failure map.
- Weekly cleanup: dead code, unused components, old logs.
- Error budget for LLM hallucinations: detect violations of schemas and fix them automatically.

---

## 16. LLM PROMPTING RULES

This is core to vibe coding.

- All outputs follow a schema.
- LLM must confirm assumptions before proceeding if risk of wrong context is high.
- LLM must reason about dependencies before generating code.
- LLM must self-diagnose likely failure points before writing final output.
- Never generate partial flows; always map end-to-end.

---

*Last Updated: 2026-05-17*
*Version: 1.2.1 (post Phase 9 — pricing single-source, Library tab, personalized paywall, skill builder UX rebuild)*
