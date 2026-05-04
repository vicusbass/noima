# Tailwind `md` breakpoint cleanup

**Date:** 2026-05-04
**Status:** Approved, ready for implementation plan

## Goal

Stop using ad-hoc 900px CSS media queries. Standardize on Tailwind v4 default breakpoints (`md`=768px, `lg`=1024px, `xl`=1280px) and prefer Tailwind utilities over inline `<style>` blocks where utilities can express the same thing.

## Non-goals

- Rewriting bespoke CSS that has no breakpoint involvement (animations, gradients, pseudo-elements, `clip-path`, complex `clamp()` typography). These are out of scope.
- Touching the existing 768/1280 media queries already present in `src/styles/global.css` (`--site-inset`, `.container-x`).
- Modifying the vendored `noima-coffee-theme/` directory (Shopify theme, not part of the Astro site).

## Background

Repo-wide audit (run during brainstorming):

- 17 occurrences of `@media (min-width: 900px)` across `src/components/` and `src/pages/`
- 8 occurrences of `sizes="(min-width: 900px) ..."` on `<Image>` tags
- 1 occurrence of `@media (min-width: 1100px)` (in `src/components/FeaturedProducts.astro`)
- 21 `<style>` blocks total in `.astro` files (only those touching 900px / 1100px are in scope)
- Tailwind v4 is active; default breakpoints (`md`=768) are unused in code

The 900px breakpoint is treated by the codebase as the tablet→desktop flip. Adopting Tailwind's default 768px will shift that flip earlier — accepted; the user will visually validate.

## Convention (documentation deliverable)

Create `AGENTS.md` at the repo root with a "Styling conventions" section. Add a one-line pointer in `CLAUDE.md` referencing it.

`AGENTS.md` rationale: cross-tool standard read by both Claude Code and Copilot (and others). Single source of truth, no drift.

The styling conventions section must state:

1. **Breakpoints:** always use Tailwind defaults via `md:` / `lg:` / `xl:` utilities. Tailwind v4 defaults: `sm`=640, `md`=768, `lg`=1024, `xl`=1280, `2xl`=1536. Do not introduce custom CSS media queries unless Tailwind genuinely cannot express the case (e.g. setting a CSS custom property at a breakpoint, targeting a child via combinator).
2. **Use Tailwind utilities first.** Reach for raw CSS in `<style>` blocks only for things utilities can't do well: keyframes, complex pseudo-elements (`::after` overlays, masks), `clip-path`, multi-stop gradients, fluid typography that doesn't fit a utility, aspect-ratio math the design tokens don't cover.
3. **Image `sizes` attribute:** keep breakpoints aligned with Tailwind's. E.g. `sizes="(min-width: 768px) 50vw, 100vw"`.

`CLAUDE.md` change: add one line under an existing or new section pointing to `AGENTS.md` for styling conventions. Do not duplicate the content.

## Migration plan

### CSS media queries (17 in components, 1 in `global.css`)

For each `<style>` block containing `@media (min-width: 900px) { ... }`, do **one** of:

**Path 1 — inline as `md:` utilities, delete the rule.**
Use this when the desktop overrides are simple property changes that map cleanly to utilities (display, flex/grid, gap, padding, margin, font-size from the design scale, width/max-width, text-align, color from theme tokens).

Example transform:

```css
.grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
@media (min-width: 900px) { .grid { grid-template-columns: 1fr 1fr; gap: 2rem; } }
```

Becomes `class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8"`, the rule (and its base if redundant) is removed from the style block.

**Path 2 — flip the breakpoint in place from 900 to 768.**
Use this when the rule isn't ergonomic to express as a utility:

- sets a CSS custom property
- targets a child via descendant/child combinator
- modifies a pseudo-element
- uses a value not in the design scale (e.g. arbitrary `clamp()`)

The block stays; only `(min-width: 900px)` becomes `(min-width: 768px)`. No further refactor.

`global.css` — `.body-copy` rule: flip 900 → 768 (Path 2; `font-size` / `line-height` could be utilities but `.body-copy` is a class consumed elsewhere, so leave the class shape intact).

