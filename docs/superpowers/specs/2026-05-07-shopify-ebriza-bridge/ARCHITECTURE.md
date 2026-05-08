# Architecture — Shopify → Ebriza Bridge

**Companion document to** `SPEC.md`. This file explains *why* each major decision was made, so a future engineer (or another Claude) can tell whether the constraints still apply before changing course.

## Why Cloudflare Workers (not Vercel, Railway, AWS)

- **Free tier covers production-realistic load.** 100k requests/day on Workers Free, with commercial use allowed. The client averages well under 100 paid orders/day; even with replays, polling, and admin probes we stay in the free band.
- **No cold start.** Webhook handlers must respond inside Shopify's 5-second window. Workers (V8 isolates) start sub-millisecond, where Vercel/AWS Lambda Node.js can take hundreds of ms cold.
- **Native TypeScript + native KV.** No build pipeline overhead, no separate Redis/Upstash account.
- **Single platform for HTTP + storage.** Workers + KV are colocated; no cross-service auth or latency.
- **Wrangler is straightforward.** One config file, secrets via CLI, environments with one-line config, instant rollback.

The marketing site lives on Vercel. Splitting the bridge to a different platform is **deliberate** — it isolates blast radius (a Workers outage does not affect the marketing site, and vice versa), and it puts the bridge on the platform whose runtime characteristics best match its workload (low-latency, low-volume, secret-handling).

## Why one-way (Shopify → Ebriza only)

The merchant maintains products, prices, and stock manually in both systems. This is a **deliberate operational choice by the client**, not a technical constraint:

- Catalog volume is small (dozens of SKUs, not thousands). Manual upkeep is feasible.
- Avoids the failure modes of automated catalog sync: drift, deletes, race conditions on stock during the till + Shopify checkout overlap.
- Ebriza has no `stock.changed` / `price.changed` webhook (confirmed during prior research). One-way pulling would have to be polling-based, with all the staleness and rate-limit risks that brings.
- Out of scope rules apply: no stock sync, no price sync, no product creation. Period.

If future requirements push back on this — typically because the catalog grows past what humans can sync by hand — the migration is to (a) a custom Ebriza marketplace app for read access, plus (b) a separate periodic sync worker. That is documented in *Future migration path* below.

## Why the Web Ordering app (not a custom marketplace app)

Ebriza offers two integration shapes:

1. **Web Ordering app (`com.ebrizadev.webordering`)** — a pre-built integration meant for "online store ↔ POS" flows. The merchant installs it from Ebriza Marketplace, gets a `client ID`, and the merchant's own server pushes orders via a simplified endpoint that requires only `ebriza-clientid` (no Bearer token dance per request).
2. **Custom marketplace app** — register your app, get an `app_id` + `secret`, run an OAuth2-style token flow per merchant, broader API surface (items, stocks, full bills/orders/invoices/clients).

We chose **Web Ordering** because:

- The integration is one-way push of paid orders. Web Ordering's surface is exactly that.
- No developer-account email-based webhook setup is required.
- The HoReCa-shaped flows (menu push, table management, room states, bill states) are irrelevant to a coffee-bag retail shop. A custom app would expose them but we'd never use them.
- It is the **path Ebriza's own docs recommend** for "integrate website with Ebriza".

This choice has a cost we accept: **0.06 EUR per pushed order**, billed by Ebriza to the merchant. At our volumes that is a small fixed cost; if it ever became material we would re-evaluate against the engineering cost of a custom app.

## Why SKU as the join key (not a stored ID mapping)

`bills/openWithClient` (and the equivalent endpoint) accepts SKUs directly — Ebriza resolves them server-side against its `Item` records. This means:

- We don't have to call any preliminary Ebriza endpoint to look up Ebriza-side IDs.
- We don't have to maintain a `sku → ebriza_item_id` mapping table or a Shopify metafield.
- Stale-mapping bugs are impossible — Ebriza always uses its current state.
- The trade-off is that the merchant must keep SKUs identical between Shopify and Ebriza. This is a discipline that is easy to communicate ("the SKU in the Shopify variant must match the code in Ebriza") and easy to audit (a one-shot diff script).

If a Shopify SKU has no Ebriza match, Ebriza returns 4xx and we surface a `failed:` entry. The fix is in the merchant's data, not in our code.

## Why KV (not D1)

KV is a flat key-value store with eventual consistency on the order of seconds and the simplest mental model. D1 is SQLite-on-Workers with tables, joins, and transactions.

For v1's needs — three key prefixes, no joins, no aggregations beyond per-day counters — KV is sufficient and avoids:

- Schema migrations.
- Long-tail correctness traps in D1 (`PRAGMA`s, alpha-status feature surface area).
- The cognitive overhead of designing a schema that won't survive contact with the v2 requirements anyway.

