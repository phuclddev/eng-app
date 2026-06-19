# API Surface

## Auth

- `GET/POST /api/auth/[...nextauth]`

## Admin

- `GET /api/admin/chunks/export`
- `POST /api/admin/chunks/import`
- `POST /api/admin/questions/import`
- `POST /api/admin/questions/generate`
- `POST /api/admin/questions/status`
- `POST /api/admin/questions/bulk-status`
- `POST /api/admin/translation/import`

## Admin pages and server actions

- `GET /admin/ideas`
- `GET /admin/ideas/new`
- `GET /admin/ideas/[id]`
- `GET /admin/ideas/[id]/study-map`
- `GET /admin/ideas/map`
- `POST /api/admin/ideas/plantuml/render`
- `POST /api/admin/ideas/generate`
- `POST /api/admin/ideas/generate-answer`
- `POST /api/admin/ideas/map-question`
- `PATCH /api/admin/ideas/question-map/:id`
- `DELETE /api/admin/ideas/question-map/:id`
- `POST /api/admin/ideas/suggest-question-mapping`
- Server action: `saveSpeakingIdeaAction`
- Server action: `setSpeakingIdeaStatusAction`
- Server action: `saveSpeakingIdeaMindMapAction`

### Speaking Idea Map admin action contract

- Admin-only. Requires `ADMIN` role and an `APPROVED` session.
- `saveSpeakingIdeaAction` accepts:
  - `id` optional for update
  - `title`
  - `shortLabel`
  - `descriptionVi`
  - `descriptionEn`
  - `popularityScore` integer `1..5`
  - `reuseScore` integer `1..5`
  - `status` one of `DRAFT`, `ACTIVE`, `ARCHIVED`
  - `variants[]` with:
    - `bandLevel`
    - `phrase`
    - `exampleSentence`
  - `supports[]` with:
    - `supportType`
    - `text`
    - `example`
  - `patterns[]` with:
    - `patternText`
    - `variablesJson` optional JSON object/array
    - `exampleAnswer`
  - `questionMaps[]` with:
    - `speakingQuestionId`
    - `relevanceScore`
    - `isPrimary`
    - `aiReason`
- Validation rules:
  - duplicate linked question ids are rejected
  - more than one `isPrimary: true` question link is rejected
  - invalid JSON in `variablesJson` is rejected
- Saves parent + nested records transactionally and returns the refreshed `SpeakingIdeaRecord`.

### Speaking Idea Map status action

- `setSpeakingIdeaStatusAction` accepts:
  - `ideaId`
  - `status` one of `DRAFT`, `ACTIVE`, `ARCHIVED`
- Returns the updated `SpeakingIdeaRecord`.

### Speaking Idea Map source action

- `saveSpeakingIdeaMindMapAction` is admin-only and persists the study-map source layer for one idea.
- Accepts:
  - `ideaId`
  - `sourceType` one of `MERMAID`, `PLANTUML`
  - `sourceText`
  - `renderedTitle` optional
- Validation rules:
  - `sourceText` is required
  - Mermaid source must start with `mindmap`
  - PlantUML source must start with `@startmindmap`
- This action does not change the core idea reasoning records (`variants`, `supports`, `patterns`, `questionMaps`); it only updates the editable study-map source and title.
- There is no public REST route for this in the current phase; the admin editor uses a server action so the source stays inside the authenticated admin workflow.

### `POST /api/admin/ideas/plantuml/render`

- Admin-only. Requires `ADMIN` role and an `APPROVED` session.
- Accepts JSON:
  - `sourceText`
- Validation rules:
  - `sourceText` is required
  - must start with `@startmindmap`
  - maximum length `30000`
- Uses `PLANTUML_SERVER_URL` when configured to render a private PlantUML SVG preview.
- If `PLANTUML_SERVER_URL` is missing, the route returns a friendly configuration error and the editor still supports save/copy/download `.puml`.

### `POST /api/admin/ideas/generate`

- Admin-only. Requires `ADMIN` role and an `APPROVED` session.
- Accepts JSON:
  - `topic` optional topic hint
  - `count` optional integer `1..30`, default `10`
  - `targetBand` optional number `4..9`, default `6.5`
  - `includeExistingContext` optional boolean, default `true`
- Uses the server-side AI client and a dedicated reusable-idea prompt builder.
- Loads existing speaking ideas to avoid duplicates by normalized:
  - `title`
  - `shortLabel`
