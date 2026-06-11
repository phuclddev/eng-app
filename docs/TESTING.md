# Testing

## Automated checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Use Node `22+` for local test execution. In this environment, `pnpm test` on the default older Node runtime fails before app tests run because Vitest's toolchain expects newer Node APIs.

## Mobile verification checklist

- Verify `375x667`
- Verify `390x844`
- Verify `430x932`
- Confirm `/` redirects straight into `/signin?...&auto=true`
- Confirm the mobile workspace uses header + drawer navigation instead of a persistent sidebar
- Confirm dashboard, practice, review, and chunks do not introduce page-level horizontal scroll
- Confirm practice answer input and primary action remain easy to use near the bottom of the viewport
- Confirm chunk library switches to a readable stacked layout on mobile
- Confirm admin tables either scroll safely or fall back to compact cards on mobile
- Confirm browser console does not log client-side warnings or errors during the checked path

## Playwright smoke coverage

- `tests/e2e/smoke.spec.ts`
  - root/auth redirect
- `tests/e2e/mobile-smoke.spec.ts`
  - dashboard mobile shell
  - practice mobile rendering
  - review mobile rendering
  - chunks mobile rendering

## AI Tutor coverage focus

- `src/tests/ai-chatflow-client.test.ts`
  - upstream response parsing
  - timeout and error handling
- `src/tests/ai-advanced-prompts.test.ts`
  - chunk coach prompt builder
  - missing chunks prompt builder
  - speaking simulator prompt builder
  - study coach prompt builder
- `src/tests/chunk-coach-route.test.ts`
  - auth and approved-user enforcement
  - structured response behavior
- `src/tests/missing-chunks-route.test.ts`
  - input validation
  - auth and approved-user enforcement
- `src/tests/speaking-simulator-route.test.ts`
  - start/message route validation
  - ownership protection
- `src/tests/speaking-simulator-service.test.ts`
  - session creation
  - cross-user access rejection
- `src/tests/study-coach-route.test.ts`
  - approved-user enforcement
  - friendly failure handling
- `src/tests/ai-tutor-helpers.test.ts`
  - structured section parsing
  - fallback behavior
  - missing-chunk helper summaries

## Family English coverage focus

- `src/tests/family-profile-service.test.ts`
  - bootstrap-owner profile seeding
  - generic-template fallback
  - family profile upsert idempotency
- `src/tests/family-prompts.test.ts`
  - family-specific prompt builders
  - non-IELTS prompt tone
- `src/tests/family-scenario-service.test.ts`
  - scenario validation
  - bootstrap default seeding
  - scenario ownership protection
- `src/tests/family-conversation-service.test.ts`
  - missing active profile handling
  - AI failure fallback
  - conversation save behavior
- `src/tests/family-conversation-route.test.ts`
  - approved-user enforcement
  - input validation
  - missing-profile error propagation
- `src/tests/family-chunk-service.test.ts`
  - chunk edit validation
  - extraction duplicate skipping
  - invalid AI output fallback
  - approve/archive transitions
  - bulk status updates
- `src/tests/family-chunk-extract-route.test.ts`
  - approved-user enforcement
  - input validation
  - conversation ownership protection
- `src/tests/middleware.test.ts`
  - `/family` and `/family/profile` auth redirects
  - approved-user access to family routes
- `src/tests/family-spaced-repetition.test.ts`
  - family interval reset on incorrect answers
  - confident-correct extension
  - supported family intervals
- `src/tests/family-practice.test.ts`
  - stage routing per mastery score
  - priority queue for due, personal, weak, and fresh chunks
  - deterministic deck generation
  - answer evaluation for recall, recognition, and production exercises
  - summary aggregation
- `src/tests/family-practice-service.test.ts`
  - approved-only chunk selection
  - deck generation with review snapshots
  - ownership protection on session submit
  - rejection of non-approved chunks on submit
  - session, answer, and family review schedule writes
- `src/tests/family-practice-submit-route.test.ts`
  - approved-user enforcement
  - payload validation
  - session id and summary on success
- `src/tests/family-practice-ai-feedback-route.test.ts`
  - approved-user enforcement
  - payload validation
  - graceful AI failure handling
- `src/tests/family-practice-ai-feedback-service.test.ts`
  - ownership protection
  - approved-chunk requirement
  - AI failure fallback
- `src/tests/family-dashboard-service.test.ts`
  - weekly accuracy and streak math
  - top scenarios and speaker roles
  - empty-state handling
- `src/tests/family-roleplay-service.test.ts`
  - start: ownership check on scenarios, AI failure fallback, AI first-message persistence
  - message: ownership check, archived-session guard, reuse of stored externalConversationId
  - finish: completed status with feedback on AI success, fallback feedback on AI failure, rejection of empty transcripts
  - archive: ownership check, status flip
  - detail: ownership protection, mapped record return
