# Astro + Sanity + Tailwind + Vercel Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up an Astro project with Sanity CMS (embedded Studio), Tailwind CSS v4, Mux video, Shopify featured products, and Vercel deployment.

**Architecture:** Astro hybrid rendering (static-first) with Sanity managing content via embedded Studio at `/studio`. Homepage has a configurable hero (image or Mux video) and a featured products section pulling from Shopify Storefront API. Tailwind v4 via Vite plugin. Deployed on Vercel.

**Tech Stack:** Astro 5+, TypeScript, Tailwind CSS v4, Sanity v3, Mux, Shopify Storefront API, Vercel, pnpm

---

### Task 1: Initialize Astro Project

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/pages/index.astro`

**Step 1: Scaffold Astro in current directory**

```bash
pnpm create astro@latest . --template minimal --typescript strict --install --git false --skip-houston
```

This creates the minimal Astro starter with strict TypeScript. `--git false` preserves our existing repo. If prompted about existing files (CLAUDE.md, README.md, etc.), allow overwrite of conflicts but the command should not touch non-Astro files.

**Step 2: Verify dev server starts**

```bash
pnpm dev
```

Expected: Astro dev server runs at `http://localhost:4321`, shows the minimal welcome page. Stop the server with Ctrl+C.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: initialize Astro project with TypeScript"
```

---

### Task 2: Add Tailwind CSS v4

**Files:**
- Modify: `astro.config.mjs` (add Vite plugin)
- Create: `src/styles/global.css`
- Modify: `src/pages/index.astro` (import global.css to verify)

**Step 1: Install Tailwind v4 via Astro CLI**

```bash
pnpm astro add tailwind
```

This installs `@tailwindcss/vite` and `tailwindcss` and adds the Vite plugin to `astro.config.mjs` automatically.

**Step 2: Create global CSS file**

Create `src/styles/global.css`:

```css
@import "tailwindcss";
```

**Step 3: Import global CSS in a layout or page to verify**

Update `src/pages/index.astro` to import the CSS and add a Tailwind class:

```astro
---
import '../styles/global.css';
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Noima</title>
  </head>
  <body>
    <h1 class="text-4xl font-bold text-center mt-10">Noima</h1>
  </body>
</html>
```

**Step 4: Verify Tailwind works**

```bash
pnpm dev
```

Expected: `http://localhost:4321` shows "Noima" in large bold centered text. Stop server.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add Tailwind CSS v4 with global styles"
```

---

### Task 3: Add Vercel Adapter

**Files:**
- Modify: `astro.config.mjs` (add adapter)

**Step 1: Install Vercel adapter**

```bash
pnpm astro add vercel
```

This installs `@astrojs/vercel` and adds it to `astro.config.mjs` as the adapter.

**Step 2: Verify astro.config.mjs has adapter configured**

The config should now include:

```javascript
import vercel from '@astrojs/vercel';

export default defineConfig({
  // ...
  adapter: vercel(),
});
```

**Step 3: Verify build works**

```bash
pnpm build
```

Expected: Build succeeds, outputs to `.vercel/output/`.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add Vercel adapter for deployment"
```

---

### Task 4: Add Sanity Integration and React

**Files:**
- Modify: `astro.config.mjs` (add Sanity + React integrations)
- Create: `src/env.d.ts` (type declarations)

**Step 1: Install Sanity integration and React**

```bash
pnpm astro add @sanity/astro @astrojs/react
```

This installs `@sanity/astro`, `@astrojs/react`, `react`, `react-dom` and configures them in `astro.config.mjs`.

**Step 2: Install additional Sanity dependencies**

```bash
pnpm add sanity @sanity/image-url @sanity/icons @portabletext/types astro-portabletext
```

**Step 3: Create/update type declarations**

Create or update `src/env.d.ts`:

```typescript
/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />
```

**Step 4: Configure Sanity in astro.config.mjs**

