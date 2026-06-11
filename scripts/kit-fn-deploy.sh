#!/usr/bin/env bash
# Deploy all Kit Engine edge functions plus the three touched by additive
# changes. Requires SUPABASE_ACCESS_TOKEN (sbp) in the environment and the
# linked supabase CLI. Run from the repo root.
set -euo pipefail

FUNCTIONS=(
  kit-redeem
  kit-compose
  kit-capsule-ingest
  send-kit-pack
  send-kit-nudges
  track-event
  generate-skill-export
  free-skill-export
)

for fn in "${FUNCTIONS[@]}"; do
  echo "== deploying $fn"
  supabase functions deploy "$fn" --project-ref bkyuxvschuwngtcdhsyg
done

echo "All kit functions deployed."
