# API Surface

## Auth

- `GET/POST /api/auth/[...nextauth]`

## Admin

- `GET /api/admin/chunks/export`
- `POST /api/admin/chunks/import`
- `POST /api/admin/questions/import`
- `POST /api/admin/translation/import`

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

## Translation Recall Lab

- Learner list route: `GET /translation`
- Learner script route: `GET /translation/[id]`
- Admin import route: `GET /admin/translation`
- Translation API: `POST /api/admin/translation/import`
- Translation API: `POST /api/translation/extract-chunk`
- Translation API: `POST /api/translation/save-chunk`
- Translation API: `POST /api/translation/review`
- Translation API: `POST /api/translation-recall/from-question`

### `POST /api/admin/translation/import`

- Requires `ADMIN` role.
- Accepts multipart form data with:
  - `file`: CSV file (UTF-8)
- Expected headers: `title, topic, bandLevel, englishText, vietnameseText`
- Sentences sharing the same `title + topic` are grouped into a single `TranslationScript`.
- Re-uploading the same `title + topic` replaces existing sentences for that script (idempotent re-import).
- Returns `summary` with `scriptsCreated`, `scriptsUpdated`, `sentencesCreated`, `totalRows`, `errors`.
- XLSX uploads are explicitly rejected with a friendly error suggesting CSV export.

### `POST /api/translation/extract-chunk`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `sentenceId`
  - `englishPhrase` — the user-selected phrase
- Sends the sentence + selected phrase to AI and parses a JSON response with:
  - `chunk`
  - `meaningVi`
  - `usage`
  - `example`
  - `suggestedTopic`
  - `bandEstimate`
- Returns the structured `extracted` object. AI failures return `503 AI_TUTOR_UNAVAILABLE`.

### `POST /api/translation/save-chunk`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `sentenceId`
  - `englishPhrase`
  - `meaningVi`
  - `example`
  - `usageContext` optional
  - `suggestedTopic` optional (created on the fly if missing)
  - `bandEstimate` optional (default `6`)
  - `tags` optional string array
- Upserts into the existing IELTS `Chunk` table by `(chunk, meaningVi)` and also stores a `TranslationChunkMapping` row linking the sentence to the new chunk.
- Returns the `mapping` record including the linked `chunkId`.

### `POST /api/translation/review`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `sentenceId`
  - `confidence` one of `EASY`, `MEDIUM`, `HARD`
- Upserts a `TranslationSentenceReview` row for the current user and increments the matching confidence counter plus the total review count.
- Returns the refreshed `TranslationSentenceRecord` for the updated sentence.

### `POST /api/translation-recall/from-question`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `speakingQuestionId`
  - `targetBand` optional, defaults to the question's `targetBand`
  - `length` optional one of `SHORT`, `MEDIUM`, `LONG` (default `MEDIUM`)
  - `includeChunkLibrary` optional boolean (default `true`)
  - `regenerate` optional boolean (default `false`)
  - `maxChunks` optional integer between `1` and `30`
- Loads the speaking question + recommended chunks. If `includeChunkLibrary` is true, also loads same-topic and high-value general chunks, then bounds the shortlist to `30`.
- Calls AI once with a strict-JSON prompt that asks for a single answer containing:
  - `title`
  - `englishAnswer` (Markdown with `**chunk**` bold)
  - `vietnameseTranslation`
  - `sentences[]` aligned `{ english, vietnamese }`
  - `usedChunks[]`
- Falls back to plain-text sentence splitting when the AI omits `sentences[]` or returns non-JSON.
- Persists a `TranslationScript` (with `sourceType = SPEAKING_QUESTION`, `generatedByAi = true`, `usedChunkIds`, and an incrementing `version`) plus aligned `TranslationSentence` rows.
- If a script already exists for `(speakingQuestionId, targetBand)` and `regenerate` is `false`, returns the existing script with `duplicate: true` and skips the AI call.
- Returns:
  - `script` with `id`, `title`, `topic`, `bandLevel`, `version`, `sentenceCount`, `sourceQuestionId`
  - `usedChunks[]` (resolved from the IELTS chunk library)
  - `englishMarkdown`, `vietnameseText`
  - `duplicate`
  - `fallbackUsed`
  - `warnings[]`
