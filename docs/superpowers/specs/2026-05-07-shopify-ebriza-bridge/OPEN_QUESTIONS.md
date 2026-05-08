# Open Questions for Ebriza Dev Team

**Companion document to** `SPEC.md` and `ARCHITECTURE.md`. Every TBD field in those docs traces back to one of the questions below. The implementer should send this list to Ebriza dev support **before** starting code, and update both spec docs as answers come in.

---

## 1. Endpoint and payload schema

**Confirm the exact URL, HTTP method, and payload schema** for the **"Open bill with client request"** endpoint of the **Web Ordering** app (`com.ebrizadev.webordering`).

Specifically:

- **URL.** Is it `https://api.ebriza.com/bills/openWithClient`, `…/orders/openpaid`, or something else?
- **Method.** `POST`?
- **Required vs optional fields** in the request body — please share the OpenAPI/JSON schema.
- **Field names for line items.** Working draft: `items[].sku`, `items[].quantity`, `items[].unitPrice`. Confirm.
- **Field names for client/customer block.** Working draft: `client.{name,email,phone,address}`. Confirm; clarify whether `address` is a single string, a structured object, or two fields (billing vs shipping).
- **Field name for the external order reference** (so Ebriza can dedupe on its side and shop staff can trace back to Shopify). Working draft: `externalOrderID` and `externalOrderNo`. Confirm.

## 2. TVA (VAT) handling

**Confirm whether the prices we send (`items[].unitPrice` or equivalent) are expected TVA-inclusive or TVA-exclusive.**

Romanian shops typically display TVA-inclusive prices; Shopify stores prices the same way. If Ebriza expects exclusive prices, the mapping must subtract VAT before pushing — and the rate per item must come from Ebriza's catalog (not from Shopify, which doesn't know).

Sub-questions:

- Do we need to send a `vat` field per item, or does Ebriza apply the rate from its own `Item` record?
- For the `delivery.cost` (shipping fee), what TVA rate applies? Does Ebriza expect a separate `vatRate` field on shipping?

## 3. Web Ordering app suitability for retail

**Confirm Web Ordering (`com.ebrizadev.webordering`) is appropriate for a non-HoReCa retail merchant** (a coffee roaster selling bags of beans online), and not just for restaurants.

If Ebriza recommends a different app shape for retail, what is it called and what does its `client ID` flow look like?

## 4. Fiscal documents auto-generated

**On a successful "Open bill with client request", does Ebriza automatically generate:**

- a fiscal receipt (bon fiscal),
- a fiscal invoice (factură fiscală),
- an e-Factura submission to ANAF, **and/or**
- nothing fiscal at all (the bill is just a draft until shop staff close it on the POS)?

If anything is **not** automatic, what additional API calls are needed and from which app/endpoint?

This determines whether the bridge alone is sufficient to satisfy the client's fiscal obligations, or whether the shop staff still need to perform a manual close-out step in Ebriza for every online order.

## 5. Refund and cancellation flow (for v2 planning)

**For Shopify orders that are cancelled or fully/partially refunded**, what is the recommended Ebriza-side flow?

- Is there a "void bill" or "issue storno" endpoint accessible via the same Web Ordering credentials, or does this require the custom marketplace app?
- If the bill has already been fiscalized, can it still be voided programmatically, or must shop staff issue a credit note manually?
- Does refunding affect Ebriza stock (i.e. does the refund return units to inventory automatically, or does staff need to do that by hand)?

This is **out of scope for v1** but the answer changes whether v2 can stay on the simplified Web Ordering credentials or must migrate to a custom marketplace app.

## 6. Staging environment

**Is there a staging / sandbox / test merchant environment we can use for development**, or does development have to happen against a live merchant account?

If a sandbox exists:

- How is access provisioned?
- Are credentials (test `client ID`, test app name) available?
- Are there any test SKUs / test products pre-populated, or do we have to create them?

If no sandbox exists: we will create a dedicated set of test SKUs in the live merchant account (clearly prefixed, e.g. `TEST-COF-…`) and use Shopify draft orders. Please confirm this is acceptable.

## 7. Idempotency on Ebriza side

**Does the bill push endpoint enforce uniqueness on the `externalOrderID` (or whichever field carries the Shopify order ID)?**

Specifically:

- If we push the same `externalOrderID` twice (e.g. due to a Shopify webhook retry that races our KV write), will Ebriza:
  - reject the second push with 4xx? (preferred — clean idempotency)
  - return the existing bill ID? (also acceptable)
  - silently create a duplicate bill? (we need to add a pre-check call — please document the lookup endpoint)

The bridge has its own KV-based idempotency, so this is a defense-in-depth question, but the answer changes whether we need a "look up bill by externalOrderID" call before pushing.

## 8. Headers — `ebriza-clientid` and `ebriza-appname`

**Confirm the required and optional headers** on the bill push endpoint:

- Is `ebriza-clientid: {CLIENT_ID}` the only required auth header, or is `Authorization: bearer {token}` also required?
- Is `ebriza-appname` required when using the standard Web Ordering app, or only for custom marketplace apps?
- If `ebriza-appname` is needed, is the value literally `com.ebrizadev.webordering`?

## 9. Rate limits

**What are the published rate limits** on the Web Ordering bill push endpoint?

- Requests per minute / hour / day?
- Per-merchant (`client ID`) or per-app (`app name`)?
- Which response headers expose the current usage and reset time? (The marketplace docs mention error code 0674 for "too many requests" but no concrete numbers.)
- What's the recommended backoff strategy on 0674?

## 10. Payment-type enum on Web Ordering

**Confirm the `payments[].type` enum values for Web Ordering.** The marketplace API documents:

- `1` Cash
- `2` CreditCard
- `3` BankTransfer
- `5` CashWithInvoiceReceipt
- `6` MealTickets
- `10` CreditCardOnDelivery

Are these the same on the Web Ordering simplified endpoint? Are there additional values for online-payment-specific flows (e.g. a "Stripe" or "online card payment" type that is fiscally distinct from in-person card)?

## 11. Customer creation: implicit vs explicit

**Does the bill push endpoint create the customer (`client`) record implicitly** from the inline `client { name, email, phone, address }` block, or must we call a separate `clients/getOrAdd` (or equivalent) endpoint first and reference the resulting `clientID`?

If the latter:

- What is the exact endpoint and payload?
- Is this endpoint accessible with Web Ordering credentials, or is it marketplace-only?

## 12. PII handling and GDPR

**Where does Ebriza store the customer PII** (name, email, phone, address) we send? What is Ebriza's documented data-retention policy for online orders pushed via Web Ordering? Do they offer a programmatic DELETE for "right to be forgotten" requests, or is it a support-ticket flow?

This is for our GDPR documentation — the bridge stores no PII at rest, but Ebriza does, and the merchant is the data controller.

---

## How to use this document

1. Send the questions above (with §1–§12 numbering preserved) to Ebriza dev support via the channel preferred by the merchant.
2. As answers arrive, update the corresponding sections of `SPEC.md` (and `ARCHITECTURE.md` where architectural choices are affected), and mark each question here with a ✅ and a one-line summary of the answer.
3. **Do not start implementation** until at least §1, §2, §4, §7, and §8 are answered. The other questions can be deferred.
