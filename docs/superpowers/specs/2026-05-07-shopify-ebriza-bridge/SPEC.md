# Shopify → Ebriza Bridge — Specification

**Status:** Draft, pending Ebriza dev confirmation of items in `OPEN_QUESTIONS.md`
**Date:** 2026-05-07
**Owner:** Vasile Pop (agency)
**Client:** Coffee roaster, Cluj-Napoca, Romania (B2C retail)

## 1. Goal

Forward every paid Shopify order to Ebriza so that Ebriza, which remains the source of truth for fiscal documents and inventory, generates the customer invoice and decrements stock automatically. The bridge is one-way and stateless on the catalog axis: prices and stock are maintained manually by the client in both Shopify and Ebriza.

## 2. Scope

### In scope (v1)

- One-way push: Shopify `orders/paid` → Ebriza "Open bill with client request".
- HMAC verification on inbound Shopify webhooks; replay protection by webhook ID.
- Idempotent push to Ebriza, keyed by Shopify order ID.
- Manual reprocess endpoint for failed orders (admin-authenticated).
- Health and stats endpoints.
- Structured logging without PII; per-environment Wrangler deploy.

### Out of scope (v1)

- Bidirectional sync. Ebriza-side changes (stock, prices, menu) do not flow back to Shopify.
- Stock or price sync from Ebriza to Shopify. Client maintains both manually.
- Refund / cancellation / storno flow. To be added in v2 once Ebriza behaviour is confirmed (see `OPEN_QUESTIONS.md`).
- B2B invoicing (CIF/CUI capture). Client is B2C retail; if a buyer needs a B2B invoice they request it manually from the shop.
- Customer accounts / multi-store / multi-location. The client has one shop and one location.
- Custom Ebriza marketplace app. We use the standard **Web Ordering** app (`com.ebrizadev.webordering`).

## 3. Architecture summary

A Cloudflare Worker (Hono) exposes three HTTP routes. State lives in Cloudflare KV; no database in v1.

```
   ┌──────────┐                                 ┌──────────────┐
   │ Shopify  │── orders/paid webhook ─────────▶│   bridge     │── ebriza-clientid ──▶ Ebriza
   │  store   │                                 │   (Worker)   │
   └──────────┘                                 └──────────────┘
                                                        │
                                                        ├── KV: idempotency, mappings, failures
                                                        └── Logs: structured JSON, Cloudflare-captured
```

| Concern         | Choice                                                     |
| --------------- | ---------------------------------------------------------- |
| Hosting         | Cloudflare Workers (free tier, commercial use allowed)     |
| Framework       | Hono                                                       |
| State           | Cloudflare KV                                              |
| Language        | TypeScript strict                                          |
| Package manager | pnpm                                                       |
| Tests           | Vitest with `@cloudflare/vitest-pool-workers`              |
| Lint/format     | Biome                                                      |
| Hooks           | Lefthook (pre-commit: lint, typecheck, test)               |
| Deploy          | Wrangler, separate `staging` and `production` environments |

Rationale for each choice is documented in `ARCHITECTURE.md`.

## 4. Functional requirements

### 4.1 Receive `orders/paid` webhook from Shopify

**Route:** `POST /webhooks/shopify/orders-paid`

Steps in order:

1. **Capture the raw request body.** HMAC verification requires the byte-exact body, before any parsing. Hono exposes this via `c.req.raw.clone().text()`.
2. **Verify HMAC.** Compute `HMAC-SHA256(rawBody, SHOPIFY_WEBHOOK_SECRET)` and base64-encode. Compare to the `X-Shopify-Hmac-Sha256` request header in **constant time**. On mismatch, return `401 Unauthorized` with body `{ error: "invalid_hmac" }`.
3. **Replay protection.** Read `webhook_id:{X-Shopify-Webhook-Id}` from KV. If present, return `200 OK` immediately with body `{ status: "replay" }`. Skip subsequent steps.
4. **Order-level idempotency.** Read `order:{shopify_order_id}` from KV. If present, return `200 OK` with body `{ status: "already_pushed", ebriza_bill_id: <stored> }`. Skip subsequent steps.
5. **Parse the order JSON.** Validate required fields: `id`, `email`, `line_items[]`, `shipping_address` (or `billing_address` if shipping is null), `total_price`, `currency`, `subtotal_price`, `total_tax`, `total_shipping_price_set`. On schema failure, log the error class, return `200 OK` with body `{ status: "invalid_payload" }`, and write a `failed:{shopify_order_id}` entry (see §4.4 error handling).
6. **Map the order** into an Ebriza bill payload (see §5).
7. **Push to Ebriza** (see §4.2).
8. **Persist the result** (see §4.3).
9. **Return** the appropriate Shopify response (see §4.4).

