# Noima

Marketing and content site built with [Astro](https://astro.build), [Sanity](https://sanity.io), [Tailwind CSS](https://tailwindcss.com), and deployed on [Vercel](https://vercel.com). Features a homepage with a configurable hero (image or [Mux](https://mux.com) video) and featured products from a standalone [Shopify](https://shopify.com) store.

## Tech Stack

- **Astro** v5+ — TypeScript, hybrid rendering (static-first)
- **Sanity** — Headless CMS with Studio hosted at [noima.sanity.studio](https://noima.sanity.studio)
- **Tailwind CSS** v4 — Utility-first CSS via Vite plugin
- **Mux** — Video hosting and playback
- **Vercel** — Deployment and hosting
- **Shopify** — Storefront API for featured products + a custom Dawn-based theme in `noima-coffee-theme/`

## Getting Started

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- [pnpm](https://pnpm.io)
- A [Sanity](https://sanity.io) account
- A [Mux](https://mux.com) account (for video)
- A [Shopify](https://shopify.com) store with Storefront API access (for featured products)
- [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) (only for theme work — `pnpm add -g @shopify/cli`)

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

This repo is a pnpm workspace with two packages:

- **Root** — the Astro site
- **`studio/`** — the Sanity Studio (package name `noima-studio`)

`pnpm install` at the root installs deps for both.

```bash
pnpm dev                                  # Start Astro dev server at http://localhost:4321
pnpm --filter noima-studio dev            # Start local Sanity Studio at http://localhost:3333
pnpm build                                # Production build (Astro)
pnpm preview                              # Preview production build
```

### Sanity Studio

The Studio is hosted by Sanity at [noima.sanity.studio](https://noima.sanity.studio). For local development, run `pnpm --filter noima-studio dev` to start a local instance at `http://localhost:3333`.

To deploy schema or Studio changes:

```bash
pnpm --filter noima-studio schema:deploy   # Push schema to Content Lake
pnpm --filter noima-studio run deploy          # Deploy Studio to noima.sanity.studio
pnpm --filter noima-studio typegen         # Generate TypeScript types from schema + GROQ
```

You can also `cd studio` and run `pnpm dev`, `pnpm deploy`, etc. directly.

#### Typical schema-change flow

After editing anything in [`studio/schemaTypes/`](studio/schemaTypes/):

1. **`pnpm --filter noima-studio schema:deploy`** — pushes the schema to the Content Lake. Required for MCP tools (`get_schema`, `query_documents`) and any schema-aware webhooks/functions to see the new shape.
2. **`pnpm --filter noima-studio run deploy`** — deploys the Studio bundle to [noima.sanity.studio](https://noima.sanity.studio) so editors get the new fields/types in the hosted UI. Skip this if you only edit locally via `pnpm --filter noima-studio dev` (local Studio reads schema files directly and hot-reloads).
3. **`pnpm --filter noima-studio typegen`** — regenerates TypeScript types from the schema + GROQ queries. Run whenever the Astro app queries the changed type.

## Deployment

- **Site**: Deploys to Vercel. Connect your GitHub repository in the Vercel dashboard and set environment variables in project settings.
- **Sanity Studio**: Deployed separately via `pnpm --filter noima-studio run deploy` to [noima.sanity.studio](https://noima.sanity.studio).
- **Shopify theme**: See [Shopify Theme](#shopify-theme) below.

## Shopify Theme

The standalone Shopify store uses a custom theme based on [Dawn](https://github.com/Shopify/dawn), located at [`noima-coffee-theme/`](noima-coffee-theme/). Customizations include local Google Sans Flex fonts (see [`noima-coffee-theme/snippets/custom-fonts.liquid`](noima-coffee-theme/snippets/custom-fonts.liquid) for the single source of truth — change fonts there).

All theme commands run against the Shopify store, not the Astro app. The theme is **not** deployed via Vercel.

### Authenticate

The first command you run opens a browser for OAuth and caches credentials. You'll be prompted for the store on each command unless you pass `--store <subdomain>.myshopify.com`.

```bash
shopify theme list --store noima-coffee.myshopify.com
```

### Local preview against the store

Hot-reloads the theme against live store data without uploading anything to the published theme:

```bash
shopify theme dev --path noima-coffee-theme --store noima-coffee.myshopify.com
```

### First push — as an unpublished theme

Safest first push: creates a new unpublished theme so the live site is untouched. Preview and *Publish* from the Shopify admin (Online Store → Themes) when ready.

```bash
shopify theme push --path noima-coffee-theme --unpublished --store noima-coffee.myshopify.com
```

### Subsequent pushes — target an existing theme

After the first push, target the same theme by name (or ID from `shopify theme list`) so you don't create duplicates:

```bash
shopify theme push --path noima-coffee-theme --theme "Noima Coffee" --store noima-coffee.myshopify.com
```

Avoid `--live` — it pushes straight to the published theme with no preview. Use the admin's *Publish* button instead.

### Pull theme changes from the store

If a merchant edits sections/settings in the Shopify Theme Editor, pull those JSON updates back to git:

```bash
shopify theme pull --path noima-coffee-theme --theme "Noima Coffee" --store noima-coffee.myshopify.com
```

## Git Hooks

This project uses [Lefthook](https://github.com/evilmartians/lefthook) for git hooks. Hooks are installed automatically when you run `pnpm install`.

### Pre-commit

- **Biome format** — Runs `biome check --fix` on staged `.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs`, `.json`, and `.css` files, then re-stages them.

## Project Structure

```
.
├── src/                      # Astro site
│   ├── components/           # Astro/React components
│   ├── layouts/              # Page layouts
│   ├── lib/                  # Shopify client and utilities
│   ├── pages/                # File-based routing
│   ├── styles/               # Global CSS (Tailwind entry)
│   └── sanity/
│       └── lib/              # Sanity client, image helpers, queries (frontend-side)
├── studio/                   # Sanity Studio (separate workspace)
│   ├── sanity.config.ts      # Studio plugins, schema, structure
│   ├── sanity.cli.ts         # CLI project ID, dataset, deploy appId
│   └── schemaTypes/          # Schema definitions (documents/, objects/)
├── noima-coffee-theme/       # Shopify Dawn-based theme (deployed via Shopify CLI)
└── pnpm-workspace.yaml       # Workspace definition
```
