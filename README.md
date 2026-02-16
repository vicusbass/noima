# Noima

Marketing and content site built with [Astro](https://astro.build), [Sanity](https://sanity.io), [Tailwind CSS](https://tailwindcss.com), and deployed on [Vercel](https://vercel.com). Features a homepage with a configurable hero (image or [Mux](https://mux.com) video) and featured products from a standalone [Shopify](https://shopify.com) store.

## Tech Stack

- **Astro** v5+ — TypeScript, hybrid rendering (static-first)
- **Sanity** — Headless CMS with embedded Studio at `/studio`
- **Tailwind CSS** v4 — Utility-first CSS via Vite plugin
- **Mux** — Video hosting and playback
- **Vercel** — Deployment and hosting
- **Shopify** — Storefront API for featured products (standalone shop)

## Getting Started

### Prerequisites

- Node.js 18+
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

# Start development server (includes Sanity Studio at /studio)
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
pnpm dev       # Start dev server at http://localhost:4321
pnpm build     # Production build
pnpm preview   # Preview production build
```

Sanity Studio is available at `http://localhost:4321/studio` during development.

## Deployment

The site deploys to Vercel. Connect your GitHub repository in the Vercel dashboard. Set environment variables in Vercel project settings.

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
