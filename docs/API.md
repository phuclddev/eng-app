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
- Learner route: `GET /speaking-simulator`
- Learner route: `GET /study-coach`
- Chat API: `POST /api/ai-tutor/chat`
- Chunk Coach API: `POST /api/ai-tutor/chunk-coach`
- Missing Chunk API: `POST /api/ai-tutor/missing-chunks`
- Speaking Simulator start API: `POST /api/ai-tutor/speaking-simulator/start`
- Speaking Simulator message API: `POST /api/ai-tutor/speaking-simulator/message`
- Study Coach API: `POST /api/ai-tutor/study-coach`

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

### `POST /api/ai-tutor/chunk-coach`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `chunkId`
- Loads the chunk on the server and asks AI to return structured sections for:
  - `Meaning in Vietnamese`
  - `When to use it`
  - `When not to use it`
  - `IELTS Speaking context`
  - `Natural examples`
  - `Common Vietnamese learner mistakes`
  - `Similar chunks`
  - `Mini practice task`
- The chunk text and its metadata stay server-side:
  - `chunk`
  - `meaningVi`
  - `example`
  - `topic`
  - `difficulty`
  - `bandLevel`
  - `grammarPattern`
  - `tags`
  - `wrongExamples`
- Returns:
  - `answer`
  - `sections` when the AI follows the structured format
- Falls back to plain text if the AI answer is not structured.

### `POST /api/ai-tutor/missing-chunks`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `prompt` optional
  - `targetChunk` optional
  - `recommendedChunks` optional
  - `userAnswer`
  - `topic` optional
  - `part` optional
- Returns structured sections when possible for:
  - `Chunks already used`
  - `Missing useful chunks`
  - `Improved answer`
  - `Vietnamese explanation`
  - `Next mini task`
- The route is used by:
  - speaking prompt answer coaching
  - `CREATE_SENTENCE`
  - `REWRITE_SENTENCE`
- Falls back to plain text if the AI answer is not structured.

### `POST /api/ai-tutor/speaking-simulator/start`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `part`
  - `topic` optional
  - `questionId` optional
  - `prompt` optional
  - `targetBand` optional
  - `numberOfTurns`
- Creates a stored simulator session with its own upstream `conversation_id` and returns the first examiner message.
- Supports:
  - `PART_1`
  - `PART_2`
  - `PART_3`
  - `MIXED`
- Stores the session under the current user and never trusts a browser-provided upstream conversation id.

### `POST /api/ai-tutor/speaking-simulator/message`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `sessionId`
  - `message`
- Enforces simulator session ownership on the server.
- Continues the examiner thread using the stored upstream `conversation_id`.
- Returns either the next examiner question or final structured simulator feedback.
- Final feedback sections are normalized when possible:
  - `Estimated band`
  - `Fluency`
  - `Lexical resource`
  - `Grammar`
  - `Chunk usage`
  - `Suggested chunks`
  - `Next practice`

### `POST /api/ai-tutor/study-coach`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `forceRefresh` optional
- Builds a compact learner profile from progress, weak chunks, weak topics, due reviews, and recent practice signals.
- Returns a cached or fresh AI study plan with structured sections when available.
- Structured sections target:
  - `Short diagnosis`
  - `Top 3 weaknesses`
  - `Recommended chunks`
  - `Speaking prompts`
  - `7-day study plan`
- Uses a cached snapshot when the compact learner profile hash has not materially changed.

## Practice

- `POST /api/practice/submit`

Server actions cover chunk CRUD, topic management, question-chunk mapping, and user moderation.