### `<Image sizes="...">` HTML attributes (8 occurrences)

Mechanical replacement of `(min-width: 900px)` → `(min-width: 768px)`. The vw/px values are untouched. This keeps image fetch hints aligned with the new layout breakpoint so the browser picks the right srcset variant in the 768–900px window.

### The 1100px outlier (`FeaturedProducts.astro`)

Currently flips `.products-grid` from auto-fit min-240px columns to a fixed 4-column grid at 1100px. 1100 is closer to Tailwind `lg` (1024) than `xl` (1280).

Decision: migrate to `lg:` (1024px). Express via utilities where possible; the count-aware `[data-count="N"]` selectors stay in a `<style>` block but with the media query at 1024px (Path 2), since they target attribute selectors that aren't ergonomic as utilities.

The user must visually validate the 4-column grid at the 1024–1100px range to confirm it doesn't crowd. If it does, fall back to a custom `desktop` breakpoint or revert to 1100px with a comment.

### Values that look like 900 but aren't breakpoints — leave alone

- `min-height: min(100svh, 900px)` in `Hero.astro` and `CafeneaHero.astro`. This is a max-height cap on the hero, unrelated to layout breakpoints.
- `font-weight: 900` in `.display`. Coincidence.

## Files affected

**Convention docs (new/updated):**

- `AGENTS.md` — new, contains the styling conventions section
- `CLAUDE.md` — add a one-line pointer to `AGENTS.md`

**CSS:**

- `src/styles/global.css` — flip the `.body-copy` media query 900 → 768

**Components with `(min-width: 900px)` media queries:**

- `src/components/Hero.astro` (2 queries)
- `src/components/OfferingSection.astro`
- `src/components/EventsSection.astro`
- `src/components/Button.astro`
- `src/components/WhySection.astro` (2 queries)
- `src/components/cafenea/CafeneaHero.astro` (3 queries)
- `src/components/cafenea/MenuSection.astro`
- `src/components/cafenea/EventsCarousel.astro`
- `src/components/cafenea/LocationSection.astro`
- `src/components/cafenea/ContactSection.astro`
- `src/components/contact/ContactHero.astro`
- `src/pages/evenimente/[slug].astro`

**Components/pages with `<Image sizes="...">` to update:**

- `src/components/OfferingSection.astro`
- `src/components/contact/ContactHero.astro`
- `src/components/WhySection.astro` (2 occurrences)
- `src/pages/despre-noi.astro` (3 occurrences)
- `src/pages/evenimente/[slug].astro`

**The 1100px outlier:**

- `src/components/FeaturedProducts.astro`

## Verification

1. `grep -rn "900px" src/ studio/` returns only `min-height: min(100svh, 900px)` in `Hero.astro` and `CafeneaHero.astro`, plus any `font-weight: 900` occurrences. No media queries, no `sizes` attributes. Anything under `noima-coffee-theme/` is ignored.
2. `grep -rn "1100px" src/ studio/` returns nothing (the FeaturedProducts outlier was migrated).
3. `pnpm build` succeeds.
4. `pnpm lint` clean.
5. Visual smoke test (manual, by user): open affected pages at 768px, 900px, 1024px, 1280px viewports. Confirm layouts flip at 768 instead of 900 in the affected components, and that the 4-column products grid kicks in at 1024 cleanly. Layout shift in the 768–900px window is the expected change, not a regression.
6. `AGENTS.md` exists, contains the styling conventions section, and is referenced from `CLAUDE.md`.

## Risks

- **Visual regressions in the 768–900px viewport range.** This is where Path 1 vs Path 2 produces the same outcome (utilities and media queries both flip at 768 now). Any layout that was finely tuned for the 900px flip will need adjustment. Mitigated by manual visual validation.
- **Image `sizes` mismatch in the same range** if the 8 `<Image>` updates are missed. Mitigated by the verification grep.
- **The 1100px → 1024px change in `FeaturedProducts.astro`** could crowd the 4-column grid on smaller laptops. Mitigated by visual smoke test; fallback options documented above.