Update `astro.config.mjs` to the full configuration. Use `loadEnv` from Vite to read env vars since `astro.config.mjs` can't use `import.meta.env` directly:

```javascript
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sanity from "@sanity/astro";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import { loadEnv } from "vite";

const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET } = loadEnv(
  process.env.NODE_ENV,
  process.cwd(),
  "",
);

export default defineConfig({
  output: "hybrid",
  adapter: vercel(),
  integrations: [
    sanity({
      projectId: PUBLIC_SANITY_PROJECT_ID,
      dataset: PUBLIC_SANITY_DATASET,
      useCdn: false,
      apiVersion: "2026-02-16",
      studioBasePath: "/studio",
      stega: {
        studioUrl: "/studio",
      },
    }),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add Sanity integration with React and type declarations"
```

---

### Task 5: Install Mux Plugins

**Files:**
- Modify: `package.json` (new dependencies)

**Step 1: Install Sanity Mux input plugin**

```bash
pnpm add sanity-plugin-mux-input
```

**Step 2: Install Mux Astro player**

```bash
pnpm add @mux/mux-player-astro
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Mux video plugins (Sanity input + Astro player)"
```

---

### Task 6: Set Up Environment Variables

**Files:**
- Create: `.env.example`
- Create: `.env` (local, gitignored)

**Step 1: Create .env.example**

```
# Sanity
PUBLIC_SANITY_PROJECT_ID=
PUBLIC_SANITY_DATASET=production

# Sanity Visual Editing (set to "true" in preview environments)
PUBLIC_SANITY_VISUAL_EDITING_ENABLED=false
SANITY_API_READ_TOKEN=

# Shopify Storefront API
SHOPIFY_STORE_DOMAIN=
SHOPIFY_STOREFRONT_ACCESS_TOKEN=
```

**Step 2: Create .env with actual values**

Copy `.env.example` to `.env` and fill in Sanity project ID and dataset. The Sanity project must exist — either create one at sanity.io/manage or use `npx sanity@latest init --env` to create one and auto-populate the `.env` file.

For now, if no project exists yet, run:

```bash
npx sanity@latest init --env --project-plan free
```

Follow prompts to create a new project. This writes `PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET` to `.env`.

**Step 3: Verify .gitignore includes .env**

The existing `.gitignore` already covers `.env` and `.env.*` (except `.env.example`). Verify this.

**Step 4: Commit**

```bash
git add .env.example && git commit -m "feat: add environment variable template"
```

---

### Task 7: Configure Sanity Studio

**Files:**
- Create: `sanity.config.ts`
- Create: `sanity.cli.ts`

**Step 1: Create sanity.cli.ts**

```typescript
import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.PUBLIC_SANITY_PROJECT_ID || "",
    dataset: process.env.PUBLIC_SANITY_DATASET || "production",
  },
});
```

**Step 2: Create sanity.config.ts (minimal, schema added in next task)**

```typescript
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { muxInput } from "sanity-plugin-mux-input";

export default defineConfig({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  plugins: [
    structureTool(),
    muxInput(),
  ],
  schema: {
    types: [],
  },
});
```

**Step 3: Verify Studio loads**

```bash
pnpm dev
```

Navigate to `http://localhost:4321/studio`. The Studio should load (empty, no document types yet). You may be prompted to add `localhost:4321` to CORS origins — follow the instructions.

**Step 4: Commit**

```bash
git add sanity.config.ts sanity.cli.ts && git commit -m "feat: configure Sanity Studio with Mux plugin"
```

---

### Task 8: Create Sanity Schemas

**Files:**
- Create: `src/sanity/schemaTypes/objects/hero.ts`
- Create: `src/sanity/schemaTypes/documents/home-page.ts`
- Create: `src/sanity/schemaTypes/index.ts`
- Modify: `sanity.config.ts` (import schema)

**Step 1: Create hero object schema**