### 4.2 Transform Shopify order → Ebriza bill payload

The mapping rules below are **field-shape TBD** in places — exact Ebriza field names are confirmed by reading the live API reference at `https://ebriza.com/docs/api` ("Open bill with client request") and are tracked in `OPEN_QUESTIONS.md`. Use the names below only as a working draft.

| Source (Shopify)                              | Target (Ebriza, draft)                            | Notes                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `line_items[].sku`                            | `items[].sku` (TBD)                               | Join key. Ebriza resolves the matching `Item` server-side.                                                                                   |
| `line_items[].quantity`                       | `items[].quantity`                                |                                                                                                                                              |
| `line_items[].price`                          | `items[].unitPrice` (TBD)                         | Currency assumed RON. TVA-inclusive vs exclusive — TBD, see open questions.                                                                  |
| `line_items[].title`                          | _not sent_                                        | Ebriza derives display name from its own item record.                                                                                        |
| `customer.first_name + last_name`             | `client.name`                                     |                                                                                                                                              |
| `email`                                       | `client.email`                                    | Required for invoice delivery.                                                                                                               |
| `phone` or `shipping_address.phone`           | `client.phone`                                    |                                                                                                                                              |
| `shipping_address.{address1, city, zip, ...}` | `client.address` or `delivery.address` (TBD)      | Used for delivery; whether Ebriza expects one combined address or split shipping/billing — TBD.                                              |
| `total_shipping_price_set.shop_money.amount`  | `delivery.cost` (TBD)                             | Shipping fee as a separate line item or as a delivery total — TBD.                                                                           |
| `total_discounts`                             | `discount.amount` (TBD)                           | Order-level discount.                                                                                                                        |
| `id`                                          | `externalOrderID` or equivalent (TBD)             | For traceability and Ebriza-side dedupe.                                                                                                     |
| `name` (e.g. `#1042`)                         | `externalOrderNo` (TBD)                           | Human-readable reference shown to staff in Ebriza.                                                                                           |
| `payment_gateway_names[0]`                    | `payments[].type`                                 | Card → `2`; bank transfer → `3`; cash on delivery → `1`. (Codes confirmed from earlier marketplace docs; same enum assumed for Web Ordering.) |

**SKU mismatch is fatal.** If any Shopify line item lacks a non-empty `sku`, or if Ebriza rejects the bill because a SKU is unknown, the bill push fails — we do **not** silently drop line items. A missing SKU produces a deterministic 4xx (see §4.4) and a `failed:{shopify_order_id}` KV entry; an operator must reconcile SKUs in Shopify or Ebriza, then trigger reprocess.

### 4.3 Push to Ebriza, persist result

**Endpoint, method, and exact path:** TBD per `OPEN_QUESTIONS.md`. Working assumption: `POST {EBRIZA_API_BASE}/bills/openWithClient` (or similar — confirm from the live docs).

**Request headers:**

```
Content-Type: application/json
ebriza-clientid: {EBRIZA_CLIENT_ID}
ebriza-appname: {EBRIZA_APP_NAME}    # value TBD; "com.ebrizadev.webordering" is plausible but unconfirmed
```

**On success (HTTP 2xx):**

- Extract `ebriza_bill_id` from the response body.
- `KV.put("order:{shopify_order_id}", JSON.stringify({ ebriza_bill_id, pushed_at }))` — **no TTL** (permanent).
- `KV.put("webhook_id:{X-Shopify-Webhook-Id}", "1", { expirationTtl: 7 * 24 * 60 * 60 })` — 7 days.
- Increment `stats:pushed:{YYYY-MM-DD}` counter (KV, TTL 30 days).
- Return Shopify `200 OK` with body `{ status: "pushed", ebriza_bill_id }`.