- The route logs metadata only: `userId`, `speakingQuestionId`, `length`, `targetBand`, `duplicate`, `fallbackUsed`, `usedChunkCount`. It never logs the AI token or the full answer body.

## Family English

- Learner route: `GET /family`
- Learner route: `GET /family/profile`
- Learner route: `GET /family/scenarios`
- Learner route: `GET /family/conversations`
- Learner route: `GET /family/chunks`
- Learner route: `GET /family/practice`
- Family AI API: `POST /api/family/conversations/generate`
- Family AI API: `POST /api/family/chunks/extract`
- Family Practice API: `POST /api/family/practice/start`
- Family Practice API: `POST /api/family/practice/submit`
- Family Practice API: `POST /api/family/practice/ai-feedback`
- Family Roleplay API: `POST /api/family/roleplay/start`
- Family Roleplay API: `POST /api/family/roleplay/message`
- Family Roleplay API: `POST /api/family/roleplay/finish`
- Family Roleplay API: `POST /api/family/roleplay/archive`
- Family Roleplay API: `GET /api/family/roleplay/sessions`
- Family Roleplay API: `GET /api/family/roleplay/sessions/[id]`
- Family Daily Coach API: `POST /api/family/today/plan`
- Family Insights API: `POST /api/family/insights/summary`
- Family Favorites API: `GET /api/family/favorites`
- Family Favorites API: `POST /api/family/favorites`
- Family Favorites API: `DELETE /api/family/favorites`
- Family pages: `GET /family/today`, `GET /family/insights`, `GET /family/favorites`

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

### `POST /api/family/practice/start`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `mode` optional one of `DAILY`, `REVIEW`, `MIXED`
  - `maxItems` optional integer between `1` and `20`
- Loads on the server:
  - the user's `APPROVED` `FamilyChunk` records
  - the user's `FamilyReviewSchedule` rows
- Returns:
  - `deck.mode`
  - `deck.exercises`
  - `deck.totalDue`
  - `deck.totalApprovedChunks`
- The route logs metadata only: `userId`, `mode`, deck size, due review count.

### `POST /api/family/practice/submit`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `mode`
  - `startedAt` optional ISO timestamp
  - `answers[]`:
    - `familyChunkId`
    - `exerciseType`
    - `prompt`
    - `expectedAnswer`
    - `userAnswer`
    - `isCorrect`
    - `responseTimeMs`
    - `confidenceLevel`
    - `feedback` optional
- Validates:
  - all family chunks belong to the current user
  - all family chunks are `APPROVED`
- Saves:
  - one `FamilyPracticeSession` row
  - one `FamilyPracticeAnswer` row per answer
  - one upserted `FamilyReviewSchedule` row per chunk
- Returns:
  - `sessionId`
  - `summary.totalQuestions`
  - `summary.correctAnswers`
  - `summary.averageResponseMs`
  - `summary.accuracyRate`
  - `summary.score`
- The route logs metadata only.

### `POST /api/family/practice/ai-feedback`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `familyChunkId`
  - `prompt`
  - `userAnswer`
- Loads on the server:
  - the owned `APPROVED` `FamilyChunk`
  - the active `FamilyProfile` when available
- Builds a separate family practice feedback prompt and calls the shared AI client.
- Returns:
  - `answer` (Markdown)
  - `available` (boolean)
- AI failure returns a friendly error with `code: "AI_TUTOR_UNAVAILABLE"`; the practice runner continues without blocking the session.

### `POST /api/family/roleplay/start`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `scenarioId` optional, must belong to the current user when present
  - `userRole` one of `FATHER`, `MOTHER`, `KIWI`, `VIVI`, `GRANDPARENT`
  - `aiRole` one of the same set; must differ from `userRole`
  - `childFocus` optional one of `KIWI`, `VIVI`, `BOTH`
  - `targetLevel` optional one of `BASIC`, `NATURAL`, `ADVANCED`
  - `turnsLimit` optional integer between `3` and `12`