Create `src/sanity/schemaTypes/objects/hero.ts`:

```typescript
import { defineField, defineType } from "sanity";
import { PlayIcon } from "@sanity/icons";

export const hero = defineType({
  name: "hero",
  title: "Hero",
  type: "object",
  icon: PlayIcon,
  fields: [
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "subheading",
      title: "Subheading",
      type: "string",
    }),
    defineField({
      name: "mediaType",
      title: "Media Type",
      type: "string",
      options: {
        list: [
          { title: "Image", value: "image" },
          { title: "Video", value: "video" },
        ],
        layout: "radio",
      },
      initialValue: "image",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: "alt",
          title: "Alternative Text",
          type: "string",
          validation: (rule) => rule.required(),
        }),
      ],
      hidden: ({ parent }) => parent?.mediaType !== "image",
    }),
    defineField({
      name: "video",
      title: "Video",
      type: "mux.video",
      hidden: ({ parent }) => parent?.mediaType !== "video",
    }),
  ],
});
```

**Step 2: Create homePage singleton schema**

Create `src/sanity/schemaTypes/documents/home-page.ts`:

```typescript
import { defineField, defineType } from "sanity";
import { HomeIcon } from "@sanity/icons";

export const homePage = defineType({
  name: "homePage",
  title: "Home Page",
  type: "document",
  icon: HomeIcon,
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Internal title for reference in Studio",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "hero",
      title: "Hero Section",
      type: "hero",
    }),
  ],
  preview: {
    select: {
      title: "title",
    },
  },
});
```

**Step 3: Create schema index**

Create `src/sanity/schemaTypes/index.ts`:

```typescript
import type { SchemaTypeDefinition } from "sanity";
import { hero } from "./objects/hero";
import { homePage } from "./documents/home-page";

export const schemaTypes: SchemaTypeDefinition[] = [hero, homePage];
```

**Step 4: Update sanity.config.ts to use schemas and add singleton structure**

```typescript
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { muxInput } from "sanity-plugin-mux-input";
import { schemaTypes } from "./src/sanity/schemaTypes";

export default defineConfig({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("Content")
          .items([
            S.listItem()
              .title("Home Page")
              .id("homePage")
              .child(
                S.document()
                  .schemaType("homePage")
                  .documentId("homePage")
              ),
          ]),
    }),
    muxInput(),
  ],
  schema: {
    types: schemaTypes,
  },
});
```

**Step 5: Verify in Studio**

```bash
pnpm dev
```

Navigate to `http://localhost:4321/studio`. You should see "Home Page" in the sidebar. Click it — the document editor should show Title, and Hero Section with the media type toggle, heading, subheading, and conditional image/video fields.

**Step 6: Commit**

```bash
git add src/sanity/schemaTypes/ sanity.config.ts && git commit -m "feat: add homePage singleton schema with hero (image/video)"
```

---

### Task 9: Create Sanity Client Utilities

**Files:**
- Create: `src/sanity/lib/load-query.ts`
- Create: `src/sanity/lib/image.ts`

**Step 1: Create load-query utility**

Create `src/sanity/lib/load-query.ts`:

```typescript
import type { QueryParams } from "sanity";
import { sanityClient } from "sanity:client";

const visualEditingEnabled =
  import.meta.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED === "true";
const token = import.meta.env.SANITY_API_READ_TOKEN;

export async function loadQuery<QueryResponse>({
  query,
  params,
}: {
  query: string;
  params?: QueryParams;
}) {
  if (visualEditingEnabled && !token) {
    throw new Error(
      "The `SANITY_API_READ_TOKEN` environment variable is required during Visual Editing.",
    );
  }

  const perspective = visualEditingEnabled ? "previewDrafts" : "published";

  const { result, resultSourceMap } = await sanityClient.fetch<QueryResponse>(
    query,
    params ?? {},
    {
      filterResponse: false,
      perspective,
      resultSourceMap: visualEditingEnabled ? "withKeyArraySelector" : false,
      stega: visualEditingEnabled,
      ...(visualEditingEnabled ? { token } : {}),
    },
  );

  return {
    data: result,
    sourceMap: resultSourceMap,
    perspective,
  };
}
```

