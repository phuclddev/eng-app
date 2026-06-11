# Family English Companion

## Purpose

`Family English Companion` is a separate module for daily English communication practice inside Phuc's family life. It is intentionally isolated from IELTS training, IELTS question-bank content, and IELTS practice/review metrics.

## Current scope

Phase 1 + Phase 2 are implemented:

- separate navigation group under `Family English`
- scaffolded routes:
  - `/family`
  - `/family/profile`
  - `/family/scenarios`
  - `/family/conversations`
  - `/family/chunks`
  - `/family/practice`
- separate family services under `src/server/family`
- separate family prompt builders:
  - `family-conversation`
  - `family-chunk-extraction`
  - `family-roleplay`
- private `FamilyProfile` storage and editing

Phase 3 + Phase 4 are also implemented:

- `FamilyScenario` persistence
- default family scenarios for the bootstrap owner
- `/family/scenarios` CRUD UI with archive/reactivate support
- `FamilyConversation` persistence
- `POST /api/family/conversations/generate`
- `/family/conversations` generation, list, filter, copy, and delete UI

Phase 5 is now implemented:

- `FamilyChunk` persistence with separate family-only storage
- `POST /api/family/chunks/extract`
- `/family/chunks` suggested, approved, archived review queue
- manual family chunk creation and editing
- per-user duplicate prevention by normalized chunk text
- extraction summaries linked from family conversation detail

Phase 6 is now implemented:

- separate `FamilyPracticeSession`, `FamilyPracticeAnswer`, and `FamilyReviewSchedule` models
- five family practice exercise types:
  - `VI_TO_CHUNK`
  - `FILL_IN_DIALOG`
  - `NATURAL_RESPONSE`
  - `CONTINUE_CONVERSATION`
  - `FAMILY_CHUNK_RECALL`
- approved-only family chunk selection with deterministic priority queue
- separate family spaced repetition scheduler (1/3/7/14/30 day intervals)
- `POST /api/family/practice/start`
- `POST /api/family/practice/submit`
- `POST /api/family/practice/ai-feedback`
- `/family/practice` mobile-first deck runner with sticky action button
- family dashboard card with chunks learned, due reviews, weekly accuracy, family streak, top scenarios, top speaker roles, and recent activity

Phase 8 is now implemented:

- separate `FamilyFavorite` and `FamilyDailyPlanSnapshot` models
- deterministic family recommendation engine (`buildFamilyRecommendations`)
- cached AI daily plan (`POST /api/family/today/plan`) with `FamilyDailyPlanSnapshot` per child-focus hash
- weekly insights snapshot + AI summary (`POST /api/family/insights/summary`)
- favorites for conversations, chunks, scenarios, and roleplay sessions (`GET/POST/DELETE /api/family/favorites`)
- `/family/today` daily coach landing page
- `/family/insights` weekly insights page
- `/family/favorites` favorites listing
- child-focus selector (`KIWI`, `VIVI`, `BOTH`) drives the recommendation engine
- favorite heart toggles on Today's Plan action cards

Phase 7 is now implemented:

- separate `FamilyRoleplaySession` and `FamilyRoleplayMessage` models
- five roleplay roles: `FATHER`, `MOTHER`, `KIWI`, `VIVI`, `GRANDPARENT`
- per-session ownership-checked AI roleplay using an internal `externalConversationId`
- separate roleplay prompt builders for start, turn, and finish phases
- `POST /api/family/roleplay/start`
- `POST /api/family/roleplay/message`
- `POST /api/family/roleplay/finish`
- `POST /api/family/roleplay/archive`
- `GET /api/family/roleplay/sessions`
- `GET /api/family/roleplay/sessions/[id]`
- `/family/roleplay` mobile-first chat UI with start form, transcript, finish button, and session history with archive
- final feedback as Markdown with five fixed sections rendered through the safe AI Markdown component
- optional roleplay-as-source link on `FamilyChunk` for future chunk extraction (Phase 7F follow-up)

## Module boundaries

