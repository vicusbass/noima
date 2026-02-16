# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Marketing/content site with Astro (TypeScript, hybrid rendering), Sanity CMS (embedded Studio at `/studio`), Tailwind CSS v4, deployed on Vercel. Featured products pulled from a standalone Shopify store via Storefront API. Video hosted via Mux.

## Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start Astro dev server (includes embedded Studio at /studio)
pnpm build                # Production build
pnpm preview              # Preview production build locally
npx sanity schema deploy  # Deploy Sanity schema to Content Lake (required for MCP tools)
npx sanity typegen        # Generate TypeScript types from schema + GROQ queries
pnpm lint                 # Check linting + formatting (Biome)
pnpm lint:fix             # Auto-fix linting + formatting issues
pnpm format               # Format all files
```

## Architecture

- **Astro v5+** with hybrid output (static-first, SSR opt-in per route)
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin — styles in `src/styles/global.css`
- **Sanity** via `@sanity/astro` integration — Studio embedded at `/studio`
- **Mux** video: `sanity-plugin-mux-input` (Studio), `@mux/mux-player-astro` (frontend)
- **Vercel** via `@astrojs/vercel` adapter
- **Shopify** Storefront API (GraphQL) for featured products on homepage — shop is standalone
- **Biome** for linting and formatting (replaces ESLint + Prettier)

## Project Structure

- `src/sanity/schemaTypes/` — Sanity schema definitions (documents/, objects/)
- `src/sanity/lib/` — Sanity client utilities (load-query.ts, image.ts)
- `src/lib/` — Non-Sanity utilities (shopify.ts)
- `src/components/` — Astro/React components
- `src/layouts/` — Page layouts
- `src/pages/` — Astro file-based routing
- `src/styles/global.css` — Tailwind entry + custom styles
- `sanity.config.ts` — Studio configuration (root level)
- `sanity.cli.ts` — Sanity CLI configuration (root level)

## Sanity Conventions

- Use `defineType`, `defineField`, `defineArrayMember` for all schema definitions
- Schema files use kebab-case naming
- GROQ queries wrapped in `defineQuery` for TypeGen support
- Singleton documents use custom Studio structure to hide from document lists
- `PUBLIC_` prefixed env vars are client-accessible; unprefixed are server-only

## Key Files

| File | Purpose |
|------|---------|
| `astro.config.mjs` | Astro + Sanity + Tailwind + Vercel config |
| `sanity.config.ts` | Studio plugins, schema, structure |
| `sanity.cli.ts` | CLI project ID and dataset |
| `src/sanity/schemaTypes/index.ts` | Schema type registry |
| `src/sanity/lib/load-query.ts` | GROQ query wrapper (supports Visual Editing) |
| `.env.example` | Required environment variables template |
