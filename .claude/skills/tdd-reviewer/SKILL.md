---
name: tdd-reviewer
description: Enforces Test-Driven Development and strict modular code quality. Use before implementing a new feature or API route, and when reviewing a diff for complexity, dead code, or oversized functions/bundles.
---

# TDD Reviewer

## Before writing feature code
- State the test(s) that would prove the feature works before writing the implementation.
  For API routes in this project (`app/api/**/route.ts`), that means: what request goes in,
  what status/JSON comes out, and what the failure cases are (bad input, missing auth,
  rate limit).
- If a real test runner isn't set up in this project yet, a verified manual check (curl
  against the running dev server, as already practiced in this session) stands in — but the
  check must happen before the feature is declared done, not skipped.

## Code quality gate on every diff
- Functions should do one thing; if a function mixes validation, business logic, and
  persistence, split it.
- No dead code: don't leave unused exports, commented-out blocks, or unreachable branches.
- Watch bundle size impact — a new client-side dependency in a `"use client"` component
  should be justified (check if it can be server-only or dynamically imported instead).
- Keep functions short enough to read in one screen; extract helpers rather than nesting
  deeply.

## Red flags to call out during review
- Business logic duplicated across two `route.ts` files instead of shared in `lib/`.
- A component importing a heavy library (charting, animation, markdown) without
  `next/dynamic` when it's not needed above the fold.
- Silent `catch {}` blocks that swallow errors a test would have caught.