- `src/tests/family-roleplay-route.test.ts`
  - approved-user enforcement on all routes
  - rejection of identical user and AI roles
  - ownership propagation through the route layer
  - sessions list and detail GET routes
- `src/tests/family-recommendation-service.test.ts`
  - empty-state behavior with no approved chunks
  - prioritization of due reviews above personalization
  - child focus filtering for `KIWI`
  - fresh scenario preference when a recent one exists
  - roleplay AI role alternation for `BOTH` focus
- `src/tests/family-daily-plan-service.test.ts`
  - cached snapshot reuse when the source hash matches
  - AI call + snapshot upsert on cache miss
  - `AI_TUTOR_UNAVAILABLE` fallback
  - `forceRefresh` bypass of the cache
  - AppError propagation when AI throws an AppError
- `src/tests/family-favorites-service.test.ts`
  - target-ownership rejection
  - upsert + remove behavior
  - empty listing and label joining across target types
- `src/tests/family-daily-coach-route.test.ts`
  - today plan route auth + AI failure handling
  - favorites GET/POST/DELETE auth + validation
  - insights summary route auth + success
- `src/tests/family-conversation-recall-service.test.ts`
  - score parsing (extract, clamp, missing-heading null fallback)
  - missing-chunks bullet parsing (with `(none)` sentinel)
  - `createFamilyRecallLines`: conversation ownership check, skip-when-existing, AI call + transactional persistence, malformed JSON rejection, AI unavailable mapping, regenerate path, AppError pass-through
  - `compareFamilyRecallAttempt`: conversation + line ownership check, line-not-in-conversation rejection, attempt persistence with parsed score, null-score fallback when AI omits `# Score`, AI unavailable mapping
  - `getFamilyRecallScript`: ownership protection, empty-state shape, per-line attempt count joining
- `src/tests/family-conversation-recall-routes.test.ts`
  - create-recall route: approved-user enforcement, not-found propagation, success shape with lines
  - compare route: approved-user enforcement, short-answer rejection, missing-`lineId` rejection, `AI_TUTOR_UNAVAILABLE` mapping, success returns parsed attempt + missing chunks

## Coverage focus

- spaced repetition scheduling
- practice answer evaluation
- chunk validation and CSV parsing
- smoke-level Playwright coverage for auth and protected routes

## Manual AI verification checklist

- Confirm `Explain with AI` opens from chunk library, practice, and speaking prompt recommended chunks.
- Confirm Chunk Coach renders structured sections when AI follows the requested headings.
- Confirm Missing Chunk Recommendation renders a friendly plain-text fallback if structure parsing fails.
- Confirm Speaking Simulator preserves the same local session and upstream thread across multiple turns.
- Confirm final simulator feedback appears after the configured number of turns.
- Confirm Study Coach loads from real learner progress data and can refresh without exposing secrets.
- Confirm AI route failures show friendly errors and do not block normal practice/review submission.

## Manual Family English verification checklist

- Confirm `/family` appears under its own `Family English` navigation group on desktop.
- Confirm mobile drawer navigation includes the Family English section without crowding existing IELTS links.
- Confirm unauthenticated `/family` and `/family/profile` requests redirect into `/signin?...&auto=true`.
- Confirm approved users can open `/family/profile`, edit markdown, and save without affecting IELTS pages.
- Confirm the bootstrap owner sees the seeded Phuc family profile and other users see the generic template.
- Confirm `/family/scenarios` supports create, edit, archive, and child/category filtering.
- Confirm `/family/conversations` can generate, render Markdown, copy, and delete conversations.
- Confirm `/family/conversations` can extract chunks and show the created/skipped summary without breaking the conversation detail view.
- Confirm `/family/chunks` supports manual add, edit, approve, archive, restore, bulk approve/archive, and all filters.
- Confirm duplicate extraction does not create duplicate family chunks for the same user.
- Confirm family routes stay separate from IELTS pages during the same session.

## Manual Family Practice verification checklist

- Approve at least one family chunk before starting family practice.
- Confirm `/family/practice` shows approved-chunks, due reviews, weekly accuracy, and streak stats.
- Confirm switching modes between Daily, Review, and Mixed reloads the deck without page navigation.
- Confirm the deck runner shows a single column on mobile (`375x667` / `390x844`) with no horizontal overflow.
- Confirm the action button stays reachable near the bottom of the viewport on mobile.
- Confirm the `Ask AI` button only appears for `CONTINUE_CONVERSATION` exercises after checking the answer.
- Confirm completing a session creates a `FamilyPracticeSession`, `FamilyPracticeAnswer`, and `FamilyReviewSchedule` per chunk in MySQL.
- Confirm the family dashboard card on `/family` reflects the new session.
- Confirm IELTS dashboard metrics, IELTS practice, IELTS review, and the IELTS chunk library remain unchanged.