- Generated ideas are always saved as `DRAFT`, never `ACTIVE`.
- The generator does not create question mappings automatically in this phase.
- Returns:
  - `summary.batchId`
  - `summary.created`
  - `summary.skippedDuplicates`
  - `summary.parseErrors`
  - `summary.warnings`
  - `summary.ideas`

### `POST /api/admin/ideas/generate-answer`

- Admin-only. Requires `ADMIN` role and an `APPROVED` session.
- Accepts JSON:
  - `questionId`
  - `ideaId`
  - `targetBand` optional number `4..9`
  - `length` optional one of `SHORT`, `MEDIUM`, `LONG` (default `MEDIUM`)
- Loads:
  - the IELTS Speaking question context (`part`, `topic`, `subTopic`, `prompt`, cue-card bullets)
  - the selected reusable speaking idea (`title`, descriptions, variants, support points, patterns)
  - the optional existing idea-question mapping reason
  - a bounded shortlist of relevant Chunk Library items from question mappings, same-topic chunks, and general high-value chunks
- Uses a dedicated server-side prompt builder so the AI writes from the reusable idea rather than writing a generic answer.
- Returns:
  - `answer.questionId`
  - `answer.ideaId`
  - `answer.targetBand`
  - `answer.length`
  - `answer.answerMarkdown`
  - `answer.generatedAt`
  - `selectedChunkCount`
  - `usedChunks`
- Current phase is intentionally `generate-only`: answers are not persisted yet, so admin reviews/copies/regenerates them from the UI.

### `POST /api/admin/ideas/map-question`

- Admin-only. Requires `ADMIN` role and an `APPROVED` session.
- Accepts JSON:
  - `ideaId`
  - `questionId`
  - `relevanceScore` integer `1..5`
  - `isPrimary` boolean
  - `aiReason` optional string
- Validates that both the speaking idea and the IELTS question exist.
- Rejects duplicate links for the same `(ideaId, questionId)` pair.
- If `isPrimary` is `true`, demotes any other existing primary mapping on the same question.
- Returns the created mapping with both the compact `idea` summary and compact `speakingQuestion` summary.

### `PATCH /api/admin/ideas/question-map/:id`

- Admin-only. Requires `ADMIN` role and an `APPROVED` session.
- Accepts partial JSON:
  - `relevanceScore` optional integer `1..5`
  - `isPrimary` optional boolean
  - `aiReason` optional string or `null`
- Rejects missing mapping ids with `404 NOT_FOUND`.
- If `isPrimary` is set to `true`, keeps at most one primary mapping for the linked question by demoting the others.
- Returns the updated mapping with compact `idea` and `speakingQuestion` summaries.

### `DELETE /api/admin/ideas/question-map/:id`

- Admin-only. Requires `ADMIN` role and an `APPROVED` session.
- Deletes one idea-question link by id.
- Rejects missing ids with `404 NOT_FOUND`.
- Returns `{ success: true }` on success.

### `POST /api/admin/ideas/suggest-question-mapping`

- Admin-only. Requires `ADMIN` role and an `APPROVED` session.
- Accepts JSON:
  - `mode` one of `QUESTION_TO_IDEAS` or `IDEA_TO_QUESTIONS`
  - `questionId` required in `QUESTION_TO_IDEAS` mode
  - `ideaId` required in `IDEA_TO_QUESTIONS` mode
  - `limit` optional integer `1..12`
- Uses a dedicated server-side prompt builder for reusable idea/question matching.
- Never saves suggestions automatically.
- Excludes already-linked records before calling AI so admins only review net-new candidates.
- Filters the AI response back against the loaded candidate pool and keeps at most one `isPrimary: true` suggestion in the returned list.
- Returns `{ suggestions }`, where each suggestion includes:
  - `targetId`
  - `relevanceScore`
  - `isPrimary`
  - `aiReason`

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

### `POST /api/admin/questions/generate`

- Admin-only. Requires `ADMIN` role.
- Accepts JSON:
  - `part` optional one of `PART_1`, `PART_2`, `PART_3`, `MIXED` (default `MIXED`)
  - `topic` optional topic hint
  - `count` optional integer between `1` and `60` (default `20`)
  - `targetBand` optional band 4-9
  - `includeRecommendedChunks` optional boolean (default `true`)
