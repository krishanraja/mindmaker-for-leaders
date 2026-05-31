# Replication Guide

Step-by-step instructions to replicate CTRL from scratch.

**Last Updated:** 2026-05-31

> Current scope: 75 edge functions, 55 hooks, 101 migrations, pgvector + pgcrypto + pg_cron. This guide gets you to a runnable instance; full feature parity requires shipping each phase in order (see HISTORY.md), now including Phase 8 (Agent Skill Builder + desktop redesign) and Phase 9 (pricing, security, attribution, product-truth, prerender).

---

## Prerequisites

- Node.js >=22 <24 (the `package.json` engines field enforces this)
- npm or bun
- Supabase CLI (linked to a project; for the canonical CTRL instance, project ref = `bkyuxvschuwngtcdhsyg`)
- OpenAI API key (embeddings + fallback LLM + Whisper)
- Vertex AI service account JSON (primary LLM)
- Perplexity / Tavily / Brave API keys (briefing news providers - at least one required)
- ElevenLabs API key (briefing audio)
- Resend API key (transactional email)
- Stripe account + webhook secret (Edge Pro subscription + Diagnostic / Deep Context one-time)

---

## Step 1: Initialize Project

```bash
# Create React + TypeScript + Vite project
npm create vite@latest mindmaker -- --template react-ts
cd mindmaker

# Install core dependencies
npm install @supabase/supabase-js @tanstack/react-query
npm install react-router-dom zod
npm install tailwindcss postcss autoprefixer
npm install lucide-react class-variance-authority clsx tailwind-merge

# Install shadcn/ui
npx shadcn-ui@latest init
```

---

## Step 2: Configure Tailwind + Design System

**tailwind.config.ts**:
```ts
import type { Config } from "tailwindcss"

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: "hsl(var(--primary))",
        // ... (see DESIGN_SYSTEM.md for full list)
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
} satisfies Config
```

**src/index.css**: (see DESIGN_SYSTEM.md for full CSS variables)

---

## Step 3: Set Up Supabase

```bash
# Initialize Supabase project
supabase init

# Link to remote project
supabase link --project-ref YOUR_PROJECT_REF
```

**Important**: Do NOT use `supabase db push`. The local migration history is out of sync with remote for the canonical CTRL instance. Apply migrations directly via the Supabase Management API using SQL. For a fresh instance on your own project ref, `supabase db push` is safe. See `CLAUDE.md` for the Management API approach used on the canonical instance.

**Create `.env`**:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**src/integrations/supabase/client.ts**:
```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

## Step 4: Database Schema

Run migrations in `supabase/migrations/`:
1. Create `leaders` table
2. Create `leader_assessments` table
3. Create dimension/insights/prompts tables
4. Create `index_participant_data` table
5. Set up RLS policies

(See ARCHITECTURE.md for full schema)

---

## Step 5: Install shadcn Components

```bash
npx shadcn-ui@latest add button card badge input label
npx shadcn-ui@latest add tabs dialog select checkbox
npx shadcn-ui@latest add progress skeleton tooltip
```

---

## Step 6: Create Core Files

**src/types/pipeline.ts**: (see project-documentation/ARCHITECTURE.md)

**src/utils/pipelineGuards.ts**: Input validation

**src/utils/orchestrateAssessmentV2.ts**: Main orchestration logic

**src/utils/aggregateLeaderResults.ts**: Data aggregation

**src/utils/edgeFunctionClient.ts**: Edge function wrapper

---

## Step 7: Build UI Components

**src/components/HeroSection.tsx**: Landing page

**src/components/UnifiedAssessment.tsx**: Quiz + voice flow

**src/components/UnifiedResults.tsx**: Results with tabs

**src/components/LeadershipBenchmarkV2.tsx**: Overview tab

**src/components/TensionsView.tsx**: Tensions tab

**src/components/PromptLibraryV2.tsx**: Tools tab

---

## Step 8: Edge Functions

**supabase/functions/create-leader-assessment/index.ts**:
```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Parse request body
  // Create assessment record
  // Calculate scores
  // Return assessmentId
})
```

Create similar functions for:
- generate-personalized-insights
- generate-prompt-library
- compute-tensions
- compute-risk-signals
- derive-org-scenarios

**Deploy**:
```bash
supabase functions deploy function-name
```

---

## Step 9: Configure Secrets

In Supabase dashboard, add secrets:
- `OPENAI_API_KEY` - embeddings, fallback LLM, Whisper voice transcription
- `GOOGLE_SERVICE_ACCOUNT_KEY` - Vertex AI (Gemini 2.0 Flash primary LLM) JSON blob
- `RESEND_API_KEY` - transactional email
- `RESEND_WEBHOOK_SECRET` - Resend webhook signature verification
- `STRIPE_SECRET_KEY` - Stripe API
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signature verification (mandatory for payment security)
- `ELEVENLABS_API_KEY` - briefing audio synthesis
- `PERPLEXITY_API_KEY`, `TAVILY_API_KEY`, `BRAVE_SEARCH_API` - briefing news providers (at least one required)
- `MEMORY_ENCRYPTION_KEY` - AES-256-GCM key for Memory Web encryption at rest
- `WAREHOUSE_INGEST_URL` - (optional) MindmakerOS warehouse endpoint for attribution emit; emit is dormant until set

---

## Step 10: Set Up Routing

The app uses `createBrowserRouter` (React Router v6 data router API) with lazy-loaded pages and an `AuthedLayoutRoute` that wraps authenticated routes in the `CommandPaletteProvider`.

**src/router.tsx** (simplified):
```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { AuthedLayoutRoute } from '@/components/layout/AuthedLayoutRoute'