**On Ebriza 4xx (deterministic failure — bad payload, unknown SKU, malformed customer data):**

- Log the request URL, response status, and a redacted response body.
- `KV.put("failed:{shopify_order_id}", JSON.stringify({ shopify_order_id, error_class, ebriza_status, ebriza_error_summary, payload_hash, failed_at }))` — TTL 30 days.
- Increment `stats:failed:{YYYY-MM-DD}` counter (KV, TTL 30 days).
- Return Shopify `200 OK` with body `{ status: "failed_deterministic", reason }`. We **do not** ask Shopify to retry a deterministic failure — retries won't help and produce noise.
- Surface to the on-call channel via the alerting hook (Slack/email — see §6).

**On Ebriza 5xx or network/timeout error (transient failure):**

- Within the request, retry with exponential backoff: 200 ms, 600 ms, 1.4 s. Three attempts max; total budget ≤ 5 s to stay well under Workers' 30 s subrequest limit.
- If still failing after the retries: log, return Shopify **`500 Internal Server Error`** with body `{ status: "transient_failure" }`. Shopify will retry the webhook on its own schedule (~48 h, exponential backoff). Do **not** persist a `failed:{...}` entry yet — Shopify's retry will replay the whole flow.

### 4.4 Manual reprocess endpoint

**Route:** `POST /admin/reprocess/:shopify_order_id`

**Auth:** `Authorization: Bearer {ADMIN_TOKEN}`. Reject `401` on mismatch.

**Use case:** an operator fixed an upstream issue (corrected a SKU in Ebriza, or Ebriza came back online) and wants to retry pushing a known-failed order.

**Behavior:**

1. Read `failed:{shopify_order_id}` from KV. If absent → `404 Not Found`.
2. Re-fetch the original Shopify order via Shopify Admin API (so we always push the latest order data, not a stale snapshot). Requires `SHOPIFY_ADMIN_TOKEN` + `SHOPIFY_STORE_DOMAIN`.
3. Run §4.2 mapping and §4.3 push.
4. On success: delete the `failed:{...}` entry, write `order:{...}` per the success path. Return `200 OK { status: "pushed", ebriza_bill_id }`.
5. On failure: refresh `failed:{...}` with the new error, return `200 OK { status: "still_failing", reason }` (so the operator can act again).

### 4.5 Health and stats

**`GET /health`** — public, no auth. Returns `200 OK { status: "ok", version: "<git-sha>" }`. Used by uptime probes.

**`GET /admin/stats`** — bearer-auth. Returns:

```json
{
  "last_24h": {
    "pushed": 14,
    "failed_deterministic": 1,
    "transient_failures": 0
  },
  "failed_orders": [
    {
      "shopify_order_id": "5123456789",
      "error_class": "unknown_sku",
      "failed_at": "2026-05-07T08:14:32Z",
      "ebriza_error_summary": "Item with SKU 'COF-ETH-250' not found"
    }
  ]
}
```

`failed_orders` is read by listing `KV.list({ prefix: "failed:" })`; counts come from the daily counter keys.

## 5. Payload examples

### 5.1 Shopify `orders/paid` (abbreviated, real fields, mock values)

```json
{
  "id": 5123456789,
  "name": "#1042",
  "email": "andrei.popescu@example.com",
  "phone": "+40700000000",
  "currency": "RON",
  "subtotal_price": "120.00",
  "total_tax": "10.83",
  "total_price": "140.00",
  "total_shipping_price_set": {
    "shop_money": { "amount": "20.00", "currency_code": "RON" }
  },
  "total_discounts": "0.00",
  "payment_gateway_names": ["shopify_payments"],
  "line_items": [
    {
      "id": 14000000001,
      "sku": "COF-ETH-YRG-250",
      "title": "Etiopia Yirgacheffe — 250g",
      "quantity": 1,
      "price": "65.00"
    },
    {
      "id": 14000000002,
      "sku": "COF-BRA-CER-250",
      "title": "Brazilia Cerrado — 250g",
      "quantity": 1,
      "price": "55.00"
    }
  ],
  "customer": {
    "first_name": "Andrei",
    "last_name": "Popescu",
    "email": "andrei.popescu@example.com"
  },
  "shipping_address": {
    "first_name": "Andrei",
    "last_name": "Popescu",
    "address1": "Strada Republicii 12",
    "address2": "Ap 4",
    "city": "Cluj-Napoca",
    "zip": "400015",
    "country": "Romania",
    "country_code": "RO",
    "phone": "+40700000000"
  }
}
```

