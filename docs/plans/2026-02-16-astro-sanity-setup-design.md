# Astro + Sanity + Tailwind + Vercel Setup Design

## Overview

Marketing/content site built with Astro, managed by Sanity CMS, styled with Tailwind CSS v4, deployed on Vercel. Includes a featured products section pulling from a standalone Shopify store via Storefront API. Video support via Mux.

## Architecture

- **Rendering**: Hybrid mode (static-first). All pages statically generated at build time. Specific routes can opt into SSR via `export const prerender = false`.
- **Content**: Sanity manages all site content. Studio embedded at `/studio`.
- **Shopify**: REST/GraphQL calls to Shopify Storefront API to fetch featured products for the homepage. Products link out to the standalone Shopify store.
- **Video**: Mux for video hosting/playback. `sanity-plugin-mux-input` in Studio, `@mux/mux-player-astro` on the frontend.

## Tech Stack

| Tool | Details |
|------|---------|
| Astro | v5+, TypeScript, hybrid output |
| Tailwind CSS | v4 via `@tailwindcss/vite` plugin |
| Sanity | `@sanity/astro` integration, embedded Studio at `/studio` |
| Mux | `sanity-plugin-mux-input` (Studio) + `@mux/mux-player-astro` (frontend) |
| Vercel | `@astrojs/vercel` adapter |
| Shopify | Storefront API (GraphQL) for featured products |
| Package manager | pnpm |

## Project Structure

```
noima/
├── src/
│   ├── components/              # Astro/React components
│   │   ├── Hero.astro           # Hero component (image or Mux video)
│   │   ├── PortableText.astro   # Portable Text renderer
│   │   └── FeaturedProducts.astro
│   ├── layouts/
│   │   └── Layout.astro         # Base layout, imports global.css
│   ├── lib/
│   │   └── shopify.ts           # Shopify Storefront API client
│   ├── pages/
│   │   └── index.astro          # Homepage (hero + featured products)
│   ├── styles/
│   │   └── global.css           # @import "tailwindcss" + custom styles
│   └── sanity/
│       ├── lib/
│       │   ├── load-query.ts    # Query wrapper
│       │   └── image.ts         # Image URL builder
│       └── schemaTypes/
│           ├── documents/
│           │   └── home-page.ts # Homepage singleton
│           ├── objects/
│           │   └── hero.ts      # Hero object (image/video toggle)
│           └── index.ts         # Schema export
├── public/                      # Static assets
├── astro.config.mjs             # Astro + Sanity + Tailwind + Vercel
├── sanity.config.ts             # Studio config (embedded at /studio)
├── sanity.cli.ts                # Sanity CLI config
├── tsconfig.json
├── .env.example                 # Environment variable template
└── package.json
```

## Sanity Schema

Single document type: `homePage` (singleton).

### homePage (document, singleton)

| Field | Type | Notes |
|-------|------|-------|
| title | string | Internal title for Studio |
| hero | object (hero) | Hero section |

### hero (object)

| Field | Type | Notes |
|-------|------|-------|
| mediaType | string | Radio: "image" or "video" |
| image | image | Hidden when mediaType is "video", with hotspot + alt |
| video | mux.video | Hidden when mediaType is "image" |
| heading | string | Hero heading text |
| subheading | string | Hero subheading text |

## Shopify Integration

- `src/lib/shopify.ts`: Utility to call Shopify Storefront API (GraphQL)
- Fetches featured/collection products (title, price, image, handle/URL)
- Products link out to the standalone Shopify store
- Called at build time (static generation)

## Environment Variables

```
# Sanity
PUBLIC_SANITY_PROJECT_ID=
PUBLIC_SANITY_DATASET=production
SANITY_API_READ_TOKEN=

# Sanity Visual Editing
PUBLIC_SANITY_VISUAL_EDITING_ENABLED=false

# Shopify
SHOPIFY_STORE_DOMAIN=
SHOPIFY_STOREFRONT_ACCESS_TOKEN=

# Mux (configured via Sanity plugin UI on first use)
```

## Key Decisions

1. **Tailwind v4**: Uses `@tailwindcss/vite` plugin, not the legacy `@astrojs/tailwind` integration. Styles go in `src/styles/global.css` with `@import "tailwindcss"`.
2. **No dotenv**: Astro/Vite handles `.env` files natively.
3. **Embedded Studio**: Lives at `/studio` route inside the Astro app. Single deployment.
4. **Hybrid rendering**: Static by default, SSR opt-in per route.
5. **Shopify is external**: No product schemas in Sanity. Shop is standalone Shopify.
6. **Mux video**: Managed in Sanity Studio via `sanity-plugin-mux-input`, played on frontend via `@mux/mux-player-astro`.
