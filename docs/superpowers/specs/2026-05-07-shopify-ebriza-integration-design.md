# Shopify ↔ Ebriza Integration — Design

**Status:** Design (pending user review)
**Date:** 2026-05-07
**Owner:** Vasile Pop (agency)

## 1. Goal

Make Ebriza the source of truth for product **prices and stock** for the Noima Shopify store, and have Ebriza **automatically issue a fiscal invoice (factură)** for every paid Shopify order. The customer's coffee shop already runs on Ebriza; the same physical inventory is sold both at the till and on Shopify, so the two systems must stay reconciled.

## 2. Scope

### In scope (v1)

- Periodic catalog sync from Ebriza → Shopify: stock and prices, matched by SKU.
- Per-order invoice creation in Ebriza when a Shopify order is paid, with B2B handling when a CIF/CUI is supplied.
- Ebriza emails the invoice PDF to the customer.
- Failure notifications via Resend email to `hello@prajitorianoima.ro`.
- Manual operator workflow for retrying failed invoice deliveries (via Shopify's "resend webhook" UI).

### Out of scope (v1)

- Refund/return handling. Shop staff will manually issue storno invoices in Ebriza when a Shopify refund occurs. Stock will reconcile naturally on the next poll cycle.
- Admin UI for sync status / failed jobs. Vercel logs + Resend emails are the entire operations surface in v1.
- Multi-location aggregation. The integration runs against a single configured `EBRIZA_LOCATION_ID`.
- Bidirectional product creation. Products are created manually in Shopify with the same SKU as their Ebriza counterpart. Ebriza is not informed of new Shopify products.
- Customer/contact sync. Customers are looked up or created in Ebriza per-order via `clients/getOrAdd`.
- Real-time stock sync. A 10–20 minute window is acceptable; staff handle the rare oversell at fulfillment time.

## 3. Decisions

| Topic | Choice | Notes |
|---|---|---|
| Product lifecycle | Created manually in Shopify, linked to Ebriza by SKU | Shopify owns marketing copy / images / SEO |
| Catalog sync direction | Ebriza → Shopify | One-way; stock + prices |
| Sync mechanism | Polling | Ebriza has no `stock.changed` / `price.changed` webhooks |
| Sync cadence | Stock every 10 min, prices every 60 min | Via Vercel Cron |
| Latency tolerance | 10–20 min staleness on Shopify is acceptable | Coffee shop till and Shopify share inventory |
| Invoice document type | `factură` (full invoice) for every order | If `CUI` present in cart attributes → B2B invoice with company info |
| Invoice delivery | Ebriza emails the PDF to the customer | Confirmed via `POST /orders/invoice` docs |
| Refund handling | Manual by staff in Ebriza | No integration support in v1 |
| Runtime | Standalone Node.js service on Vercel, separate repo from the marketing site | Suggested name: `noima-ebriza-bridge` |
| Framework | Hono | Tiny, TypeScript-first, easy raw-body access for HMAC verification |
| State storage | Shopify metafields + Vercel KV | No Postgres in v1 |
| Failure handling | Return 5xx from webhook → Shopify retries (~48h, exponential backoff). Email on persistent failure. | Shopify's built-in retry replaces a durable queue |
| CIF capture | Cart-page field on `noima-coffee-theme`, stored in `cart.attributes`, surfaced as `order.note_attributes` | Shopify Basic plan does not support Checkout UI Extensions (Plus only) |

## 4. Architecture overview

A new private GitHub repo `noima-ebriza-bridge`, deployed as its own Vercel project. The service has no UI in v1; it exposes three HTTP routes plus two cron handlers.

```
                     ┌─────────────────────┐
                     │  Vercel Cron 10m/60m│──── poll ───┐
                     └─────────────────────┘             ▼
   ┌──────────┐                                  ┌──────────────┐
   │ Shopify  │── orders/paid webhook ──────────▶│   noima-     │
   │  store   │                                  │   ebriza-    │── token / API ──▶ Ebriza
   │          │◀── Admin API (mutations) ────────│    bridge    │
   └──────────┘                                  └──────────────┘
                                                        │
                                                        ├── Vercel KV (token cache, cursors)
                                                        └── Resend (failure emails)
```

### Routes

| Method | Path | Purpose | Triggered by |
|---|---|---|---|
| `POST` | `/webhooks/shopify/orders-paid` | Create Ebriza invoice for the order | Shopify webhook |
| `GET`  | `/api/cron/sync-stock`  | Poll Ebriza stocks, push deltas to Shopify | Vercel Cron, every 10 min |
| `GET`  | `/api/cron/sync-prices` | Poll Ebriza items, push price changes to Shopify | Vercel Cron, every 60 min |

### Modules

```
src/
  ebriza/           # Ebriza API client (token, items, stocks, bills, invoices, clients)
    client.ts
    auth.ts         # token cache + refresh
    types.ts        # request/response types matching the public API
  shopify/          # Shopify Admin API client
    client.ts
    metafields.ts   # read/write order metafields
    inventory.ts    # inventoryAdjustQuantities + price updates
    webhooks.ts     # HMAC verification middleware
  flows/
    invoice.ts      # Flow A — order/paid → Ebriza invoice
    sync-stock.ts   # Flow B
    sync-prices.ts  # Flow C
  lib/
    kv.ts           # Vercel KV wrapper
    resend.ts       # failure email helper
    log.ts          # structured logging
  routes.ts         # Hono app: registers handlers
  index.ts          # Vercel entrypoint
```

## 5. Data flows

### Flow A — Order → Invoice (critical fiscal path)

Triggered by Shopify webhook `orders/paid`.

1. **Verify HMAC** (`X-Shopify-Hmac-Sha256` against `SHOPIFY_WEBHOOK_SECRET`). Reject `401` on mismatch.
2. **Idempotency check.** Fetch the Shopify order's `noima.ebriza_invoice_no` metafield via Admin API. If set → return `200` immediately.
3. **Resolve customer.** Read `order.note_attributes` for an entry named `CUI`.
   - If present → `POST /clients/getOrAdd` with `{ name: billing_address.name, company: { name: billing_address.company, vatNumber: <CUI>, uniqueNumber: <CUI>, address: <billing_address> } }`. Use returned `clientID`.
   - Else → `POST /clients/getOrAdd` with individual customer name + email.
4. **Build line items.** For each Shopify line: `{ sku, quantity, unitPrice }`. `bills/openpaid` accepts SKUs directly — no `ebriza_item_id` lookup needed. **VAT is intentionally not passed**; Ebriza applies the per-item VAT defined on the matched Ebriza item (single source of truth — §6).
5. **Map payment.** From `order.payment_gateway_names[0]` → Ebriza `BillPayment.type`:
   - Card gateways (`shopify_payments`, `stripe`, etc.) → `2` CreditCard
   - `bank_transfer`, `manual` → `3` BankTransfer
   - `cash_on_delivery` → `1` Cash
6. **`POST /bills/openpaid`** with `{ externalOrderID: shopify_order.id, externalOrderNo: shopify_order.name, clientID, items, payments, locationID }`. Receive `orderID`.
7. **`POST /orders/invoice`** with `{ orderID, type: 0, clientID, email: order.customer.email, languageCode: "ro", locationID }`. Ebriza emails the PDF.
8. **Write metafields.** Set `noima.ebriza_bill_id` and `noima.ebriza_invoice_no` on the Shopify order.
9. Return `200`.

**Failure handling.** Any error in steps 3–8: log with the Shopify order ID, send a Resend email to `hello@prajitorianoima.ro`, return `500`. Shopify retries the webhook for ~48 hours with exponential backoff. Step 2's idempotency check prevents duplicates after a successful retry.

**Edge case — partial success.** If `bills/openpaid` succeeded but the metafield write fails, Shopify will retry and `bills/openpaid` will be called again. Mitigation: pass `externalOrderID` so Ebriza can deduplicate server-side. Whether Ebriza enforces uniqueness on this field is **unconfirmed** — see questions for Ebriza devs in §9. Worst case, we add a pre-check via `GET /bills?externalOrderID=...` once that endpoint is verified.

### Flow B — Stock sync (every 10 min via Vercel Cron)

1. Get/refresh Ebriza access token (cached in KV with 25-min TTL).
2. `GET /stocks?pageNo=1&pageSize=500&locationID={EBRIZA_LOCATION_ID}` — paginate to completion.
3. Collect `(sku, quantity)` pairs where SKU is non-empty.
4. Look up matching Shopify variants via Admin API `productVariants(query: "sku:...")` in batches of ~250 SKUs.
5. For each pair where `availableQuantity` differs, accumulate an `inventoryAdjustQuantities` mutation.
6. Submit Shopify mutations.
7. Write run summary to KV (`cron:stock:last_run`). Email on rate-limit (Ebriza error 0674) or persistent auth failure.

### Flow C — Price sync (every 60 min via Vercel Cron)

Identical pattern, but compares `Item.price` from `GET /items` against Shopify variant `price`. Pushes via `productVariantsBulkUpdate`.

## 6. State and mappings

### Shopify metafields

| Owner | Namespace.Key | Type | Purpose |
|---|---|---|---|
| Order | `noima.ebriza_invoice_no` | `single_line_text_field` | Idempotency marker; presence = "already invoiced" |
| Order | `noima.ebriza_bill_id` | `single_line_text_field` | Internal Ebriza bill ID for support/debugging |

A `sku → ebriza_item_id` mapping is intentionally **not** maintained. SKU-based matching is sufficient for both `bills/openpaid` and the polling syncs.

### Vercel KV

| Key | Value | TTL |
|---|---|---|
| `ebriza:token` | `{ access_token, expires_at }` | 25 min |
| `cron:stock:last_run`  | `{ at, scanned, changed, errors }` | none (overwritten) |
| `cron:price:last_run`  | `{ at, scanned, changed, errors }` | none (overwritten) |

### Cart attributes (set by theme, surfaced on order)

| Attribute name | Type                                         | Purpose                                          |
| -------------- | -------------------------------------------- | ------------------------------------------------ |
| `CUI`          | string (numeric, with optional `RO` prefix)  | Triggers B2B invoice handling in Flow A step 3   |

The company name comes from `billing_address.company` (Shopify's standard checkout field), not from a separate cart attribute. The CUI cart attribute is the only B2B-specific value not already covered by Shopify's address form.

## 7. Environment variables

```
# Ebriza
EBRIZA_APP_ID=
EBRIZA_APP_SECRET=
EBRIZA_CLIENT_ID=
EBRIZA_LOCATION_ID=
EBRIZA_API_BASE=https://api.ebriza.com

# Shopify
SHOPIFY_STORE_DOMAIN=
SHOPIFY_ADMIN_ACCESS_TOKEN=
SHOPIFY_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=
ALERT_FROM_EMAIL=
ALERT_TO_EMAIL=hello@prajitorianoima.ro

# Vercel
CRON_SECRET=
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

## 8. Bootstrap and operations

### One-time setup

1. Register Ebriza app in their marketplace → receive `APP_ID` + `APP_SECRET`.
2. Customer installs the app on their Ebriza account → receive `CLIENT_ID` for the location, set `EBRIZA_LOCATION_ID`.
3. Create Shopify custom app with scopes `read_products, write_products, read_inventory, write_inventory, read_orders, write_orders` → receive Admin API token.
4. Configure Shopify webhook for `orders/paid` → `https://<vercel-url>/webhooks/shopify/orders-paid`.
5. **SKU reconciliation:** export Shopify and Ebriza SKUs, diff, fix mismatches. Ship a `scripts/check-skus.ts` helper that prints the diff.
6. **Define Shopify metafields** (the two from §6) via Admin API — single migration script.
7. Add cart-page CIF capture to `noima-coffee-theme` (theme edit, separate PR).

### Day-2 operations

- **Logs.** Vercel function logs are the primary debugging surface. Filter by Shopify order ID or SKU.
- **Failure emails.** Resend → `hello@prajitorianoima.ro`. Subject: `[Ebriza Bridge] <flow> failed for <id>`. Body: error message + relevant IDs + Vercel log link.
- **Manual invoice retry.** Operator opens the Shopify order's webhook history, clicks "Resend" on `orders/paid`. Idempotency in Flow A step 2 prevents duplicates.
- **Manual stock fix.** Trigger the cron handler manually via `?secret=<CRON_SECRET>`-protected URL or Vercel's "Run Cron Now" button.
- **New product onboarding.** Staff create the product in Shopify with the SKU that matches Ebriza. Next stock-sync cycle picks it up.

### Repo conventions

- TypeScript strict.
- Biome (matches the Astro repo).
- pnpm.
- lefthook for pre-commit hooks (matches the Astro repo).
- Vitest, one test file per flow, with mocked Ebriza + Shopify clients. No live API tests in CI — Ebriza has no documented sandbox.

## 9. Open items

These do not block the design but **do** block shipping.

1. **CIF capture in theme.** Add cart-page checkbox + CUI text field to `noima-coffee-theme`, write to `cart.attributes`. Separate, smaller PR scoped to the theme repo, but it must land before B2B invoicing works.
2. **VAT rates per item.** Audit Ebriza item VAT rates (likely 9% for food/coffee, 19% for non-food, 5% for some categories) before go-live. Wrong VAT in Ebriza → wrong invoice.
3. **Currency.** Confirm Shopify store currency is RON (assumed throughout this design).
4. **Webhook topic confirmation.** Confirm `orders/paid` is the right topic for the customer's checkout flow. If they ever use manual capture or draft orders, `orders/fulfilled` or `orders/updated` may be needed instead or in addition.
5. **`CRON_SECRET` enforcement.** All cron routes verify `Authorization: Bearer ${CRON_SECRET}` and return `401` otherwise.

### Questions for Ebriza dev support

These should be sent before or during the build phase:

- Does `bills/openpaid` deduplicate on `externalOrderID`, or do we need a pre-check call (e.g., `GET /bills?externalOrderID=...`)?
- Is there a sandbox or test merchant environment for development?
- What are the actual API rate limits, and which response headers expose them (the docs reference error 0674 but no concrete numbers)?
- Is there a documented webhook signature mechanism (HMAC, token, or otherwise), or is the security model TLS + obscure callback URL only?

## 10. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Oversell when shop till and Shopify drain stock between polls | Medium | Accept; staff handle as out-of-stock at fulfillment. If frequent, introduce a per-SKU safety buffer (e.g., advertise quantity − 1). |
| Ebriza rate-limited during high traffic | Low–Medium | Backoff on 0674; queue retries by re-firing the cron from Vercel UI. Monitor failure-email volume. |
| Duplicate invoice from Shopify webhook retries | Low | Idempotency check (Flow A step 2). If race conditions surface, add Ebriza-side `externalOrderID` pre-check. |
| Ebriza access token misuse if env leaks | Low | Tokens scoped to one merchant + one location; rotate `APP_SECRET` on suspicion of leak. |
| CIF entered incorrectly in cart field | Medium | Soft validation in theme JS (regex, length); operator can re-issue manually if invoice has wrong CIF. |
| Volume grows past "logs + emails are enough" threshold | Medium (over time) | Migrate to Postgres + admin UI. Design assumes this is an explicit future iteration, not v1. |

## 11. Future work (not in v1)

- Postgres-backed durable invoice queue + audit log + admin dashboard (retry failed jobs, list recent syncs, manually link products). Trigger threshold: volume crosses ~50 orders/day, or recurring failure-email volume justifies the operational lift.
- Multi-location aggregation (Ebriza → multiple physical locations → Shopify aggregate).
- Refund/storno automation.
- Migrate CIF capture to Checkout UI Extension if the customer upgrades to Shopify Plus.