- Do not reuse IELTS Question Bank tables for family scenarios.
- Do not mix `FamilyProfile` data into IELTS chunk selection or IELTS dashboard metrics.
- Do not store family chunks in the IELTS chunk library by default.
- Future family practice and roleplay history must stay in family-specific models or clearly isolated storage.

## Data model

### `FamilyProfile`

- `id`
- `userId`
- `title`
- `profileMarkdown`
- `isActive`
- `createdAt`
- `updatedAt`

Each user has at most one active family profile in the current phase.

### `FamilyScenario`

- `id`
- `userId`
- `title`
- `category`
- `childFocus`
- `description`
- `difficulty`
- `isActive`
- `createdAt`
- `updatedAt`

### `FamilyConversation`

- `id`
- `userId`
- `scenarioId`
- `childFocus`
- `title`
- `conversationMarkdown`
- `aiConversationId`
- `createdAt`
- `updatedAt`

### `FamilyChunk`

- `id`
- `userId`
- `text`
- `meaningVi`
- `usageContext`
- `speakerRole`
- `childFocus`
- `scenarioCategory`
- `difficulty`
- `frequencyScore`
- `personalizationScore`
- `exampleSentence`
- `notes`
- `sourceConversationId`
- `status`
- `createdAt`
- `updatedAt`

Family chunks are stored separately from IELTS chunks and are never mixed into the IELTS chunk library automatically.

## Seed and personalization behavior

- The bootstrap owner `dinhphuc.luu@garena.vn` receives a seeded profile based on the Phuc family source context.
- Other approved users receive a generic editable family-profile template.
- The seeded profile is used only for the matching owner account and is not exposed to other users by default.

## Profile editing

Route: `/family/profile`

Current behavior:

- loads or creates the signed-in user's family profile
- allows editing markdown content
- saves through a server action
- shows a warning that the profile is used for AI personalization

## Scenario management

Route: `/family/scenarios`

Current behavior:

- bootstrap owner receives default scenarios based on the Phuc family source profile
- other users can create their own scenarios manually
- AI-generated scenarios land in the Suggested tab for review
- scenarios can be created, edited, approved, archived, restored, and bulk-managed
- scenario listing supports search plus `category`, `childFocus`, `source`, and `status` filters
- users can only manage their own scenarios

### Scenario status lifecycle

`FamilyScenario.status` follows three states:

- `SUGGESTED` — AI-generated or user-imported drafts awaiting review. `isActive` stays `false` so they are not picked up by conversation generation.
- `APPROVED` — approved by the user. `isActive` becomes `true` automatically. These are the only scenarios offered to Family Conversation generation and Family Roleplay.
- `ARCHIVED` — hidden but not deleted. `isActive` is set to `false`. Restoring flips both back to `APPROVED`.

Backwards compatibility: pre-existing scenarios from before this phase were backfilled to `APPROVED` if `isActive = true` and `ARCHIVED` if `isActive = false`. The legacy `setFamilyScenarioActiveState` server action still works and now updates both `isActive` and `status` together.

### AI scenario generation

`POST /api/family/scenarios/generate` accepts:

- `count` (1–30, default 10)
- `childFocus` optional (`KIWI`, `VIVI`, `BOTH`, `GENERAL`)
- `category` optional
- `includeExistingContext` optional boolean, default `true`

Flow:

1. Load the user's active `FamilyProfile` (must exist).
2. Optionally load up to 60 existing scenario titles + categories so AI can avoid duplicates.
3. Build a Vietnamese-aware prompt (`family-scenario-generator.ts`) with theme palette + forbidden patterns.
4. Call the shared server-side AI client and parse strict JSON.
5. Skip duplicates by normalized title (same user + same `normalizedTitle`).
6. Persist surviving scenarios as `status: "SUGGESTED"`, `source: "AI"`, `isActive: false`, with `aiReason`, `suggestedGoals[]`, and `suggestedChunks[]` saved as columns.
7. Return `{ created, skippedDuplicates, scenarios, warnings }`.

### Duplicate handling