- Loads the user's active `FamilyProfile` and (if provided) the owned `FamilyScenario`.
- Calls AI for the first in-character message, stores the upstream `conversation_id` on the session, and saves the first AI message at turn `0`.
- Returns:
  - `session` — the full `FamilyRoleplaySessionRecord`

### `POST /api/family/roleplay/message`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `sessionId`
  - `message`
- Enforces ownership; non-owners receive `403 FORBIDDEN`.
- Rejects messages on `COMPLETED` or `ARCHIVED` sessions.
- Reuses the stored `externalConversationId` server-side — the client cannot supply a conversation id.
- Saves the user message and the AI response in one transaction, increments `turnsTaken`, updates the stored `externalConversationId` if the upstream rotates it.
- Returns the refreshed `FamilyRoleplaySessionRecord`.

### `POST /api/family/roleplay/finish`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `sessionId`
- Builds a Markdown coach prompt from the saved transcript and asks AI for these sections:
  - `# Overall Feedback`
  - `# Better Phrases You Could Use`
  - `# Useful Family Chunks`
  - `# What You Did Well`
  - `# Next Practice Suggestion`
- If AI fails, the session still completes with a placeholder feedback note.
- Returns the refreshed `FamilyRoleplaySessionRecord` with `status: COMPLETED` and `finalFeedbackMarkdown`.

### `POST /api/family/roleplay/archive`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `sessionId`
- Sets the session `status` to `ARCHIVED`.
- Returns the updated session summary.

### `GET /api/family/roleplay/sessions`

- Requires an authenticated and `APPROVED` user.
- Returns the 30 most recent sessions belonging to the user as `FamilyRoleplaySessionSummary[]`.

### `GET /api/family/roleplay/sessions/[id]`

- Requires an authenticated and `APPROVED` user.
- Returns the owned `FamilyRoleplaySessionRecord` including all messages.
- Returns `403 FORBIDDEN` when another user owns the session id.

### `POST /api/family/today/plan`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `childFocus` optional one of `KIWI`, `VIVI`, `BOTH` (default `BOTH`)
  - `forceRefresh` optional boolean
- Builds deterministic recommendations from the user's family data, then either returns the cached `FamilyDailyPlanSnapshot` or asks AI for a fresh Markdown plan with these sections:
  - `# Today's Focus`
  - `# Recommended Scenario`
  - `# Recommended Chunks`
  - `# Recommended Conversation`
  - `# Recommended Roleplay`
  - `# Parenting English Tip`
- Returns:
  - `plan` — `FamilyDailyPlanRecord` (with `cached` flag)
  - `recommendations` — `FamilyTodayRecommendations`
- The route logs metadata only (no AI token, no full profile, no full plan body).

### `POST /api/family/insights/summary`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `forceRefresh` optional boolean (reserved for a future weekly cache)
- Builds the weekly snapshot live and calls AI for a Vietnamese-coach Markdown summary with these sections:
  - `# Weekly Summary`
  - `# What Phuc Did Well`
  - `# What To Focus On Next Week`
  - `# Suggested Roleplay Themes`
  - `# Family English Tip`
- Returns:
  - `answer` (Markdown)
  - `cached` (always `false` in Phase 8; reserved for later caching)

### `GET /api/family/favorites`

- Requires an authenticated and `APPROVED` user.
- Returns the user's saved favorites with `label` and `detail` joined from the underlying target rows.

### `POST /api/family/favorites`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `targetType` one of `CONVERSATION`, `CHUNK`, `ROLEPLAY`, `SCENARIO`
  - `targetId`
  - `note` optional
- Verifies the target belongs to the current user before upserting the favorite.

### `DELETE /api/family/favorites`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `targetType`
  - `targetId`
- Idempotent: returns `{ ok: true }` even if the favorite did not exist.

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
