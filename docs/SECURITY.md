# Security

- All learner routes require authenticated and approved users.
- Admin actions require `ADMIN` role and are enforced server-side.
- Logs redact tokens, cookies, passwords, and secrets.
- `.env` is ignored from git and `.env.example` carries only placeholders.
- Pending and blocked users can sign in but cannot access study routes.
