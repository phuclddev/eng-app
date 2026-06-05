# API Surface

## Auth

- `GET/POST /api/auth/[...nextauth]`

## Admin

- `GET /api/admin/chunks/export`
- `POST /api/admin/chunks/import`
- `POST /api/admin/questions/import`

### `POST /api/admin/chunks/import`

- Accepts multipart form data with:
  - `file`: CSV file
  - `dryRun`: `true` or `false`
- Validates the whole file before import.
- Returns an admin-facing summary with:
  - `created`
  - `updated`
  - `skipped`
  - `errors`
- Actual import runs in a transaction and will not partially import if any row is invalid.
- Duplicate chunks are upserted by `(chunk, meaningVi)`.

### `POST /api/admin/questions/import`

- Accepts multipart form data with:
  - `file`: CSV file
- Supports IELTS speaking question import for:
  - `PART_1`
  - `PART_2`
  - `PART_3`
- Expected CSV columns:
  - `skill`
  - `task_type`
  - `topic`
  - `sub_topic`
  - `difficulty`
  - `target_band`
  - `prompt`
  - `supporting_points`
  - `notes`
- Validates the whole file before import.
- Uses fingerprint-based upsert behavior so the same question can be updated safely.
- Returns an admin-facing summary with:
  - `created`
  - `updated`
  - `skipped`
  - `errors`

## Question Bank

- Learner route: `GET /questions`
- Admin route: `GET /admin/questions`

## AI Tutor

- Learner route: `GET /ai-tutor`
- Chat API: `POST /api/ai-tutor/chat`

### `POST /api/ai-tutor/chat`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `message`: string
  - `conversationId`: optional internal AI conversation id owned by the current user
  - `purpose`: optional one of:
    - `GENERAL_CHAT`
    - `SENTENCE_CORRECTION`
    - `SPEAKING_COACH`
    - `CHUNK_EXPLANATION`
- Returns:
  - `answer`
  - `conversationId`
- The route resolves the internal conversation id to the stored upstream `conversation_id` on the server, so users cannot reuse another user's conversation thread.
- Practice and question-bank AI helpers both call this route but do not block normal learner flows if the upstream AI fails.

## Practice

- `POST /api/practice/submit`

Server actions cover chunk CRUD, topic management, question-chunk mapping, and user moderation.
