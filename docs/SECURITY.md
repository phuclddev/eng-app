# Security

- All learner routes require authenticated and approved users.
- Admin actions require `ADMIN` role and are enforced server-side.
- The bootstrap admin account is limited to `dinhphuc.luu@garena.vn` and is elevated through idempotent server-side upsert logic only.
- The bootstrap admin user is kept `ADMIN` + `APPROVED` during seeding and on login for that exact email, which prevents accidental downgrade without bypassing normal RBAC checks.
- Logs redact tokens, cookies, passwords, and secrets.
- `.env` is ignored from git and `.env.example` carries only placeholders.
- Pending and blocked users can sign in but cannot access study routes.
- `AI_CHATFLOW_TOKEN` stays server-side only and is never exposed to browser code.
- AI Tutor requests require authenticated, approved users and reuse only conversations owned by the current user.
- The app stores only internal AI conversation metadata plus the upstream conversation id mapping; it does not expose upstream bearer credentials or authorization headers in logs.
- Rate limiting for `/api/ai-tutor/chat` is still a TODO before heavier production traffic.
