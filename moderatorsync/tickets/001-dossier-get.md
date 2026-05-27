# Ticket 001 — Dossier GET handler

Goal: Implement GET `/api/dossier/:subredditId/:targetUserId` that returns the dossier payload.

Requirements:
- Read `UserMeta` from `RedisStore.getUserMeta`
- Read recent notes via `RedisStore.getRecentNotes`
- Look up Reddit user info via `getUserInfo`
- Compute metrics via `calculateMetrics`
- Return aggregated JSON: `{ meta, notes, metrics, redditInfo }`

Acceptance criteria:
- Endpoint compiles and returns sample JSON when called by frontend hook.
- Unit tests cover happy path and Redis-missing cases.

Status: IMPLEMENTED (existing route)

Implementation notes:
- Route implemented at `moderatorsync/src/server/routes/dossier.ts` and uses `RedisStore`, `getUserInfo`, and `calculateMetrics`.

Next: add unit tests covering happy and failure paths, and wire the frontend `useDossier` hook to error states.
