# Ticket 003 — Watchlist endpoints & cleanup job

Goal: Implement watchlist add/remove APIs and a scheduled cleanup job to expire entries.

Requirements:
- POST `/api/dossier/:subredditId/:targetUserId/watchlist` — Add with `durationHours` param
- POST `/api/dossier/:subredditId/:targetUserId/watchlist/remove` — Remove user
- A scheduled worker that calls `RedisStore.getWatchlistExpiring` and handles expirations

Acceptance criteria:
- Endpoints compile and modify Redis state accordingly
- Cleanup worker can be run manually via a script for testing