### 5.2 Ebriza "Open bill with client request" — **draft, field names TBD**

Working draft — field names below are placeholders pending confirmation against the live API reference. Mark every TBD' field in `OPEN_QUESTIONS.md` and replace before implementation.

```json
{
  "externalOrderID": "5123456789",
  "externalOrderNo": "#1042",
  "client": {
    "name": "Andrei Popescu",
    "email": "andrei.popescu@example.com",
    "phone": "+40700000000",
    "address": "Strada Republicii 12, Ap 4, Cluj-Napoca, 400015, Romania"
  },
  "items": [
    { "sku": "COF-ETH-YRG-250", "quantity": 1, "unitPrice": 65.00 },
    { "sku": "COF-BRA-CER-250", "quantity": 1, "unitPrice": 55.00 }
  ],
  "delivery": {
    "address": "Strada Republicii 12, Ap 4, Cluj-Napoca, 400015, Romania",
    "cost": 20.00
  },
  "payments": [
    { "type": 2, "amount": 140.00 }
  ]
}
```

### 5.3 Successful Ebriza response (assumed shape, TBD)

```json
{
  "billID": "ebr_01H9K3X...",
  "billNo": "BL-2026-001234",
  "fiscalReceiptNo": "0001234"
}
```

## 6. Non-functional requirements

### 6.1 Secrets

All secrets are stored as Wrangler secrets, never in source.

| Secret                 | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `SHOPIFY_WEBHOOK_SECRET` | HMAC verification on inbound webhooks            |
| `SHOPIFY_ADMIN_TOKEN`    | Reprocess endpoint refetches order from Admin API |
| `SHOPIFY_STORE_DOMAIN`   | e.g. `noima.myshopify.com`                       |
| `EBRIZA_CLIENT_ID`       | `ebriza-clientid` header value                    |
| `EBRIZA_APP_NAME`        | `ebriza-appname` header value (TBD)               |
| `EBRIZA_API_BASE`        | Default `https://api.ebriza.com`                  |
| `ADMIN_TOKEN`            | Bearer for `/admin/*` routes                      |

Set per-environment via `wrangler secret put <NAME> --env staging|production`.

### 6.2 Transport security

TLS only — Cloudflare Workers do not accept plain HTTP. Outbound calls to Ebriza go to `https://api.ebriza.com`.

### 6.3 Logging

Structured JSON, one log line per event, written to `console.log`. Cloudflare captures these to its dashboard; pipe to an external sink later if volume warrants.

**Log fields per request:**

```json
{
  "ts": "2026-05-07T10:00:00Z",
  "event": "shopify_orders_paid",
  "shopify_order_id": "5123456789",
  "shopify_webhook_id": "abc-...",
  "outcome": "pushed | replay | already_pushed | failed_deterministic | transient_failure | invalid_hmac | invalid_payload",
  "ebriza_status": 200,
  "ebriza_bill_id": "ebr_...",
  "error_class": null,
  "latency_ms": 412
}
```

**Never log:**
- Raw Shopify webhook bodies.
- Raw Ebriza request bodies.
- Customer email, phone, or address.
- Bearer tokens, client IDs (the `EBRIZA_CLIENT_ID` is a credential, not a public identifier).

When a deterministic Ebriza failure occurs and the operator needs to debug, they read the `failed:{...}` KV entry, which contains a `payload_hash` (SHA-256 of the request body) but not the body itself. To inspect the actual payload, the operator runs the reprocess endpoint locally with verbose mode toggled on a one-off Wrangler dev session.

### 6.4 GDPR

The data flowing through the bridge is in scope of GDPR (Romanian customers, EU). Mitigations:

