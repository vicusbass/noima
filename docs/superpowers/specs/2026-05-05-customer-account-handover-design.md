# Customer Account Handover — Vercel + Sanity + Mux

**Status:** Design (pending user review)
**Date:** 2026-05-05
**Owner:** Vasile Pop (agency)

## 1. Goal

Move the live infrastructure for `prajitorianoima.ro` from agency-owned accounts to customer-owned accounts (created by agency on a single shared customer Gmail), without paid subscriptions, while keeping agency able to perform ongoing maintenance.

## 2. Scope

### In scope

- Vercel project + attached domain
- Sanity project (`4c9x2l5r`, dataset `production`) + content + hosted Studio at `noima.sanity.studio`
- Mux account + the single hero video asset

### Out of scope

- Domain registrar (`prajitorianoima.ro` is registered externally, DNS only points to Vercel — no change)
- Shopify (separate Partner-led handover)
- Resend (already on customer's account)
- GitHub repository (assumed unchanged)

## 3. Prerequisites

| # | Item | Owner | Why |
| --- | --- | --- | --- |
| P1 | Customer Gmail provisioned with strong password + 2FA | Agency | Owner identity for all three providers |
| P2 | Gmail filters forwarding billing/security mail to agency | Agency | Catch payment failures, security alerts |
| P3 | Customer Gmail credentials stored in agency password manager (with explicit customer awareness/consent) | Agency | Required for ongoing Vercel access (V3 model) |
| P4 | Agency has its own pre-existing Sanity + Mux identities (separate from customer Gmail) | Agency | Required to be added as collaborators on Sanity org and Mux account |

## 4. Decisions made

- **Identity model is mixed:**
  - **Vercel:** single shared identity (customer Gmail). Agency accesses by logging in as the customer. Customer stays on free **Hobby** plan.
  - **Sanity:** multi-member free organization. Customer Gmail = Owner; agency identity = Admin.
  - **Mux:** multi-member free dev tier. Customer Gmail = Owner; agency identity = team member (subject to free-plan member support — verify in P4 of open items).

- **Per-service migration approach:**
  - **Vercel:** recreation (new project on customer Hobby, redeploy from same Git repo, repoint domain). In-place transfer is **not available** — Vercel requires the initiator to be a member of both teams, and Hobby teams are single-user, so a Hobby→Hobby transfer between different owners cannot be initiated.
  - **Sanity:** in-place project transfer to a new customer organization. Project ID `4c9x2l5r` and dataset preserved. Zero code changes.
  - **Mux:** new account + manual re-upload of the single hero video (no transfer mechanism exists). Updates one Sanity reference via Studio UI.

- **Order of operations:** Sanity first → Mux second → Vercel last.
  - Rationale: Sanity transfer preserves project ID, no impact elsewhere. Mux re-upload writes one updated reference into the (already-customer-owned) Sanity dataset, ready for cutover. Vercel cutover is the only step with brief site-level impact (domain swap), so it goes last after all upstream services are stable.

## 5. Plans

### 5.1 Sanity — in-place organization transfer

Reference: <https://www.sanity.io/docs/developer-guides/agencies-navigating-the-spring-2025-organization-changes>

1. **Customer signs up** at <https://www.sanity.io/manage> using the customer Gmail. A personal organization is auto-created.
2. **Create the customer "Noima" organization** (or rename the auto-created personal one to suit). Add billing details — Sanity Free plan is $0 but Manage may still ask for an address.
3. **Customer org adds agency identity** as Admin: Manage → Organization → Members → Invite. Accept the invite from the agency Sanity identity.
4. **From agency Sanity** (current organization owning project `4c9x2l5r`): Manage → select project → Settings → General → "Move project to organization" → select the customer's Noima organization.
5. **Approve on receiving side** if needed. Per Sanity docs: instant if the initiator has billing rights in both orgs; otherwise the receiving billing manager (customer) approves.
6. **Verify** the project now appears under the customer organization. Project ID `4c9x2l5r` stays the same → no code or env var changes.
7. **Verify** Studio at `noima.sanity.studio` still loads and the deployment appId in `studio/sanity.cli.ts:9` (`f4ot70j67twsazjhiox7zkhy`) still resolves.
8. **Verify** the live site's preview/Visual Editing still works (validates `SANITY_API_READ_TOKEN` is intact).
9. **Verify** the Mux plugin's saved token is still readable in the Studio (the Mux secret lives as a Sanity document and survives the org transfer untouched).

**Rollback:** Source organization retains the project on cancel/decline. No state changes until both sides accept.

**Billing nuance:** Free plan stays free post-transfer. If the project ever moves off Free, the destination org bears prorated usage charges from the transfer date forward.

### 5.2 Mux — re-upload to customer's account

There is no transfer mechanism between Mux accounts. The single hero video is re-uploaded into a new customer-owned Mux account.

1. **Customer signs up** at <https://www.mux.com> using the customer Gmail. Stay on free dev tier (verify it supports the site's actual production traffic — see open item).
2. **Add agency identity** as team member if Mux's free dev tier supports it. If not, Vercel-style shared-credential access falls back to the V3 pattern for Mux too.
3. **Generate a new API access token** in the customer Mux account: Dashboard → Settings → Access Tokens. Permissions: Mux Video read + write.
4. **Update the Mux plugin credentials in Sanity Studio:** open Studio at `noima.sanity.studio` → open the home page document → click the gear/settings icon on the Mux video field → paste the new customer Mux token + secret. The plugin stores these as a Sanity document.
5. **Locate the original hero video file.** If the source file isn't in agency's local assets, enable Master Access on the existing Mux asset (in agency Mux dashboard) to download a copy first. Do this **before** revoking the old token.
6. **Re-upload the hero video** through the Studio's Mux input on the home page document. The plugin uploads to the customer Mux account (using the new credentials from step 4) and updates the Sanity reference in one operation.
7. **Publish** the home page document.
8. **Smoke-test:** load the production site homepage, confirm the hero video plays. Inspect the network tab to confirm the playback URL points to a new Mux asset ID.
9. **Wait 24h.** Confirm no playback errors.
10. **Delete the old hero video asset** from the agency Mux account.
11. **Cancel/close** the agency Mux account once nothing references it.

**Risk note:** The plugin may briefly show old → new asset transition in Studio while uploading. End users are unaffected (the published frontend continues to play the old asset until the new document is published).

### 5.3 Vercel — recreation under customer Gmail (V3 model)

Customer cannot pay for Pro, so Hobby is the only option. Hobby↔Hobby transfer between different owners is not supported by Vercel, so recreation is required. Agency operates the customer's Hobby account using shared credentials.

> **Compliance note:** Vercel Hobby is documented as **non-commercial use only** ([fair-use guidelines](https://vercel.com/docs/limits/fair-use-guidelines)). A live shop-integrated marketing site is, technically, commercial use. Enforcement is rare in practice but the violation is real. Document this in the customer agreement.

1. **Inventory current Vercel state** on agency's Vercel project:
   - All env vars (verify against `.env.example`): `PUBLIC_SANITY_VISUAL_EDITING_ENABLED`, `SANITY_API_READ_TOKEN`, `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_ACCESS_TOKEN`, `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL`. Plus any others not listed in the example file.
   - All installed integrations (Settings → Integrations).
   - Custom build settings, regions, deployment protection rules, cron jobs, environment-specific overrides.
   - The current production deployment URL (for cutover comparison).
2. **Pre-shorten DNS TTL** at the registrar for `prajitorianoima.ro` — drop to 60s at least 24h before cutover to minimize propagation tail.
3. **Customer signs up** at <https://vercel.com> using the customer Gmail. Choose "Create Hobby team" / personal team. Connect the same GitHub account that holds the project repo (or the customer's GitHub if repo ownership has already been transferred).
4. **Import the same Git repo** into the customer's new Vercel team. Project name can match the original.
5. **Recreate all env vars** from the inventory in step 1 in Production scope (and Preview/Development if applicable).
6. **Re-install integrations** identified in step 1.
7. **Trigger an initial deploy** from the `main` branch. Verify it builds successfully. The deploy lives on a Vercel-generated subdomain at this point (e.g., `noima-xxx.vercel.app`).
8. **Smoke-test the new deployment** at the Vercel-generated URL: homepage loads, contact form sends mail, featured products load, hero video plays, Studio Visual Editing works.
9. **Cutover the apex domain:**
   - On agency's old Vercel project, remove `prajitorianoima.ro` from Settings → Domains.
   - On the customer's new Vercel project, add `prajitorianoima.ro` to Settings → Domains. Vercel will detect the existing DNS pointing at Vercel and complete the attachment.
   - DNS does **not** need to change at the registrar — both old and new Vercel projects live at the same Vercel anycast endpoints, so the existing A/CNAME records still resolve correctly.
10. **Monitor for ~10 minutes.** With pre-shortened TTL, cutover propagation is minutes, not hours.
11. **Verify production:** load `https://prajitorianoima.ro` and confirm the new deployment is serving (cross-check with the deployment URL in the customer Vercel dashboard).
12. **Restore DNS TTL** to original value at the registrar.
13. **Wait 24h** for stability confirmation.
14. **Delete the old Vercel project** from the agency team.

**Rollback if step 9 fails:** Re-add the domain to the old project. DNS hasn't changed at the registrar so the old project resumes serving immediately.

**Brief possible downtime:** Between removing the domain from the old project and adding it to the new project, there's a window of seconds-to-minutes where Vercel returns 404 for the apex. Schedule cutover during the lowest-traffic window.

## 6. Post-handover verification checklist

- [ ] Production site loads at `https://prajitorianoima.ro`
- [ ] Hero video plays from the new Mux asset (verify new asset ID in network tab)
- [ ] Studio at `noima.sanity.studio` opens and loads content
- [ ] Visual Editing / preview works
- [ ] Contact form sends mail (Resend env vars survived recreation)
- [ ] Featured products load on homepage (Shopify tokens survived recreation)
- [ ] A trivial commit to `main` triggers a successful deploy on customer's Vercel team
- [ ] Sanity project lives under customer organization
- [ ] Mux account billing on customer card (or stays free dev tier)
- [ ] Agency Sanity identity has Admin access on customer org
- [ ] Agency Mux access available (member or shared creds)
- [ ] Old agency Vercel project deleted (after 24h+)
- [ ] Old Mux assets deleted (after 24h+)
- [ ] All ops mail forwarded from customer Gmail to agency mailbox

## 7. Future migration — Vercel Pro upgrade

If the customer later agrees to pay $20/user/month for Vercel Pro, switch to the in-place transfer flow:

1. Customer upgrades the Hobby team to Pro Team.
2. Customer adds agency identity as a Member of the Pro Team (now possible because Pro supports multi-member).
3. (No transfer needed — the project is already on the customer's team.) Agency now has dashboard access via its own identity instead of shared Gmail credentials.
4. Rotate the customer Gmail password (agency no longer needs it for Vercel; still useful for billing/security mail forwarding).

This is a simple upgrade-and-add-member; no project mechanics change.

## 8. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Hobby fair-use violation flagged by Vercel | Low | Site forced offline until upgrade | Document violation acceptance in customer agreement; respond promptly if Vercel flags |
| Shared Gmail credentials compromised | Medium | All three accounts exposed | P1: 2FA mandatory; P3: store in password manager; rotate password if any concern |
| Vercel integration not re-installed → broken feature | Medium | Feature regression | Inventory in §5.3 step 1; verify each in §6 |
| Original hero video file unavailable | Low | Mux re-upload blocked | §5.2 step 5 — enable Master Access before revoking old token |
| Brief site downtime during Vercel domain cutover | Medium | <5 min apex unavailability | Pre-shorten TTL; schedule low-traffic window; rollback path documented |
| Sanity Mux plugin credentials don't auto-survive transfer | Low | Mux uploader broken in Studio briefly | Re-paste token (§5.2 step 4) regardless |
| Mux free dev tier insufficient for production traffic | Medium | Video stops playing or watermarks appear | Verify free tier limits before cutover; document upgrade trigger |
| `noima.sanity.studio` subdomain conflict | Low | Studio URL changes | Confirm subdomain stays project-scoped after org transfer (§5.1 step 7) |
| Customer changes Gmail password without informing agency | Low | Agency loses Vercel access | Document credential-sharing agreement; rotate via P3 password manager |

## 9. Open items / parking lot

- [ ] Verify Mux's current free dev tier limits (bandwidth, storage, watermark policy) and confirm acceptable for production
- [ ] Verify Mux's free tier supports multi-member access; if not, fall back to shared-creds for Mux too
- [ ] Inventory current Vercel integrations (need to log into agency Vercel to enumerate)
- [ ] Confirm the original hero video file location: local agency assets, or enable Master Access on existing Mux asset
- [ ] GitHub repo ownership — separate handover, not in this plan
- [ ] Shopify shop handover timing (Partner-led, separate plan)
- [ ] Customer-facing written agreement covering: shared-Gmail credential model, Hobby fair-use acknowledgment, agency's ongoing access role
- [ ] Decide cutover window for §5.3 step 9 (low-traffic time)

## 10. References

- Vercel project transfer (not used here — for reference): <https://vercel.com/docs/projects/transferring-projects>
- Vercel Hobby plan limits and fair use: <https://vercel.com/docs/plans/hobby>, <https://vercel.com/docs/limits/fair-use-guidelines>
- Sanity organization transfer (agencies guide): <https://www.sanity.io/docs/developer-guides/agencies-navigating-the-spring-2025-organization-changes>
- Sanity projects & organizations: <https://www.sanity.io/docs/platform-management/projects-organizations-and-billing>
- Mux dashboard: <https://dashboard.mux.com>
- Sanity project ID location in this repo: `astro.config.mjs:9`, `studio/sanity.config.ts:7`, `studio/sanity.cli.ts:5`