- `normalizedTitle` strips whitespace, lowercases, and NFKC-normalizes the title.
- Insert-side: the `(userId, normalizedTitle)` unique index blocks even race-condition duplicates.
- Generation-side: the service deduplicates inside the same AI batch and against existing scenarios for the same user.

## Conversation generation

Route: `/family/conversations`

API:

- `POST /api/family/conversations/generate`

Request:

- `scenarioId`
- `childFocus`
- `conversationLength`
- `targetLevel`
- `vietnameseSupport`

Flow:

1. Require authenticated and approved user.
2. Load that user's active `FamilyProfile`.
3. Load that user's active `FamilyScenario`.
4. Build a family-specific AI prompt with compact profile context.
5. Call the existing server-side AI chatflow client.
6. Save the generated markdown as `FamilyConversation`.

Output format requested from AI:

- `# Situation`
- `# Conversation`
- `# Useful Chunks`
- `# Notes for Phuc`
- `# Mini Practice`

The generated markdown is rendered through the shared safe AI Markdown component, without raw HTML.

## Family chunk extraction

Route: `/family/chunks`

API:

- `POST /api/family/chunks/extract`

Request:

- `conversationId`

Flow:

1. Require authenticated and approved user.
2. Load that user's own `FamilyConversation`.
3. Load compact `FamilyProfile` context when available.
4. Build a family-specific chunk-extraction prompt.
5. Call the existing server-side AI chatflow client.
6. Require structured JSON from AI.
7. Validate all extracted chunks before writing any data.
8. Skip duplicates by normalized chunk text for the same user.
9. Save new rows as `SUGGESTED`.

Current UI behavior:

- conversation detail includes `Extract Chunks`
- extraction success shows:
  - created count
  - skipped duplicate count
  - link to `/family/chunks?status=SUGGESTED`
- `/family/chunks` supports:
  - status tabs: `SUGGESTED`, `APPROVED`, `ARCHIVED`
  - search
  - child-focus filter
  - speaker-role filter
  - scenario-category filter
  - edit
  - approve
  - archive
  - bulk approve/archive
  - manual add

## Family chunk lifecycle

- New AI-extracted chunks start as `SUGGESTED`.
- Only `APPROVED` chunks are intended for future Family Practice.
- `ARCHIVED` chunks stay private and separate, and are not deleted automatically.
- Duplicate extraction does not create new rows if the same normalized text already exists for that user.
- If a duplicate already exists in `ARCHIVED`, extraction still skips it and leaves it archived until the user restores it manually.

## Privacy rules

- family profile markdown is private user data
- family scenarios and family conversations are also private user data
- do not log full profile content
- do not expose children details unnecessarily in logs
- do not expose AI tokens to the browser
- do not log generated conversation bodies unless debugging is explicitly required
- family scenario, conversation, and chunk access must remain ownership-checked
- do not log full extracted chunk payloads unless debugging is explicitly required

## AI prompt behavior

The family prompt builders are separate from IELTS prompt builders and already enforce these direction cues:

- realistic family-life tone
- warm, imperfect parent-child interaction
- age-appropriate child language
- avoid academic or IELTS-style phrasing
- preserve Kiwi and Vivi personality differences
- use Markdown bold for useful chunks
- keep Vietnamese coaching concise when enabled

For extraction prompts:

- request reusable daily-life chunks only
- reject IELTS-style or academic phrases
- prefer parenting, emotional coaching, routine, correction, encouragement, and conflict-resolution expressions
- return JSON only so the server can validate before saving
- do not create partial data if the AI output is invalid

## Family Practice

Route: `/family/practice`

API:

- `POST /api/family/practice/start`
- `POST /api/family/practice/submit`
- `POST /api/family/practice/ai-feedback`

Flow:

1. Require authenticated and approved user.
2. Load that user's `APPROVED` `FamilyChunk` records plus their `FamilyReviewSchedule` rows.
3. Score each chunk by:
   - due review (highest weight)
   - personalization score
   - frequency score
   - weak mastery boost
   - new-but-approved boost