- **Data minimization.** Only fields Ebriza actually needs are sent. Cart attributes, browser fingerprints, marketing tags from Shopify are dropped at the mapping step.
- **Retention.**
  - `webhook_id:*` — 7 days. Not PII.
  - `order:{shopify_order_id}` — permanent (small JSON: `{ ebriza_bill_id, pushed_at }`). Not PII.
  - `failed:{shopify_order_id}` — 30 days. May contain customer email/phone/address inside `payload_hash`'s preimage, but we store the hash only. So no PII at rest.
  - `stats:*` — 30 days. Counts only.
- **PII never reaches logs** (§6.3).
- **Right to erasure.** If a customer requests deletion, Shopify's standard workflow propagates: agency staff manually delete the customer record in Shopify and Ebriza. The bridge holds no PII to delete.

### 6.5 Cost

Ebriza's Web Ordering app charges **0.06 EUR per order pushed**, billed by Ebriza directly to the merchant. Document this in the client's onboarding email. Cloudflare Workers free tier covers up to 100k requests/day; the client is far below this.

## 7. Repository layout

```
/                       # repo root
├── src/
│   ├── routes/
│   │   ├── webhook-shopify.ts   # POST /webhooks/shopify/orders-paid
│   │   └── admin.ts             # POST /admin/reprocess/:id, GET /admin/stats, GET /health
│   ├── lib/
│   │   ├── shopify-hmac.ts      # constant-time HMAC verify
│   │   ├── ebriza-client.ts     # typed client for Open-bill-with-client endpoint
│   │   ├── order-mapper.ts      # Shopify order → Ebriza payload
│   │   ├── kv-keys.ts           # KV key conventions (one source of truth for prefixes)
│   │   └── logger.ts            # structured JSON logger
│   ├── types/
│   │   ├── shopify.ts           # Shopify orders/paid payload types
│   │   └── ebriza.ts            # Ebriza request/response types
│   └── index.ts                 # Hono app entrypoint, route registration
├── test/                        # mirrors src/, Vitest with @cloudflare/vitest-pool-workers
├── wrangler.toml
├── package.json
├── biome.json
├── lefthook.yml
├── .env.example
├── README.md
├── SPEC.md                      # this file
├── ARCHITECTURE.md
└── OPEN_QUESTIONS.md
```

## 8. KV key conventions

Single source of truth in `src/lib/kv-keys.ts`:

```ts
export const kvKey = {
  webhookId: (id: string) => `webhook_id:${id}`,
  order: (shopifyOrderId: string) => `order:${shopifyOrderId}`,
  failed: (shopifyOrderId: string) => `failed:${shopifyOrderId}`,
  statsPushed: (yyyymmdd: string) => `stats:pushed:${yyyymmdd}`,
  statsFailed: (yyyymmdd: string) => `stats:failed:${yyyymmdd}`,
};
```

| Prefix         | TTL     | Value shape                                                                              |
| -------------- | ------- | ---------------------------------------------------------------------------------------- |
| `webhook_id:`  | 7d      | `"1"` (presence-only)                                                                    |
| `order:`       | none    | `{ ebriza_bill_id: string, pushed_at: string }`                                          |
| `failed:`      | 30d     | `{ shopify_order_id, error_class, ebriza_status, ebriza_error_summary, payload_hash, failed_at }` |
| `stats:pushed:` | 30d    | integer counter                                                                          |
| `stats:failed:` | 30d    | integer counter                                                                          |

## 9. Error matrix

| Trigger                                                  | Bridge action                                                                                                                | Returned to Shopify        | Operator action          |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------ |
| Missing `X-Shopify-Hmac-Sha256` header                   | Log; return immediately                                                                                                       | `401 invalid_hmac`         | None — likely abuse      |
| HMAC mismatch                                            | Log                                                                                                                          | `401 invalid_hmac`         | Verify webhook secret    |
| Replay (`webhook_id` exists)                             | Skip                                                                                                                         | `200 replay`               | None                     |
| Already pushed (`order:` exists)                         | Skip                                                                                                                         | `200 already_pushed`       | None                     |
| Schema invalid (missing `id` or `line_items`)            | Write `failed:` entry; alert                                                                                                | `200 invalid_payload`      | Investigate manually     |
| Line item without SKU                                    | Write `failed:` entry; alert                                                                                                | `200 failed_deterministic` | Add SKU in Shopify, reprocess |
| Ebriza 4xx unknown SKU                                   | Write `failed:` entry; alert                                                                                                | `200 failed_deterministic` | Add SKU in Ebriza, reprocess  |
| Ebriza 4xx other (bad payload, missing required field)   | Write `failed:` entry; alert. Re-evaluate mapping before reprocess.                                                          | `200 failed_deterministic` | Fix bug or data, reprocess    |
| Ebriza 5xx after retries                                 | No KV write (Shopify will retry the whole flow)                                                                              | `500 transient_failure`    | Watch logs; if persistent, ping Ebriza |
| Network timeout on Ebriza                                | No KV write                                                                                                                  | `500 transient_failure`    | Same as above                  |
| Unhandled exception                                      | Log; do **not** swallow                                                                                                      | `500`                      | Investigate; bug fix     |