If/when we need durable, queryable history (e.g., "show me all failed orders this quarter, grouped by error class"), we migrate to D1. The migration path is straightforward because every KV write goes through `src/lib/kv-keys.ts`; we add a parallel D1 write, backfill from KV, then cut over.

## Threat model

**Trust boundaries:**

- Cloudflare Workers (us) — trusted runtime.
- Shopify webhook senders — verified by HMAC. Anyone else hitting our webhook endpoint without a valid signature is rejected.
- Ebriza API endpoint — verified by TLS cert chain, authenticated by our `ebriza-clientid`.
- Operators using `/admin/*` — authenticated by a long-lived bearer token in env.

**In-scope threats:**

| Threat                                              | Mitigation                                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Forged webhook (attacker pushes a fake paid order)  | HMAC verification with constant-time compare; reject 401 on mismatch.               |
| Replay of a real webhook (cause double-invoice)     | Replay protection by `X-Shopify-Webhook-Id` (7-day TTL) + order-level idempotency by `shopify_order_id` (permanent). |
| Stolen `EBRIZA_CLIENT_ID`                           | Rotate via Wrangler. Ebriza-side client ID rotation flow — confirm with Ebriza.     |
| Stolen `ADMIN_TOKEN`                                | Rotate via Wrangler. Bearer is checked on every `/admin/*` request.                 |
| PII leakage via logs                                | Log policy in SPEC §6.3. No raw bodies. Code-review enforces.                       |
| Brute force on `/admin/*`                           | Bearer token is high-entropy random; Cloudflare's bot management blocks egregious abuse. Rate-limit later if needed. |

**Out of scope:**

- Compromise of the Shopify admin (out of our control).
- Compromise of the Ebriza account (same).
- Cloudflare account takeover (mitigated by 2FA on the Cloudflare account, which is the agency's responsibility per the customer-account-handover spec).

## Failure modes and recovery

| Failure                                            | Detection                              | Recovery                                                                            |
| -------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| Bridge down (Worker offline)                       | `/health` probe + Shopify webhook retries piling up | Redeploy. Shopify retries for 48 h, no orders lost within that window.              |
| Ebriza down (5xx)                                  | Worker returns 500; Shopify retries    | None — Shopify retries until Ebriza recovers. After 48 h, replay manually from Shopify webhook history. |
| SKU mismatch                                       | `failed:` KV entry + alert             | Operator fixes in Shopify or Ebriza, calls `/admin/reprocess/:id`.                  |
| Mapping bug (unknown field shape)                  | `failed:` KV entry + log error_class   | Fix code, deploy, reprocess.                                                        |
| KV unavailable                                     | Worker exception; Shopify gets 500     | Cloudflare KV is highly available; if it does flake, Shopify will retry.            |
| Webhook secret rotated, bridge not yet updated     | All requests return 401                | `wrangler secret put` and redeploy.                                                 |
| Operator triggers reprocess too aggressively       | Cost goes up (0.06 EUR/push)            | Soft cap on reprocess attempts per order/day in v2 if abuse appears.                |

## Future migration path

When the merchant's workflow outgrows v1 (typical triggers: catalog grows large enough that manual price/stock sync is painful, or refunds become common enough that storno automation matters), the next iteration is:

1. **Register a custom Ebriza marketplace app.** Get `APP_ID` + `APP_SECRET`. Implement the OAuth2 token flow. Cache tokens in KV (25-min TTL).
2. **Add catalog read.** Periodically poll `GET /items` and `GET /stocks`, push deltas to Shopify via Admin API. Same Worker can host this in a Cron Trigger.
3. **Refund/storno flow.** Subscribe to Shopify `refunds/create`. Issue Ebriza storno via the marketplace endpoint (`/orders/invoice` with `type: 3` per the marketplace docs).
4. **Move to D1** for queryable history of catalog syncs and refund records.

Crucially, **the v1 push flow does not need to change** — it can keep using Web Ordering credentials. The two integrations coexist on the same `EBRIZA_CLIENT_ID` (one for the simplified push, the other for the marketplace endpoints).

## Why these specific JSON shapes (and where TBD lives)

The Ebriza API's exact field names for "Open bill with client request" are not in the public Intercom articles. The marketplace docs (read separately) suggest `bills/openpaid` with `externalOrderID`, `clientID`, `items[].sku/quantity/unitPrice`, `payments[].type`. The Web Ordering simplified endpoint **may** share these shapes, but is not guaranteed to. Every TBD field in `SPEC.md` §5.2 is tracked in `OPEN_QUESTIONS.md`.

The implementer's first task is to read the live Swagger UI at `https://ebriza.com/docs/api`, find "Open bill with client request", confirm or correct each field name, and update `SPEC.md` + `OPEN_QUESTIONS.md` in the same PR. **Do not start writing code until those fields are confirmed.**