4. Build a deterministic deck of up to 8 exercises per session.
5. The runner evaluates each answer locally, then `POST /api/family/practice/submit` saves the session, answers, and an updated `FamilyReviewSchedule` per chunk.
6. `CONTINUE_CONVERSATION` exercises expose an optional `Ask AI` button. The AI returns Markdown sections:
   - `# Improved Reply`
   - `# Natural Explanation`
   - `# 2-3 Better Family Chunks`
   - `# Vietnamese Explanation`
7. AI failure does not block practice or session submission.

## Family Review

- `FamilyReviewSchedule` is stored per user and per family chunk.
- Intervals follow `1`, `3`, `7`, `14`, and `30` day steps.
- Updates use the same correctness, confidence, and response-time signals as IELTS review, but in a separate scheduler that never touches IELTS `ReviewSchedule`.
- Mastery moves toward `100` for confident correct answers and rolls back on incorrect answers.

## Family Dashboard

Family Practice metrics are surfaced on `/family`:

- chunks learned (family review schedule entries with mastery `>= 60`)
- due family reviews
- weekly accuracy across `FamilyPracticeAnswer`
- family streak from completed family practice sessions
- top scenario categories from family practice attempts
- top speaker roles from family practice attempts
- recent completed family practice sessions

These metrics do not mix with IELTS dashboard data.

## Family Roleplay

Route: `/family/roleplay`

API:

- `POST /api/family/roleplay/start`
- `POST /api/family/roleplay/message`
- `POST /api/family/roleplay/finish`
- `POST /api/family/roleplay/archive`
- `GET /api/family/roleplay/sessions`
- `GET /api/family/roleplay/sessions/[id]`

Flow:

1. Require authenticated and approved user.
2. Validate the start payload, including the rule that `userRole !== aiRole`.
3. If a `scenarioId` is provided, verify it belongs to the current user.
4. Load the active `FamilyProfile` to build a compact family context.
5. Call AI with the roleplay start prompt, save the first AI message, and store the upstream `conversation_id` as `externalConversationId` on `FamilyRoleplaySession`.
6. Every subsequent message reuses the stored `externalConversationId` (never a browser-provided value) so the AI keeps the same thread context.
7. `finish` requests a Markdown coach review with five fixed sections and marks the session `COMPLETED`.
8. `archive` flips status to `ARCHIVED`; archived sessions are read-only.

### AI behavior

- The AI plays the chosen `aiRole` only — never breaks character.
- Children speak as almost-6-year-olds, not adults.
- The AI sends one short message per turn, plain text only.
- IELTS-style or academic phrasing is rejected by prompt instructions.
- If the user sends rude or off-topic content, the AI redirects gently in character.

### Final feedback sections

The Markdown coach response always uses these five sections:

- `# Overall Feedback`
- `# Better Phrases You Could Use`
- `# Useful Family Chunks`
- `# What You Did Well`
- `# Next Practice Suggestion`

The coach mixes concise Vietnamese explanations with English example phrases and bolds useful family chunks.

### Known limitations

- Chunk extraction from a finished roleplay is not yet implemented; the database supports it via `FamilyChunk.sourceRoleplaySessionId`, and the UI placeholder for "Extract Chunks from Roleplay" is deferred to a follow-up.
- Roleplay sessions are capped between `3` and `12` turns per session.
- AI failures during a turn return a 503 to the runner; the session stays `ACTIVE` so the user can retry without losing progress.
- AI failures during `finish` still complete the session, but the saved feedback is a placeholder note instead of a coach review.

## Family Daily Coach

Route: `/family/today`

API:

- `POST /api/family/today/plan`
- `POST /api/family/insights/summary`
- `GET /api/family/favorites`
- `POST /api/family/favorites`
- `DELETE /api/family/favorites`

Flow:

1. Require authenticated and approved user.
2. Build deterministic recommendations from the user's own data:
   - `APPROVED` family chunks + `FamilyReviewSchedule`
   - active `FamilyScenario` rows (filtered by `childFocus`)
   - recent `FamilyConversation` and `FamilyRoleplaySession` rows (last 7 days)
3. Score each chunk by:
   - due review (highest weight)
   - personalization score
   - frequency score
   - weak mastery boost
   - new-but-approved boost
