# Noima

Marketing and content site built with [Astro](https://astro.build), [Sanity](https://sanity.io), [Tailwind CSS](https://tailwindcss.com), and deployed on [Vercel](https://vercel.com). Features a homepage with a configurable hero (image or [Mux](https://mux.com) video) and featured products from a standalone [Shopify](https://shopify.com) store.

## Tech Stack

- **Astro** v5+ — TypeScript, hybrid rendering (static-first)
- **Sanity** — Headless CMS with Studio hosted at [noima.sanity.studio](https://noima.sanity.studio)
- **Tailwind CSS** v4 — Utility-first CSS via Vite plugin
- **Mux** — Video hosting and playback
- **Vercel** — Deployment and hosting
- **Shopify** — Storefront API for featured products (standalone shop)

## Getting Started

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- [pnpm](https://pnpm.io)
- A [Sanity](https://sanity.io) account
- A [Mux](https://mux.com) account (for video)
- A [Shopify](https://shopify.com) store with Storefront API access (for featured products)

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start development server
pnpm dev
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

| Variable | Description |
|----------|-------------|
| `PUBLIC_SANITY_PROJECT_ID` | Sanity project ID |
| `PUBLIC_SANITY_DATASET` | Sanity dataset name (usually `production`) |
| `SANITY_API_READ_TOKEN` | Sanity viewer token (for Visual Editing/drafts) |
| `PUBLIC_SANITY_VISUAL_EDITING_ENABLED` | Enable Visual Editing (`true`/`false`) |
| `SHOPIFY_STORE_DOMAIN` | Shopify store domain |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Shopify Storefront API access token |

Mux credentials are configured through the Sanity Studio plugin UI on first use.

## Development

```bash
pnpm dev            # Start Astro dev server at http://localhost:4321
npx sanity dev      # Start local Sanity Studio at http://localhost:3333
pnpm build          # Production build
pnpm preview        # Preview production build
```

### Sanity Studio

The Studio is hosted by Sanity at [noima.sanity.studio](https://noima.sanity.studio). For local development, run `npx sanity dev` to start a local instance at `http://localhost:3333`.

To deploy schema or Studio changes:

```bash
npx sanity schema deploy   # Push schema to Content Lake
npx sanity deploy          # Deploy Studio to noima.sanity.studio
```

## Deployment

- **Site**: Deploys to Vercel. Connect your GitHub repository in the Vercel dashboard and set environment variables in project settings.
- **Sanity Studio**: Deployed separately via `npx sanity deploy` to [noima.sanity.studio](https://noima.sanity.studio).

## Git Hooks

This project uses [Lefthook](https://github.com/evilmartians/lefthook) for git hooks. Hooks are installed automatically when you run `pnpm install`.

### Pre-commit

- **Biome format** — Runs `biome check --fix` on staged `.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs`, `.json`, and `.css` files, then re-stages them.

## Project Structure

```
src/
├── components/       # Astro/React components
├── layouts/          # Page layouts
├── lib/              # Shopify client and utilities
├── pages/            # File-based routing
├── styles/           # Global CSS (Tailwind entry)
└── sanity/
    ├── lib/          # Sanity client, image helpers, queries
    └── schemaTypes/  # Sanity schema definitions
```
