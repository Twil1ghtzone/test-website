---
name: frontend-architecture
description: Governs Server/Client Component boundaries, Tailwind design tokens, shadcn/ui-style components, Framer Motion usage, and state management choices. Use when adding a new component, page, or interactive UI element.
---

# Frontend Architecture

## Server vs. Client Components
- Default to Server Components. Add `"use client"` only when the component needs
  `useState`/`useEffect`, browser APIs, or a client-only library (framer-motion, etc.) —
  see `components/ContactForm.tsx` and `components/ui/motion.tsx` for the existing
  pattern of marking exactly the interactive leaf, not the whole page.
- Don't push `"use client"` up into a page or layout just because one child needs it —
  keep the boundary as low in the tree as possible (this is also `vercel-optimizer`'s
  concern; the two skills agree here).

## Styling — Tailwind v4 design tokens
- Design tokens live in `app/globals.css` under `@theme` (`--color-canvas`,
  `--color-ink`, `--color-accent`, etc.) — use these tokens (`bg-canvas`, `text-ink`,
  `border-line`) instead of raw hex or arbitrary Tailwind color classes. Adding a new
  color means adding a new `--color-*` token in `@theme`, not a one-off `bg-[#hex]`.
- There is no separate `tailwind.config.*` — v4's CSS-first config in `globals.css` is
  the single source of truth for the design system. Don't create a config file to add
  tokens.

## Components — shadcn/ui-style, not a shadcn CLI install
- `components/ui/` already follows the shadcn/ui pattern: Radix primitive + `cva` +
  Tailwind (see `button.tsx`, `dialog.tsx`, `checkbox.tsx`, `label.tsx`). New primitives
  should match this shape (Radix for behavior/a11y, `class-variance-authority` for
  variants, `cn()` for class merging) rather than hand-rolling a bespoke component or
  pulling in an unrelated component library.
- Check `components/ui/` for an existing primitive before building a new one — this
  project already has `dialog`, `checkbox`, `input`, `label`, `combobox`, `3d-card`,
  `spotlight-card`, `morphing-card-stack`, and a shared motion/button-physics layer
  (`components/ui/motion.tsx`).

## Motion — Framer Motion conventions already in place
- `components/ui/motion.tsx` centralizes reduced-motion handling
  (`useReducedMotionSafe`) and shared spring physics for button interactions. New
  interactive components should reuse these exports instead of reimplementing
  `useReducedMotion()` directly — the hand-rolled hydration-safe wrapper exists
  specifically to avoid a hydration mismatch (see the comment in that file for why the
  naive version breaks).
- Heavy/canvas-only motion (`canvas-reveal-effect.tsx`) goes behind `next/dynamic` with
  `{ ssr: false }` — same rule as `vercel-optimizer`.

## State management
- No TanStack Query or Zustand in this project, and none of the current data needs it:
  server data comes from Server Components reading `lib/server/store.ts` directly, and
  client interactivity is local `useState` per component (see `ContactForm.tsx`,
  `Testimonials.tsx`'s two-step verify flow).
- Don't introduce TanStack Query or Zustand speculatively. The signal to add TanStack
  Query is client-side data that needs caching/revalidation across route navigations
  (e.g. an admin panel doing frequent client-side refetches); the signal for Zustand is
  UI state shared across components with no sensible common parent. Until one of those
  is actually the problem, plain `useState`/prop-drilling/React Context is the right
  amount of machinery.