**Step 2: Create image URL builder utility**

Create `src/sanity/lib/image.ts`:

```typescript
import { sanityClient } from "sanity:client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}
```

**Step 3: Commit**

```bash
git add src/sanity/lib/ && git commit -m "feat: add Sanity client utilities (loadQuery, image URL builder)"
```

---

### Task 10: Create Layout and Global Styles

**Files:**
- Create: `src/layouts/Layout.astro`
- Modify: `src/styles/global.css`

**Step 1: Create base layout**

Create `src/layouts/Layout.astro`:

```astro
---
import "../styles/global.css";

interface Props {
  title?: string;
}

const { title = "Noima" } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>
```

**Step 2: Update global.css with base styles**

```css
@import "tailwindcss";
```

**Step 3: Commit**

```bash
git add src/layouts/ src/styles/ && git commit -m "feat: add base layout with global styles"
```

---

### Task 11: Create Hero Component

**Files:**
- Create: `src/components/Hero.astro`

**Step 1: Create Hero component**

Create `src/components/Hero.astro`:

```astro
---
import { urlFor } from "../sanity/lib/image";

interface Props {
  hero: {
    heading?: string;
    subheading?: string;
    mediaType?: "image" | "video";
    image?: {
      asset: { _ref: string };
      alt?: string;
    };
    video?: {
      playbackId?: string;
    };
  };
}

const { hero } = Astro.props;
const { heading, subheading, mediaType, image, video } = hero;
---

<section>
  {mediaType === "image" && image?.asset && (
    <img
      src={urlFor(image).width(1920).height(1080).url()}
      alt={image.alt || ""}
      width="1920"
      height="1080"
    />
  )}

  {mediaType === "video" && video?.playbackId && (
    <mux-player
      playback-id={video.playbackId}
      muted
      autoplay
      loop
      style="--controls: none;"
    />
  )}

  <div>
    {heading && <h1>{heading}</h1>}
    {subheading && <p>{subheading}</p>}
  </div>
</section>

{mediaType === "video" && video?.playbackId && (
  <script>
    import "@mux/mux-player";
  </script>
)}
```

Note: We import the Mux player web component via a client-side script tag only when a video is present. The `@mux/mux-player-astro` package provides `MuxPlayer` as an Astro component alternative — but using the web component directly gives more control. Either approach works. If you prefer the Astro component:

```astro
---
import MuxPlayer from "@mux/mux-player-astro";
---
<MuxPlayer playbackId={video.playbackId} muted autoplay loop />
```

**Step 2: Commit**

```bash
git add src/components/Hero.astro && git commit -m "feat: add Hero component with image/Mux video support"
```

---

### Task 12: Create Shopify Client

**Files:**
- Create: `src/lib/shopify.ts`

**Step 1: Create Shopify Storefront API client**

Create `src/lib/shopify.ts`:

```typescript
const SHOPIFY_STORE_DOMAIN = import.meta.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN =
  import.meta.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  featuredImage: {
    url: string;
    altText: string | null;
  } | null;
}

const FEATURED_PRODUCTS_QUERY = `
  query FeaturedProducts($first: Int!) {
    products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        id
        title
        handle
        description
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        featuredImage {
          url
          altText
        }
      }
    }
  }
