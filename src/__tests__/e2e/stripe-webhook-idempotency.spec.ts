/**
 * E2E contract: Stripe webhook idempotency.
 *
 * The audit's Week 1 P0-1 closed two flaws: forged webhooks (no signature
 * verification when the secret was unset) and replayed webhooks
 * (Stripe retries up to 3 days; without dedup we'd re-grant access on
 * every retry).
 *
 * This spec exercises the receiver side directly - it doesn't need a real
 * browser. Run with `npx playwright test stripe-webhook-idempotency`.
 * Stripe's `--forward-to` CLI is the practical way to drive the
 * webhook against a deployed endpoint; this spec uses fetch + a fixture
 * to keep the contract close to the assertions.
 *
 * Skipped until env-vars and a Stripe-CLI sidecar are wired. The
 * `STRIPE_TEST_WEBHOOK_URL` and `STRIPE_TEST_SIGNING_SECRET` env vars
 * point to the test project's webhook and the signing secret used to
 * sign the payload below.
 */

import { test, expect } from '@playwright/test';
import { createHmac } from 'node:crypto';

const WEBHOOK_URL = process.env.STRIPE_TEST_WEBHOOK_URL;
const SIGNING_SECRET = process.env.STRIPE_TEST_SIGNING_SECRET;

function signStripePayload(payload: string, secret: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const signed = `${ts}.${payload}`;
  const v1 = createHmac('sha256', secret).update(signed).digest('hex');
  return `t=${ts},v1=${v1}`;
}

test.describe.skip('Stripe webhook - signature + idempotency', () => {
  test('Refuses unsigned payload with 400/503', async () => {
    if (!WEBHOOK_URL) test.skip(true, 'STRIPE_TEST_WEBHOOK_URL not set');
    const res = await fetch(WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'evt_forged', type: 'checkout.session.completed' }),
    });
    expect([400, 503]).toContain(res.status);
  });

  test('Accepts signed payload with 200, replay returns already_processed', async () => {
    if (!WEBHOOK_URL || !SIGNING_SECRET) {
      test.skip(true, 'STRIPE_TEST_WEBHOOK_URL/STRIPE_TEST_SIGNING_SECRET not set');
    }
    const eventId = `evt_test_${Date.now()}`;
    const payload = JSON.stringify({
      id: eventId,
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test', metadata: { assessment_id: '00000000-0000-0000-0000-000000000000' } } },
    });
    const sig = signStripePayload(payload, SIGNING_SECRET!);

    const first = await fetch(WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
      body: payload,
    });
    expect(first.status).toBe(200);

    const second = await fetch(WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
      body: payload,
    });
    expect(second.status).toBe(200);
    const body = await second.json();
    expect(body.already_processed).toBe(true);
    expect(body.event_id).toBe(eventId);
  });
});
