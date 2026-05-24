# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Marketing/content site with Astro (TypeScript, hybrid rendering), Sanity CMS, Tailwind CSS v4, deployed on Vercel. Sanity Studio hosted separately at `noima.sanity.studio`. Featured products pulled from a standalone Shopify store via Storefront API. Video hosted via Mux. Schema titles and Studio UI are in Romanian.

## Commands

```bash
pnpm install                              # Install deps for both workspaces
pnpm dev                                  # Start Astro dev server
pnpm --filter noima-studio dev            # Start local Sanity Studio at localhost:3333
pnpm --filter noima-studio run deploy     # Deploy Studio to noima.sanity.studio (use `run` — `pnpm deploy` is a reserved built-in)
pnpm build                                # Production build (Astro)
pnpm preview                              # Preview production build locally
pnpm --filter noima-studio schema:deploy  # Deploy schema to Content Lake (required for MCP tools)
pnpm --filter noima-studio typegen        # Generate TypeScript types from schema + GROQ queries
pnpm lint                                 # Check linting + formatting (Biome)
pnpm lint:fix                             # Auto-fix linting + formatting issues
pnpm format                               # Format all files
```

## Architecture

- **Astro v5+** with hybrid output (static-first, SSR opt-in per route)
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin — styles in `src/styles/global.css`
- **Sanity** via `@sanity/astro` integration — Studio hosted at `noima.sanity.studio` (not embedded)
- **Mux** video: `sanity-plugin-mux-input` (Studio), `@mux/mux-player-astro` (frontend)
- **Vercel** via `@astrojs/vercel` adapter
- **Shopify** Storefront API (GraphQL) for featured products on homepage — shop is standalone
- **Biome** for linting and formatting (replaces ESLint + Prettier)

## Project Structure

This is a pnpm workspace with two packages:

**Astro site (root):**
- `src/sanity/lib/` — frontend Sanity utilities (load-query.ts, image.ts)
- `src/lib/` — non-Sanity utilities (shopify.ts)
- `src/components/` — Astro/React components
- `src/layouts/` — page layouts
- `src/pages/` — Astro file-based routing
- `src/styles/global.css` — Tailwind entry + custom styles

**Sanity Studio (`studio/`):**
- `studio/sanity.config.ts` — Studio configuration
- `studio/sanity.cli.ts` — Sanity CLI configuration
- `studio/schemaTypes/` — schema definitions (documents/, objects/)

Studio deps (`sanity`, `@sanity/icons`, `sanity-plugin-mux-input`, `styled-components`, `react-is`) are isolated to `studio/` and never leak into the Astro build. `@sanity/astro` lists these as peer dependencies, but the Astro root uses `pnpm.peerDependencyRules.ignoreMissing` to suppress warnings since the embedded Studio route is not used.

## pnpm Notes

- Sanity project ID and dataset are hardcoded in `astro.config.mjs`, `studio/sanity.config.ts`, and `studio/sanity.cli.ts` (public, non-secret values)
- `@sanity/client` and `@mux/mux-player` must be direct dependencies of the Astro root (pnpm strict hoisting)

## Sanity Conventions

- Use `defineType`, `defineField`, `defineArrayMember` for all schema definitions
- Schema files use kebab-case naming
- GROQ queries wrapped in `defineQuery` for TypeGen support
- Singleton documents use custom Studio structure to hide from document lists
- `PUBLIC_` prefixed env vars are client-accessible; unprefixed are server-only
- Schema titles and descriptions must be in Romanian

## Styling

See `AGENTS.md` for shared styling conventions (Tailwind breakpoints, when to use utilities vs `<style>` blocks, image `sizes` attribute).

## Browser tooling

When using the Playwright MCP (`browser_take_screenshot`, `browser_snapshot`, etc.), always pass `filename: ".screenshots/<name>.<ext>"` so artifacts land in the gitignored `.screenshots/` folder instead of polluting the project root.

## Key Files

| File | Purpose |
|------|---------|
| `astro.config.mjs` | Astro + Sanity + Tailwind + Vercel config |
| `pnpm-workspace.yaml` | pnpm workspace definition |
| `studio/sanity.config.ts` | Studio plugins, schema, structure |
| `studio/sanity.cli.ts` | CLI project ID, dataset, deployment appId |
| `studio/schemaTypes/index.ts` | Schema type registry |
| `src/sanity/lib/load-query.ts` | GROQ query wrapper (supports Visual Editing) |
| `.env.example` | Required environment variables template |

## Shopify

The theme is located at `noima-coffee-theme` folder
Always use Shopify plugin/skills when updating the Shopify theme