## Manual Family Roleplay verification checklist

- Open `/family/roleplay` and start a new session with AI as Kiwi.
- Send several messages; confirm the AI stays in character and never sounds like an IELTS examiner.
- Confirm the same upstream conversation thread is reused across turns (AI remembers earlier messages).
- Confirm `userRole === aiRole` is rejected by the start form.
- Finish a session and confirm the Markdown coach review renders the five fixed sections.
- Archive a completed session and confirm it moves out of the Active and Completed tabs.
- Resume an active session from the history list and confirm the transcript is preserved.
- Confirm `/family/practice` and the IELTS workspace still work.
- Confirm mobile single-column layout at `375x667` / `390x844` with no horizontal overflow.

## Manual Family Daily Coach verification checklist

- Open `/family/today` and confirm the four hero stats reflect real family data (approved chunks, due reviews, weak chunks, recommended count).
- Switch the child focus between Kiwi, Vivi, and Both — recommendations should refresh and the chunks list should respect the filter.
- Tap "Generate today's plan" and confirm the Markdown plan renders the five required sections, then refresh and confirm the cached badge appears.
- Tap the heart icon on a scenario, conversation, and chunk card; confirm each shows up on `/family/favorites`.
- Open `/family/insights`, confirm the stats card matches last week's data, then tap "Generate AI summary" and confirm the Markdown summary renders.
- Confirm `/family/favorites` filter works for each target type and the Remove button clears entries.
- Confirm IELTS dashboard, IELTS practice, IELTS review, IELTS chunks, and `/family/practice` still work.
- Confirm mobile single-column layout at `375x667` / `390x844` with no horizontal overflow.

## Translation Recall coverage focus

- `src/tests/translation-csv.test.ts`
  - row schema validation
  - empty CSV handling
- `src/tests/translation-script-service.test.ts`
  - empty CSV rejection
  - invalid-row CSV rows
  - first-time script create
  - idempotent re-import
  - reviewed-count listing
- `src/tests/translation-chunk-service.test.ts`
  - missing-sentence rejection
  - structured JSON parsing
  - malformed JSON handling
  - AI failure fallback
  - upsert chunk + mapping + topic creation
- `src/tests/translation-review-service.test.ts`
  - missing-sentence rejection
  - new-review counters
  - repeat-review increments
- `src/tests/translation-routes.test.ts`
  - auth + validation for extract/save/review/import
  - XLSX rejection
- `src/tests/translation-recall-from-question-service.test.ts`
  - unknown question rejection
  - duplicate detection for `(speakingQuestionId, targetBand)`
  - chunk shortlist hard cap at 30
  - fallback sentence splitting when AI omits aligned sentences
  - non-JSON AI response fallback
  - `AI_TUTOR_UNAVAILABLE` propagation
  - new-version creation when `regenerate: true`
  - `AppError` pass-through
- `src/tests/translation-recall-from-question-route.test.ts`
  - approved-user enforcement (auth + RBAC)
  - missing speakingQuestionId rejection
  - maxChunks above hard cap rejection
  - success response shape
- `src/tests/question-generator-service.test.ts`
  - malformed AI JSON → `AI_TUTOR_INVALID_RESPONSE`
  - upstream failure → `AI_TUTOR_UNAVAILABLE`
  - `AppError` pass-through
  - dedupe against existing normalized prompts
  - chunk mapping to existing Chunk Library entries
  - part filter respects PART_1 / PART_2 / PART_3
  - single status transition + bulk status transition (with ownership rejection)
- `src/tests/question-generator-routes.test.ts`
  - admin-only enforcement (401 / 403)
  - count above the hard cap (60) rejected
  - invalid status values rejected
  - success response shape

## Manual Translation Recall from-question verification checklist

- Sign in as an approved learner, open `/questions`, and pick a speaking question.
- Tap "Create Translation Recall Script" in the question detail panel.
- Confirm the modal shows the question prompt, lets you pick length and target band, and renders the result card after generation.
- Confirm the result card lists the chunks the AI used and offers "Open in Translation Recall" plus "Generate another version".
- Open the generated script and confirm Vietnamese is shown by default and English is blurred.
- Reveal the English and confirm the used chunks are highlighted with a tooltip showing their Vietnamese meaning.
- Generate a second version and confirm the question list shows the updated script count tag.
- Generate without `regenerate` and confirm the existing script is returned (toast says "already exists").
- Confirm IELTS practice, IELTS review, IELTS chunk library, the existing Translation Recall import flow, and Family English modules still work.
- Confirm mobile single-column layout at `375x667` / `390x844`.
