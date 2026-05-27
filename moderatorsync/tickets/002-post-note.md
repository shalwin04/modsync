# Ticket 002 — POST note endpoint

Goal: Implement POST `/api/dossier/:subredditId/:targetUserId/note` to create internal moderator notes.

Requirements:
- Validate request body: `content` (non-empty), optional `noteType`
- Use `RedisStore.addNote` with current moderator username/id
- Return created `NoteEntry` with `note_id` and timestamp
- Update `internal_note_count` in `UserMeta`

Acceptance criteria:
- Endpoint compiles and returns created note JSON
- Unit tests for validation and successful add
