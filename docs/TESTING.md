# Testing

## Automated checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

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

## Coverage focus

- spaced repetition scheduling
- practice answer evaluation
- chunk validation and CSV parsing
- smoke-level Playwright coverage for auth and protected routes
