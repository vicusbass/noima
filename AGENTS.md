# AGENTS.md

Cross-tool conventions for AI assistants (Claude Code, Copilot, etc.) working in this repo. Keep this file as the single source of truth — `CLAUDE.md` and any tool-specific files should point here for shared conventions rather than duplicating them.

## Styling conventions

### Breakpoints

Always use Tailwind defaults via `md:` / `lg:` / `xl:` utilities. Tailwind v4 defaults:

| Token  | Min width |
|--------|-----------|
| `sm`   | 640px     |
| `md`   | 768px     |
| `lg`   | 1024px    |
| `xl`   | 1280px    |
| `2xl`  | 1536px    |

Do not introduce custom CSS media queries unless Tailwind genuinely cannot express the case — e.g. setting a CSS custom property at a breakpoint, targeting a child via a combinator, or styling a pseudo-element. When a custom media query is unavoidable, use one of the Tailwind values above (most commonly `min-width: 768px` for the tablet→desktop flip).

### Use Tailwind utilities first

Reach for raw CSS in `<style>` blocks only for things utilities can't express well:

- keyframes / animations
- complex pseudo-elements (`::after` overlays, masks)
- `clip-path`
- multi-stop gradients
- fluid typography that doesn't fit a utility
- aspect-ratio math the design tokens don't cover

For everything else (display, flex/grid, gap, padding, margin, font-size from the design scale, width/max-width, text-align, theme colors), prefer utilities and delete the corresponding rule from the `<style>` block.

### Image `sizes` attribute

Keep `sizes` breakpoints aligned with Tailwind's. Example:

```astro
<Image sizes="(min-width: 768px) 50vw, 100vw" ... />
```

Mismatched breakpoints between layout (`md:` = 768px) and `sizes` (e.g. 900px) cause the browser to fetch the wrong srcset variant in the in-between window.
