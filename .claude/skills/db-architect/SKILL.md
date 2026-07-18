---
name: db-architect
description: Optimizes database schemas, scale preparation, and prevents N+1 query problems. Use when designing or changing a data model, adding a migration, or reviewing query performance in lib/server/store.ts or any future ORM layer.
---

# DB Architect

Applies to this project's JSON-file store (`lib/server/store.ts`) today, and to any
future Prisma/PlanetScale-style ORM the project migrates to.

## When adding or changing a data shape
- Prefer additive changes (new optional fields) over breaking renames/removals — this store
  has no migration runner, so old records on disk must still parse under the new type.
- Backfill defaults for new required fields in the `read*()` accessor (see `readUsers`,
  `readInvoices`, `readTickets` for the existing pattern), not by mutating files in place.
- Keep IDs stable and never reuse them; treat every collection as append-mostly.

## Preventing N+1-shaped problems in a file-backed store
- Never call `readX()` inside a `.map()`/`.filter()` loop over another collection — read
  each collection once, then join in memory.
- Cross-reference by pre-building a `Map<key, value>` before iterating (same principle as
  eager-loading in a real ORM).

## If/when this migrates to Prisma or a real database
- Every new relation needs an explicit index on the foreign key before it ships.
- Schema changes go through a dry-run migration first; never hand-edit a production schema.
- Flag any query pattern that would issue one query per row in a result set — batch it.
