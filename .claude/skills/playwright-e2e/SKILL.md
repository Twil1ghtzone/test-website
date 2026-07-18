---
name: playwright-e2e
description: Browser automation for end-to-end user workflows and automated layout/UI verification. Use when verifying a critical user flow (contact form, review submission, admin login) or checking responsive layout after a UI change.
---

# Playwright / Browser E2E Verification

This project doesn't have a Playwright test suite installed. This skill governs how to do
the equivalent verification with the tools actually available in this environment (the
Browser pane tools — `preview_start`, `navigate`, `computer`, `read_page`,
`read_network_requests`, `read_console_messages`) rather than assuming Playwright is
present.

## Critical paths to verify after touching them
- Contact form submit (`components/ContactForm.tsx` → `/api/inquiries`)
- Review submission two-step flow (invoice verify → submit) in `components/Testimonials.tsx`
- Admin login (`app/admin/page.tsx` → `/api/auth/login`) and permission-gated panels
- Blog subscribe (`components/BlogSubscribe.tsx` → `/api/blog/subscribe`)

## Verification method (no real Playwright installed here)
1. Start the dev server via `preview_start` (never via raw Bash — see project convention).
2. Drive the flow with `computer` (click/type) and confirm with `read_page`/`get_page_text`.
3. Check `read_network_requests` for the actual request/response, not just visual state.
4. Check `read_console_messages` for hydration or runtime errors.
5. For layout/responsive checks, use `resize_window` with the `mobile`/`tablet`/`desktop`
   presets and re-screenshot.
6. If a bug is found: read the source, fix it, then re-run steps 2–4 — don't declare done
   on the first pass.

## If real Playwright is later added
- Put specs under `e2e/`, one file per critical path above.
- CI should run `next build && next start` then point Playwright at the built app, not
  `next dev` — dev-mode timing differs from production.
- Capture a screenshot + trace on failure; don't just assert and move on.

## Explicitly out of scope for this skill
Installing `browser-use` or any third-party autonomous browser agent — that's a
separate, higher-trust decision the user makes explicitly, not something to pull in
automatically while "verifying UI."
