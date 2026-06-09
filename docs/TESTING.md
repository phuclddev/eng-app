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
