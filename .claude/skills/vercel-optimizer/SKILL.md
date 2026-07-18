---
name: vercel-optimizer
description: Enforces Next.js Core Web Vitals and Vercel infrastructure limits. Use when adding a new page/route, a heavy client component, or reviewing rendering strategy (static vs dynamic vs streaming) for performance.
---

# Vercel / Next.js Optimizer

This project already uses `output: "standalone"`, App Router, and a mix of static/dynamic
routes (see the route table printed by `next build`). Keep it that way deliberately.

## Rendering strategy
- Default to Server Components. Only add `"use client"` when the component needs state,
  effects, browser APIs, or a client-only library (framer-motion, etc.).
- Static pages (`○`) should stay static — don't introduce `cookies()`/`headers()` reads or
  `dynamic = "force-dynamic"` in a page that doesn't need per-request data.
- Pages that legitimately need fresh data (admin, anything reading from the JSON store)
  should stay `force-dynamic` rather than faking staleness with revalidate hacks.

## Streaming & Suspense
- Wrap slow/optional sections (heavy client widgets, data fetched from a slow external
  service) in `<Suspense>` with a lightweight fallback, so the shell paints immediately.
- `next/dynamic` with `{ ssr: false }` for anything canvas/DOM-only (see
  `components/ui/canvas-reveal-effect.tsx` for the existing pattern) — don't let it block
  the main bundle.

## Images & fonts
- Always use `next/image` with explicit `sizes` for responsive images (existing pages set
  this correctly — match that pattern for new ones).
- Don't add a new Google Font without checking `app/layout.tsx` first; reuse the existing
  `Inter`/`Fraunces` variables.

## Bundle discipline
- Before adding a new npm dependency for something achievable with a few lines of vanilla
  code (see `lib/markdown.ts` — hand-rolled, no markdown library), prefer the vanilla route.
- Large client-only libraries (chart/animation) go behind `next/dynamic`.

## Target
Treat any regression in Lighthouse Performance/Best-Practices/SEO as a bug, not a
nice-to-have — flag it in the same turn it's introduced, don't defer.