- Loads up to 80 existing prompts and (if `includeRecommendedChunks`) up to 60 chunk library lines for context.
- Calls the AI client with a strict-JSON prompt that asks for ORIGINAL practice questions inspired by common IELTS Speaking topics. The prompt explicitly forbids claiming the output will appear on a real exam and forbids Writing Task 1/2.
- Persists surviving questions as `status: "SUGGESTED"`, `source: "AI_GENERATED"`, with `aiReason`, `popularityScore`, `predictedUsefulnessScore`, and a shared `generatedBatchId`.
- Maps recommended chunks against the existing Chunk Library by normalized text. Chunks that do not match are surfaced in `warnings` and not auto-created.
- Skips duplicates by `(skill, taskType, normalizedPrompt)` against both the existing bank and the same batch.
- Returns `{ summary: { batchId, created, skippedDuplicates, parseErrors, warnings, questions } }`.
- The route logs only metadata: actor id, part, count, topic, include-chunks flag, created/skipped/warnings counters.

### `POST /api/admin/questions/status`

- Admin-only.
- Accepts JSON:
  - `questionId`
  - `status` one of `SUGGESTED`, `APPROVED`, `ARCHIVED`
- Returns the updated `IeltsQuestionRecord`.

### `POST /api/admin/questions/bulk-status`

- Admin-only.
- Accepts JSON:
  - `questionIds` array (1 to 200 ids)
  - `status` one of `SUGGESTED`, `APPROVED`, `ARCHIVED`
- All ids must exist; returns `404 NOT_FOUND` otherwise.
- Returns the updated list of `IeltsQuestionRecord`.

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
- Translation API: `POST /api/translation-recall/compare`
- Translation API: `POST /api/translation-recall/from-question`
- Translation API: `POST /api/translation-recall/scripts`
- Translation API: `PATCH /api/translation-recall/scripts/[id]`
- Translation API: `DELETE /api/translation-recall/scripts/[id]`

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

### `POST /api/translation-recall/compare`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `scriptId`
  - `sentenceId` — required when `mode` is `SENTENCE`
  - `mode` one of `SENTENCE` or `PASSAGE`
  - `userAnswer` (2-4000 chars)
- Builds a Markdown-only prompt asking the AI to grade the learner's English translation. The prompt emphasizes accepting natural paraphrases over literal word-for-word matching, and explains in Vietnamese.
- AI response Markdown sections (in this exact order):
  - `# Score` — integer 0-100
  - `# Overall Feedback` — Vietnamese summary
  - `# Meaning Accuracy`
  - `# Grammar & Naturalness`
  - `# Missing Chunks` — bullet list of `**chunk text** = nghĩa tiếng Việt`
  - `# Better Version`
  - `# Original Answer`
- Persists a `TranslationRecallAttempt` row (per user) with the parsed score and the raw Markdown.
- Returns:
  - `attempt` — the `TranslationRecallAttemptRecord`
  - `originalEnglish` — the sentence or full passage
  - `missingChunks[]` — parsed from the `# Missing Chunks` section, ready to feed the existing chunk-save modal
- AI failures return `503 AI_TUTOR_UNAVAILABLE`; the reader UI keeps the answer text visible so the learner can retry.
- The route logs metadata only: `userId`, `scriptId`, `sentenceId`, `mode`, `score`, `missingChunkCount`. It never logs the AI token or the full feedback body.

### `POST /api/translation-recall/scripts`

- Admin-only. Requires `ADMIN` role (matches the existing Translation Recall CSV import policy).
- Accepts JSON:
  - `title` (2-191 chars)
  - `topic` (2-120 chars)
  - `bandLevel` (4-9, default 6)
  - `notes` optional (max 2000)
  - `sentences[]` — each `{ english, vietnamese }`, 1-200 pairs
- Validates that the `(title, topic)` fingerprint is unique. Returns `409 TRANSLATION_SCRIPT_DUPLICATE` if the same pair already exists (use PATCH on the existing script instead).
- Saves the script as `sourceType: "MANUAL"`, `generatedByAi: false`, with the supplied `sentences` rows.
- Returns the full `TranslationScriptRecord`.

### `PATCH /api/translation-recall/scripts/[id]`

- Admin-only.
- Accepts the same JSON shape as `POST`.
- Updates the script metadata, deletes existing sentence rows, and re-inserts the supplied `sentences[]`. This matches the existing CSV re-import behavior.
- If `(title, topic)` changes, the fingerprint is recomputed; a collision with a different script returns `409 TRANSLATION_SCRIPT_DUPLICATE`.
- Returns the refreshed `TranslationScriptRecord`.

### `DELETE /api/translation-recall/scripts/[id]`

