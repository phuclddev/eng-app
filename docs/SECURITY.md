# Security

- All learner routes require authenticated and approved users.
- Admin actions require `ADMIN` role and are enforced server-side.
- The bootstrap admin account is limited to `dinhphuc.luu@garena.vn` and is elevated through idempotent server-side upsert logic only.
- The bootstrap admin user is kept `ADMIN` + `APPROVED` during seeding and on login for that exact email, which prevents accidental downgrade without bypassing normal RBAC checks.
- Logs redact tokens, cookies, passwords, and secrets.
- `.env` is ignored from git and `.env.example` carries only placeholders.
- Pending and blocked users can sign in but cannot access study routes.
