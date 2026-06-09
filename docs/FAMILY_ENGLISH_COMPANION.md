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
- scenarios can be created, edited, archived, and reactivated
- scenario listing supports search plus `category` and `childFocus` filters
- users can only manage their own scenarios

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

## Planned next phases

- separate family practice engine
- family roleplay mode
- personalization and daily recommendations
