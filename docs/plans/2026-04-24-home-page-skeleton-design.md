# Home Page Skeleton — Design Reference

Reference doc for the initial build of the Noima home page, derived from the Adobe XD specs at `design/Noima Website Design.xd` (shared views below). Use this as the source of truth when wiring up real assets, adding pages, or extending the design system.

## Source designs

- **Desktop** — XD artboard "Web 1920 – 9" · viewport `1920×1080` · design canvas `1920×7537`
  https://xd.adobe.com/view/c6b35a5c-b321-4430-9d30-7ca3acc98640-93e0/specs/
- **Mobile** — XD artboard "iPhone 14 Pro – 1" · viewport `393×852` · design canvas `393×8393`
  https://xd.adobe.com/view/c6b35a5c-b321-4430-9d30-7ca3acc98640-93e0/screen/8f5cbe5e-509c-4c4d-91dc-bd3e54b40eba/specs/

The XD file contains 14 screens total; only screens 1–2 are the home page. Screens 3+ are Shop/product pages, which are **out of scope** — the shop is hosted on a standalone Shopify store.

## Design system

### Color palette

| Token | Hex | Usage |
|---|---|---|
| `--color-surface` | `#FFFFFF` | default page background |
| `--color-cream` | `#F8F5ED` | manifesto + featured-products section bg, solid header after scroll |
| `--color-ink` | `#000000` | primary text, CTA buttons |
| `--color-tan` | `#D7B88F` | brand accent — hover states, gradient highlights |
| `--color-mute` | `#909090` | small supporting text |
| `--color-mute-soft` | `#9B9B9B` | tertiary text |
| `--color-line` | `#E2E2E2` | card borders, rules |
| `--color-line-soft` | `#D0D0D0` | subtle dividers |

All tokens live in `src/styles/global.css` under `@theme` so Tailwind utilities like `bg-cream` and `text-ink` work directly.

### Typography

XD uses **Gravita HUM** (Hubert Jocham), a licensed display family not on Google Fonts. Per project direction we default to the already-configured **Google Sans** (`--font-google-sans`) and reserve Gravita HUM for future integration if licensed.

Weight/size scale observed in the XD specs:

| Role | Desktop | Mobile | Weight |
|---|---|---|---|
| Hero display | 96px | 37–38px | Black (900) |
| Section H2 | 96px (dark) | 38px | Black |
| Feature heading | 50px | 44px | Medium / Black |
| Subheading | 30px | 18px | Regular |
| Body | 18–20px | 14–18px | Regular |
| Nav / buttons | 16–18px | 16px | Medium, uppercase, `letter-spacing: 0.18em` |
| Small meta | 14–16px | 14px | Regular, muted |

Helpers in `global.css`: `.display` (uppercase, `-0.02em` tracking, `line-height: 0.95`), `.display-lower` (same without uppercase), `.eyebrow` (0.8125rem, 0.22em tracking).

### Spacing & layout

- `--header-height`: `88px`
- `--container-max`: `1440px` (content cap on wide viewports)
- `--container-pad-sm`: `1.25rem` (mobile inline padding)
- `--container-pad-lg`: `2.5rem` (desktop inline padding)
- Section vertical rhythm: `py-20 md:py-28` to `py-20 md:py-32`

Use the `.container-x` utility to apply responsive padding + max-width.

## Home page sections

### 1. Site header (`SiteHeader.astro`)

Transparent over the hero (white text + subtle dark gradient underlay for contrast) and flips to solid cream after 60px of scroll. Initial state is driven by the `transparentHeader` Layout prop; pages without a hero should omit it to get the solid cream default.

Nav links (Romanian): `ACASĂ · SHOP · DESPRE NOI · B2B · CONTACT` + cart icon. On mobile the desktop nav collapses into a hamburger that opens a full-screen cream overlay panel with the same links.

### 2. Hero (`Hero.astro`)

Full-viewport section, minimum `min(100svh, 900px)`. Reads from the Sanity `hero` object (already wired — heading/subheading/mediaType/image/video). Media layer supports:

- Sanity image (via `urlFor` → 2400×1400)
- Mux video (via `<mux-player>` with playback-id; script import is conditional)
- Placeholder fallback — dark radial + linear gradient with a `VIDEO PLACEHOLDER` chip, shown whenever no media is configured

Above the media sits a dark gradient overlay (`rgba(0,0,0,0.45) → 0.15 → 0.55`) and a 2-column content grid: huge uppercase display headline left, small right-aligned subheading + white "DESCOPERĂ ▸" pill CTA right. Below 900px the grid collapses to a single column, left-aligned.