const Landing = lazy(() => import('@/pages/Landing'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
// ... other lazy-loaded pages

export const router = createBrowserRouter([
  { path: '/', element: <Suspense fallback={<Loading />}><Landing /></Suspense> },
  {
    element: <AuthedLayoutRoute />,
    children: [
      { path: '/dashboard', element: <Suspense fallback={<Loading />}><RequireAuth><Dashboard /></RequireAuth></Suspense> },
      // /memory, /context, /briefing, /settings, /compliance, /profile
    ],
  },
  // Legacy redirects: /today, /pulse, /voice, /diagnostic, /think → /dashboard
  { path: '*', element: <Suspense fallback={<Loading />}><NotFound /></Suspense> },
])
```

**src/main.tsx**:
```tsx
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </QueryClientProvider>
)
```

---

## Step 11: Test Locally

```bash
# Start dev server
npm run dev

# In separate terminal, start Supabase locally
supabase start

# Test edge functions locally
supabase functions serve
```

---

## Step 12: Deploy

**Frontend** (Lovable Cloud):
```bash
git push origin main  # Auto-deploys
```

**Edge Functions**:
```bash
supabase functions deploy --project-ref YOUR_REF
```

**Database**:
```bash
supabase db push --project-ref YOUR_REF
```

---

## Verification Checklist

- [ ] Landing page loads
- [ ] Quiz assessment completes
- [ ] Voice assessment completes
- [ ] Results display correctly
- [ ] All tabs work (Overview, Tensions, Tools)
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] Edge functions don't timeout
- [ ] Payment flow works
- [ ] Email confirmations send

---

## Daily Briefing Subsystem Setup (v2, Apr 2026)

Running the Briefing in its v2 / evidence-based form requires three things in addition to the base app: extensions, migrations, and edge functions.

**1. Enable PostgreSQL extensions**
```sql
CREATE EXTENSION IF NOT EXISTS vector;    -- embeddings (text-embedding-3-small, 1536 dims)
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- digest('sha256', ...) for lens signatures
CREATE EXTENSION IF NOT EXISTS pg_cron;   -- nightly aggregator schedule
```

**2. Apply migrations in order**
```
supabase/migrations/20260418000000_briefing_v2_pgvector_schema.sql   -- schema_version + feedback extension
supabase/migrations/20260419000000_briefing_interests.sql            -- user-declared beats/entities/excludes
supabase/migrations/20260419000001_industry_beat_library.sql         -- cold-start seeds (11 industries)
supabase/migrations/20260419000002_briefing_lens_feedback.sql        -- persistent negative feedback
supabase/migrations/20260419000003_briefing_aggregate_feedback_cron.sql  -- plpgsql aggregator + pg_cron schedule
```
All migrations are idempotent (`IF NOT EXISTS`, `ON CONFLICT DO UPDATE`).

**3. Deploy briefing edge functions**
```bash
supabase functions deploy \
  generate-briefing synthesize-briefing \
  briefing-diagnose get-industry-seeds \
  briefing-kill-lens-item briefing-aggregate-feedback
```

**4. Required secrets** (Supabase → Settings → Secrets)
- `OPENAI_API_KEY` - embeddings + curation LLM
- `PERPLEXITY_API_KEY`, `TAVILY_API_KEY`, `BRAVE_SEARCH_API` - at least one required; more = better recall
- `ELEVENLABS_API_KEY` - audio synthesis

**5. Optional env vars**
- `BRIEFING_V2_ENABLED_DEFAULT=true` - flip every user to v2. Leave unset (false) to roll out per-user via `user_memory.briefing_v2_enabled`.
- `BRIEFING_DEDUPE_THRESHOLD=0.87` - cosine threshold for headline dedupe
- `BRIEFING_EXCLUDE_THRESHOLD=0.80` - cosine threshold for user-exclude post-filter

**6. Verify cron job**
```sql
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'briefing-aggregate-feedback-nightly';
-- Expected: schedule='7 3 * * *', active=true
```

**7. Smoke test**
From an authenticated browser console:
```js
const r = await supabase.functions.invoke('briefing-diagnose')
console.log({
  lensSize: r.data.lens.length,
  interests: r.data.interests.length,
  lastSchema: r.data.last_briefing?.schema_version,
})
```
A healthy v2-ready user: `lensSize > 0`, `lastSchema === 2` (after first v2 generation).

---

## Common Setup Issues

**Issue**: Supabase client returns 401
**Fix**: Check VITE_SUPABASE_ANON_KEY is correct

**Issue**: Edge functions timeout
**Fix**: Increase timeout in Supabase dashboard, check OpenAI API key

**Issue**: Types out of sync
**Fix**: Run `supabase gen types typescript > src/integrations/supabase/types.ts`

**Issue**: CSS variables not applying
**Fix**: Ensure index.css imported in main.tsx

---

## Time Estimate

- Initial setup: 2 hours
- Database schema: 3 hours
- UI components: 8 hours
- Edge functions: 6 hours
- Testing & debugging: 4 hours

**Total**: ~23 hours for experienced developer