4. Pick the top recommended scenario, conversation, roleplay, and 8 chunks.
5. Optionally call AI to generate a Markdown daily plan with these sections:
   - `# Today's Focus`
   - `# Recommended Scenario`
   - `# Recommended Chunks`
   - `# Recommended Conversation`
   - `# Recommended Roleplay`
   - `# Parenting English Tip`
6. Cache the AI plan in `FamilyDailyPlanSnapshot` per `(userId, childFocus, sourceHash)` with a 12-hour TTL.
7. `/family/today` renders the AI plan, a child-focus selector, and the five action cards. Each card supports favoriting via the heart icon.

### Recommendation algorithm

```
score = 0
if review && nextReviewAt <= now: score += 120
if review && masteryScore < 40:   score += 30
if review && masteryScore < 65:   score += 12
if review && masteryScore >= 90:  score -= 30
if !review:                       score += 14
score += personalizationScore * 9
score += frequencyScore * 4
```

Scenario selection prefers scenarios that match `childFocus` and have no `FamilyConversation` in the last 7 days. Roleplay defaults to `userRole = FATHER` and toggles `aiRole` between `KIWI` and `VIVI` for `BOTH` focus.

### Daily plan caching

- `FamilyDailyPlanSnapshot.sourceHash` is a SHA-1 hash over `{ date, childFocus, dueCount, weakCount, chunkIds, scenarioId, conversationId, roleplay }`.
- A snapshot is reused when its `expiresAt` is in the future and its source hash matches.
- `forceRefresh = true` skips the cache and regenerates.

### Child-specific mode

- `BOTH` returns the broadest deck and alternates roleplay AI roles.
- `KIWI` restricts chunks and scenarios to `KIWI` or `BOTH`/`GENERAL`, defaults the roleplay AI to Kiwi.
- `VIVI` restricts chunks and scenarios to `VIVI` or `BOTH`/`GENERAL`, defaults the roleplay AI to Vivi.

## Weekly Insights

Route: `/family/insights`

- Live snapshot computed from the last 7 days:
  - total family practice answers
  - weekly accuracy
  - weekly streak (consecutive days with at least one completed `FamilyPracticeSession`)
  - conversations generated this week
  - roleplay sessions started this week
  - top 5 most practiced chunks
  - top 5 weakest chunks (mastery < 50)
  - top 5 strongest chunks (mastery >= 70)
  - top 5 scenario categories attempted
- Optional AI summary returns Markdown with these sections:
  - `# Weekly Summary`
  - `# What Phuc Did Well`
  - `# What To Focus On Next Week`
  - `# Suggested Roleplay Themes`
  - `# Family English Tip`

## Favorites

Route: `/family/favorites`

- A single `FamilyFavorite` table supports four target types:
  - `CONVERSATION`
  - `CHUNK`
  - `SCENARIO`
  - `ROLEPLAY`
- Saving a favorite verifies the target belongs to the current user.
- Favorites are unique per `(userId, targetType, targetId)`.
- Favorite heart toggles are available on the Today's Plan action cards. The Favorites page allows browsing by target type and removing entries.

## Future-ready extension points

Phase 8 intentionally leaves room for voice features without breaking the current MVP:

- `FamilyRoleplayMessage.content` is plain text today; a future voice mode can add a separate `audioUrl` column without changing existing reads.
- `FamilyPracticeAnswer.responseTimeMs` already tracks per-answer timing — speech recognition latency or speaking-time scoring can be layered on without schema changes.
- The AI prompt builders are isolated under `src/server/ai/prompts/family-*`; a future TTS path can add a `family-tts.ts` prompt and a `FamilyTtsCache` model without touching practice or review services.
- The recommendation engine returns `FamilyTodayRecommendations` independent of any UI; future voice-based daily coach surfaces can reuse it directly.
- Voice and pronunciation features are deferred — the MVP intentionally does not implement them.

## Planned next phases

- chunk extraction from finished roleplay sessions
- voice recording, speech recognition, pronunciation scoring, TTS playback, AI voice roleplay (deferred)
