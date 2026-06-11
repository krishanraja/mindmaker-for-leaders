#!/usr/bin/env bash
# One-shot Kit Engine production deploy: migrations + seed, then all edge
# functions. Idempotent. Requires SUPABASE_ACCESS_TOKEN (sbp) in the env.
#   SUPABASE_ACCESS_TOKEN=sbp_xxx bash scripts/kit-deploy.sh
set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN (sbp token) in the env}"

echo "=== 1/2  database: migrations + seed ==="
node scripts/kit-db-deploy.mjs "$SUPABASE_ACCESS_TOKEN"

echo ""
echo "=== 2/2  edge functions ==="
bash scripts/kit-fn-deploy.sh

echo ""
echo "Kit Engine backend deployed."