### 3. Why / manifesto (`WhySection.astro`)

`id="manifesto"` so the hero CTA can anchor-link to it. Structure:

- Centered heading "de ce există noima?" (lowercase, Black weight, `-0.015em` tracking)
- Cream panel containing a 2-column grid: decorative SVG illustration (tan radial glow with coffee-grounds shapes — placeholder until real illustration arrives), 3 manifesto paragraphs, dark "DESCOPERĂ ▸" CTA
- Props: `heading`, `paragraphs[]`, `ctaLabel`, `ctaHref` — all overridable, so this is Sanity-ready even though the current schema doesn't include it yet

### 4. Featured products (`FeaturedProducts.astro` + `ProductCard.astro`)

Cream background section. Heading "cafea" + muted description, then the products grid.

Grid is responsive and **count-aware** (`data-count` attribute):

- 1 product → centered, capped at 360px (matches current Shopify state — one product)
- 2 products → 2-column centered
- 3 products → 3-column centered
- 4+ → 4-column full grid

Each `ProductCard` has: 5:6 image area (with placeholder fallback chip), uppercase title + `ro-RO` formatted price row, "află detalii" disclosure, black "ADAUGĂ ÎN COȘ ▸" button linking to the Shopify store. Hover lifts the card and scales the image slightly.

Data flows from the existing `getFeaturedProducts()` in `src/lib/shopify.ts` — no changes needed.

### 5. Footer (`SiteFooter.astro`)

Minimal stub (not yet captured from XD). Black background, 3-column layout: brand + tagline, menu links, contact details. Thin top border divider + copyright line. Refine when the footer artboard lands.

## Placeholder strategy

Until the real image/video/illustration assets arrive, every stand-in carries an **`.asset-placeholder-chip`** (pinned bottom-left to avoid colliding with the fixed header). Three placeholder spots on the home page:

1. Hero media — `VIDEO PLACEHOLDER`
2. Manifesto illustration — `ILLUSTRATION PLACEHOLDER`
3. Product card without featured image — `PRODUCT IMAGE`

Replacing a placeholder with real content is always a one-prop-per-component change; no mock data files to hunt down.

## Component file map

```
src/
├── layouts/
│   └── Layout.astro              # lang="ro", meta, header/footer wrapper, transparentHeader prop
├── components/
│   ├── SiteHeader.astro          # scroll-aware transparent ↔ cream, mobile drawer
│   ├── SiteFooter.astro          # minimal 3-column stub
│   ├── Hero.astro                # video/image/placeholder media + headline + CTA
│   ├── WhySection.astro          # manifesto block with illustration placeholder
│   ├── ProductCard.astro         # single Shopify product card
│   └── FeaturedProducts.astro    # count-aware grid wrapper
├── pages/
│   └── index.astro               # composes Hero + WhySection + FeaturedProducts
└── styles/
    └── global.css                # @theme tokens, helpers, asset-placeholder-chip
```

## Open items

These were consciously left out of the skeleton; each has a clear hook to add later.

- **Gravita HUM webfont** — design calls for it; currently falling back to Google Sans. When licensed, self-host `.woff2` files in `public/fonts/` and declare `@font-face` in `global.css`, then update `--font-sans` in `@theme`.
- **Hero media** — Sanity's `hero.mediaType=image|video` is already wired; set either in the Studio and the placeholder vanishes.
- **Manifesto copy** — currently placeholder Romanian text. Either (a) move to Sanity by adding a `whySection` field on the `homePage` document, or (b) have the content team confirm the current copy.
- **Decorative illustration** — inline SVG placeholder. When the real asset arrives, drop it into `public/images/` or Sanity and swap the `.why-illu` block in `WhySection.astro`.
- **Footer** — XD footer artboard not yet captured. Revisit `SiteFooter.astro` once received.
- **Hover/transition states** for nav items and buttons are simple opacity/transform; XD shows dedicated "Hover State" variants that can be refined when needed.
- **Shop/Despre noi/B2B/Contact pages** — nav links exist but the routes don't. Each will need its own page + a default-solid header (omit `transparentHeader`).

## Verification

- `pnpm lint` — clean
- `pnpm build` — 1 page, 2.83s, no warnings beyond the expected Shopify chunk-size note
- Manual QA at `1440×900` and `393×852` (iPhone 14 Pro): hero, manifesto, products, footer, mobile drawer, scroll-triggered header transition all render correctly