`;

export async function getFeaturedProducts(
  count: number = 4,
): Promise<ShopifyProduct[]> {
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    console.warn("Shopify environment variables not set, skipping product fetch");
    return [];
  }

  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/api/2024-10/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: FEATURED_PRODUCTS_QUERY,
        variables: { first: count },
      }),
    },
  );

  const { data } = await response.json();
  return data?.products?.nodes ?? [];
}

export function getProductUrl(handle: string): string {
  return `https://${SHOPIFY_STORE_DOMAIN}/products/${handle}`;
}
```

**Step 2: Commit**

```bash
git add src/lib/shopify.ts && git commit -m "feat: add Shopify Storefront API client for featured products"
```

---

### Task 13: Create Homepage

**Files:**
- Modify: `src/pages/index.astro`

**Step 1: Build the homepage with hero + featured products**

Update `src/pages/index.astro`:

```astro
---
import Layout from "../layouts/Layout.astro";
import Hero from "../components/Hero.astro";
import { loadQuery } from "../sanity/lib/load-query";
import { getFeaturedProducts, getProductUrl } from "../lib/shopify";

const HOME_QUERY = `*[_type == "homePage" && _id == "homePage"][0]{
  title,
  hero {
    heading,
    subheading,
    mediaType,
    image {
      asset,
      alt
    },
    video {
      "playbackId": asset->playbackId
    }
  }
}`;

const { data: homePage } = await loadQuery<{
  title: string;
  hero: {
    heading?: string;
    subheading?: string;
    mediaType?: "image" | "video";
    image?: { asset: { _ref: string }; alt?: string };
    video?: { playbackId?: string };
  };
}>({ query: HOME_QUERY });

const products = await getFeaturedProducts(4);
---

<Layout title={homePage?.title || "Noima"}>
  {homePage?.hero && <Hero hero={homePage.hero} />}

  {products.length > 0 && (
    <section>
      <h2>Featured Products</h2>
      <div>
        {products.map((product) => (
          <a href={getProductUrl(product.handle)} target="_blank" rel="noopener noreferrer">
            {product.featuredImage && (
              <img
                src={product.featuredImage.url}
                alt={product.featuredImage.altText || product.title}
                width="400"
                height="400"
              />
            )}
            <h3>{product.title}</h3>
            <p>
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: product.priceRange.minVariantPrice.currencyCode,
              }).format(Number(product.priceRange.minVariantPrice.amount))}
            </p>
          </a>
        ))}
      </div>
    </section>
  )}
</Layout>
```

**Step 2: Verify the page renders**

```bash
pnpm dev
```

Navigate to `http://localhost:4321`. The page should render without errors. If no Sanity content or Shopify products exist yet, it will show a mostly empty page — that's expected.

**Step 3: Commit**

```bash
git add src/pages/index.astro && git commit -m "feat: create homepage with hero and featured products"
```

---

### Task 14: Deploy Sanity Schema and Create Initial Content

**Step 1: Deploy schema to Content Lake**

```bash
npx sanity schema deploy
```

This makes the schema available for MCP tools and the hosted Studio.

**Step 2: Create initial homePage document in Studio**

Navigate to `http://localhost:4321/studio`, click "Home Page", and create initial content:
- Title: "Home"
- Hero: Set media type to "image", add an image, set heading and subheading
- Publish the document

**Step 3: Verify homepage renders content**

Navigate to `http://localhost:4321`. The hero section should display the image and text from Sanity.

---

### Task 15: Update CLAUDE.md and README.md

**Step 1: Verify CLAUDE.md and README.md are up to date**

These were already created during the design phase. After implementation, verify they still accurately reflect the final state. Update if any paths or commands changed during implementation.

**Step 2: Final commit**

```bash
git add -A && git commit -m "docs: finalize CLAUDE.md and README.md"
```

---

### Task 16: Verify Full Build

**Step 1: Run production build**

```bash
pnpm build
```

Expected: Build succeeds without errors.

**Step 2: Preview production build**

```bash
pnpm preview
```

Navigate to `http://localhost:4321` — verify the homepage renders. Navigate to `/studio` — verify the Studio loads.

**Step 3: Final commit if any fixes were needed**

```bash
git add -A && git commit -m "fix: resolve build issues"
```
