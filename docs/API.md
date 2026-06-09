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

## Family English

- Learner route: `GET /family`
- Learner route: `GET /family/profile`
- Learner route: `GET /family/scenarios`
- Learner route: `GET /family/conversations`
- Learner route: `GET /family/chunks`
- Learner route: `GET /family/practice`
- Family AI API: `POST /api/family/conversations/generate`
- Family AI API: `POST /api/family/chunks/extract`

### Phase 3 + Phase 4 note

- The Family English module is isolated from IELTS routes and data models.
- There is still no public REST API for family profile editing in this phase.
- `/family/profile` currently saves through a server action tied to the signed-in user's own profile.
- Family scenario CRUD currently uses server actions tied to the signed-in user's own data.
- Family chunk review now uses server actions tied to the signed-in user's own data.
- Family practice and roleplay APIs are intentionally deferred to later phases.

### `POST /api/family/conversations/generate`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `scenarioId`
  - `childFocus`
  - `conversationLength`
  - `targetLevel`
  - `vietnameseSupport` optional
- Loads on the server:
  - the user's active `FamilyProfile`
  - the user's own active `FamilyScenario`
- Builds a compact family-specific AI prompt and saves the generated markdown as `FamilyConversation`.
- Returns:
  - `conversation`
- The AI response is expected to contain Markdown sections:
  - `# Situation`
  - `# Conversation`
  - `# Useful Chunks`
  - `# Notes for Phuc`
  - `# Mini Practice`
- The route logs request metadata only:
  - `userId`
  - `scenarioId`
  - generation options
- It does not log the AI token or full family profile content.

### `POST /api/family/chunks/extract`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `conversationId`
- Loads on the server:
  - the user's own `FamilyConversation`
  - the related `FamilyScenario`
  - the user's active `FamilyProfile` when available
- Builds a compact chunk-extraction prompt and calls the shared server-side AI client.
- Requires structured JSON output from AI before any database write happens.
- Skips duplicate chunks for the same user by normalized chunk text.
- Saves only new chunks as `SUGGESTED`.
- Returns:
  - `summary.created`
  - `summary.skippedDuplicates`
  - `summary.errors`
- The route logs request metadata only:
  - `userId`
  - `conversationId`
  - created count
  - skipped duplicate count
- It does not log the AI token, full family profile, or full extracted chunk payload.

## AI Tutor

- Learner route: `GET /ai-tutor`
- Learner route: `GET /speaking-simulator`
- Learner route: `GET /study-coach`
- Chat API: `POST /api/ai-tutor/chat`
- Chunk Coach API: `POST /api/ai-tutor/chunk-coach`
- Missing Chunk API: `POST /api/ai-tutor/missing-chunks`
- Sample Answer API: `POST /api/ai-tutor/sample-answer`
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

### `POST /api/ai-tutor/sample-answer`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `speakingPromptId`
  - `targetBand` optional
  - `maxChunks` optional, defaults to `30`, hard max `80`
- Loads the speaking prompt context on the server:
  - `taskType`
  - `topic`
  - `subTopic`
  - `prompt`
  - `supportingPoints`
  - mapped recommended chunks
- Builds a bounded chunk context from the active chunk library:
  - mapped chunks first
  - same-topic chunks next
  - high-value general speaking chunks last
- Returns:
  - `answer`
  - `speakingPromptId`
  - `targetBand`
  - `selectedChunkCount`
  - `usedChunks`
- The answer is generate-only for now and is not yet persisted to a dedicated sample-answer table.

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