## 10. Testing strategy

Vitest with `@cloudflare/vitest-pool-workers` so tests run in the same Workers runtime as production. **High-coverage targets (≥95% line) for these three areas**, lower elsewhere:

1. **`shopify-hmac.ts`.** Verify constant-time compare, base64 edge cases, missing/empty header handling, body-byte exactness. Use known test vectors.
2. **`order-mapper.ts`.** Snapshot tests of mapped payloads from realistic Shopify samples (ours from §5.1, plus a few edge variants: no shipping address, multiple line items same SKU, RON with non-integer prices, missing optional fields).
3. **Idempotency in `webhook-shopify.ts`.** Replay (same `webhook_id`), already-pushed (same `order:`), and the race where two webhooks fire simultaneously (KV is eventually consistent — design must tolerate the rare double-write; the second one observes the first's `order:` entry on the ms-timescale Cloudflare KV reads converge).

Lower-priority, smoke-only: routes (Hono integration), KV key generation, logger. Mock the Ebriza HTTP client; do not hit the live Ebriza API in CI.

## 11. Deployment

`wrangler.toml` defines two environments. Per-environment secrets are set via `wrangler secret put`.

```toml
name = "ebriza-bridge"
main = "src/index.ts"
compatibility_date = "2026-05-01"

[env.staging]
kv_namespaces = [
  { binding = "KV", id = "..." }
]
vars = { EBRIZA_API_BASE = "https://api.ebriza.com" }

[env.production]
kv_namespaces = [
  { binding = "KV", id = "..." }
]
vars = { EBRIZA_API_BASE = "https://api.ebriza.com" }
```

**Promotion flow:** PR merge → CI builds & runs Vitest → manual `pnpm wrangler deploy --env staging` → smoke-test reprocess endpoint → manual `pnpm wrangler deploy --env production`.

**Rollback:** `wrangler rollback` — Cloudflare keeps the previous version.

## 12. Operations runbook (one-pager)

- **An order didn't reach Ebriza.** Check `GET /admin/stats` for a `failed:` entry on that Shopify order ID. If present, read `error_class` to choose the fix:
  - `unknown_sku` → fix SKU in Ebriza, then `POST /admin/reprocess/:id`.
  - `invalid_payload` → likely a bug; capture details, escalate.
  - `transient_failure` (this won't appear in `failed:` — Shopify is still retrying) → watch logs; if Shopify gives up after 48 h, manually re-fire the webhook from the Shopify admin's webhook history.
- **Bridge is down.** `GET /health` returns non-200 or times out. Check Cloudflare Workers status, then redeploy: `pnpm wrangler deploy --env production`. While down, Shopify queues webhooks for 48 h — no order is lost as long as we recover within that window.
- **Suspicious activity.** Logs show many `invalid_hmac` events from non-Shopify IPs. Confirm Shopify webhook secret hasn't leaked; rotate via Shopify admin + `wrangler secret put`.
- **Cost spike.** Each pushed order = 0.06 EUR to Ebriza. Reconcile with `stats:pushed:*` counts.

## 13. Versioning and migration

- Spec is versioned by date in the filename (this is `2026-05-07`). Material changes to mapping or routes bump the date and the old file is preserved for audit.
- A future migration to a custom Ebriza marketplace app (if bidirectional sync becomes necessary) is described in `ARCHITECTURE.md` §"Future migration path". The KV key namespace is forward-compatible — bidirectional state would live under different prefixes.