- Admin-only.
- Deletes the script. Sentences, chunk mappings, and review rows cascade via Prisma `onDelete: Cascade`.
- Returns `{ ok: true, scriptId }`.

## Family English

- Learner route: `GET /family`
- Learner route: `GET /family/profile`
- Learner route: `GET /family/scenarios`
- Learner route: `GET /family/conversations`
- Learner route: `GET /family/chunks`
- Learner route: `GET /family/practice`
- Family AI API: `POST /api/family/conversations/generate`
- Family AI API: `POST /api/family/conversations/[id]/create-recall`
- Family AI API: `POST /api/family/conversations/[id]/recall/compare`
- Family AI API: `POST /api/family/chunks/extract`
- Family AI API: `POST /api/family/scenarios/generate`
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

### `POST /api/family/scenarios/generate`

- Requires an authenticated and `APPROVED` user.
- Accepts JSON:
  - `count` optional integer between `1` and `30` (default `10`)
  - `childFocus` optional one of `KIWI`, `VIVI`, `BOTH`, `GENERAL`
  - `category` optional category hint
  - `includeExistingContext` optional boolean (default `true`)
- Requires an active `FamilyProfile`; returns `404 NOT_FOUND` otherwise.
- Calls the AI client with a strict-JSON prompt asking for realistic, non-academic family scenarios with `title`, `category`, `childFocus`, `description`, `difficulty`, `suggestedGoals[]`, `suggestedChunks[]`, and Vietnamese `aiReason`.
- Skips duplicates by `(userId, normalizedTitle)` against existing scenarios and inside the same batch.
- Persists surviving scenarios as `status: "SUGGESTED"`, `source: "AI"`, `isActive: false`.
- Returns `{ summary: { created, skippedDuplicates, scenarios, warnings } }`.
- The route logs metadata only — never the AI token or full prompt/answer body.

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

### `POST /api/family/conversations/[id]/create-recall`

- Requires an authenticated and `APPROVED` user.
- Path param `id` is the `FamilyConversation` id.
- Accepts JSON:
  - `regenerate` optional boolean (default `false`)
- Loads the owned `FamilyConversation` on the server; non-owners receive `403 FORBIDDEN` (or `404 NOT_FOUND` when the conversation does not exist).
- If recall lines already exist and `regenerate` is `false`, returns the existing script without calling AI.
- Otherwise asks AI to parse the conversation Markdown into a strict-JSON list of lines:
  - `speaker`, `englishText`, `vietnameseText`, `usedChunks[]`
  - 4–30 lines, narration skipped, speaker labels preserved.
- Replaces lines transactionally (`deleteMany` then `createMany`) — never appends.
- Returns:
  - `script.conversationId`
  - `script.lines[]` with per-line `attemptCount`
- AI failure returns `code: "AI_TUTOR_UNAVAILABLE"` with status `503`; no DB write happens on failure.
- Scoping: lines belong to the conversation owner only — they are never exposed to other users.
- The route logs metadata only — never the AI token, never the full family profile, never line text.

### `POST /api/family/conversations/[id]/recall/compare`

- Requires an authenticated and `APPROVED` user.
- Path param `id` is the `FamilyConversation` id.
- Accepts JSON:
  - `lineId` — must belong to the conversation
  - `userAnswer` — 2–4000 characters
- Verifies both:
  - the conversation belongs to the current user
  - the `lineId` belongs to that conversation
- Calls AI with a strict-Markdown prompt asking for these sections (Vietnamese explanations, accept paraphrases, penalize textbook English):
  - `# Score`
  - `# Feedback`
  - `# Meaning Accuracy`
  - `# Natural Family English`
  - `# Better Version`
  - `# Useful Chunks`
  - `# Original English`
- Persists a `FamilyConversationRecallAttempt` row with parsed `score` (nullable when AI omits the heading) and the full `feedbackMarkdown`.
- Returns:
  - `attempt` — the persisted attempt
  - `originalEnglish` — for client reveal
  - `missingChunks[]` — parsed from `# Useful Chunks` for one-click save into the Family Chunk Library
- AI failure returns `code: "AI_TUTOR_UNAVAILABLE"` with status `503` and does not block the reveal/practice flow on the client.
- Distinct from IELTS Translation Recall:
  - Family attempts never touch `TranslationRecallAttempt`.
  - Saved chunks go to `FamilyChunk` (status `SUGGESTED`) — never to the IELTS chunk library.
- The route logs metadata only — never the AI token, never the full family profile, never the raw user answer or AI body.

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
