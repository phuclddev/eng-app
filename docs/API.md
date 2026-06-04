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

## Practice

- `POST /api/practice/submit`

Server actions cover chunk CRUD, topic management, question-chunk mapping, and user moderation.
