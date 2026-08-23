---
name: api-architecture
description: Enforces request validation, consistent error shapes, and idempotency/rate-limit conventions for API routes. Use when adding or changing any app/api/**/route.ts handler.
---

# API Architecture

This project has no tRPC/Hono/OpenAPI layer — routes are plain Next.js Route Handlers
(`app/api/**/route.ts`) that hand-parse `req.json()` (see `app/api/inquiries/route.ts`).
This skill keeps that hand-rolled layer consistent instead of assuming a framework that
isn't here.

## Validation
- No Zod dependency exists yet in this project. Until it's added, validate manually at the
  top of the handler the way `app/api/inquiries/route.ts` does: parse with
  `req.json().catch(() => null)`, reject `null`/missing required fields with `400` before
  touching the store, coerce with `String(...)`/`.slice(n)` to cap length and type.
- If a route's manual validation grows past ~5 fields or needs nested shapes, that's the
  signal to introduce `zod` (`npm i zod`) rather than hand-rolling further — add it as a
  small `schema.parse(body)` at the top of the handler, not as a project-wide rewrite.
- Never trust `body.<field>` past the boundary check — re-validate types even for fields
  the frontend already validates (client checks are UX, not security).

## Error shape
- Every route in this project returns `{ error: string }` with a Fehlermeldung in German
  and an appropriate status (400 bad input, 401 unauthorized, 404 not found, 429 rate
  limited). Keep new routes on this exact shape — don't introduce a different error
  envelope (e.g. RFC 7807 `{ type, title, status, detail }`) in isolated routes; if the
  project ever adopts a richer error format, it goes in one pass across all routes, not
  route-by-route.
- Never leak stack traces, internal file paths, or raw thrown errors to the client —
  catch and map to the string above (see `shannon-security` for the security angle on
  this same rule).

## Idempotency
- State-changing `POST` routes that create records (e.g. `inquiries`, `reviews`) generate
  their own id server-side (`i-${Date.now()}` pattern) — a double-submit currently creates
  a duplicate record. If a route becomes prone to accidental double-submits (flaky network,
  double-click), dedupe with a client-supplied idempotency key checked against a short-lived
  in-memory set, following the same pattern as `lib/server/ratelimit.ts` (in-memory is
  sufficient given the single-process deployment) — don't add a new persistent store just
  for this.

## Rate limiting
- Every public `POST` route must call `rateLimit()` from `lib/server/ratelimit.ts` before
  doing any work — copy the pattern in `app/api/inquiries/route.ts` (key by
  `<route>:<ip>`, sensible max/window for the action). Admin routes behind
  `requirePermission()`/`requireAdmin()` don't need this — auth is the gate there.

## REST conventions already established — keep following them
- `GET` = admin read (auth-gated) or public read where the resource is public
  (`/api/blog`, `/api/reviews`).
- `POST` = create (often public, always rate-limited if public).
- `PATCH` = partial update by `id` in the body (see `inquiries` PATCH).
- `DELETE` = by `id` in a query param, not the body.
- Don't invent a different verb/shape for a new resource without a reason — consistency
  across `app/api/**` matters more than any single route being "more correct."

## If this ever grows into tRPC/Hono + OpenAPI
Only worth it once there are enough routes that hand-written fetch calls in the frontend
are the actual pain point. At that point: introduce it as a new layer alongside the
existing routes, migrate one resource at a time, don't do a big-bang rewrite of all
`app/api/**` routes in one PR.
