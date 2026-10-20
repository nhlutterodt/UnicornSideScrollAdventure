# Family Space — SQLite-first architecture decision
Status: local development foundation. Supersedes previous proposal to share Vista Solutions business Supabase and the earlier new-project creation attempt.

- **Do not write to the Vista Solutions business project.** No business DB schemas, access policies, service credentials or migrations are shared.
- Local canonical persistence target is a **SQLite database file on a developer machine or a separately managed development server**, accessed **server-side** only. A deployed static Vercel site cannot write SQLite from browser JavaScript or persist a database file safely across serverless instances.
- Initial migration: `db/sqlite/001_family_foundation.sql`. SQLite's JSON1 capability required; foreign keys must be turned on for each connection. Database files stay untracked and outside public assets.
- Use the pure `AuthoringContract.js` for validation in both human and AI proposal flows. Keep a repository interface independent of SQL dialect; do not embed SQL in UI or agent prompts.
- Preserve full versioned question and workbook JSON in immutable revision records. A workbook snapshot contains the precise question revision; publication must check referential consistency in an application transaction.
- SQLite permits no built-in RLS: use only fictional learner identities and data locally; **not** an authenticated, shared, production-ready family service. Production requires new dedicated Supabase, Auth, RLS denial tests, and audited migration.
- Do not connect SQLite via a public browser-exposed Vercel endpoint without reviewed authenticated server authorization.
- Migration plan: build explicit PostgreSQL DDL with equivalent constraints and JSONB, replace SQLite triggers as needed, run source/target integrity checks, migrate only authorized real data, test parent and child roles and cross-device persistence, then cut over via configuration.
- AI provider and AI grading remain unconnected. Future agent-generated content is treated as untrusted proposals requiring validation and human approval.

## Validation gates
1. Apply SQLite migration in empty database; run foreign-key and integrity checks.
2. Test invalid JSON, missing references, immutable revisions, immutable submitted attempts.
3. Add a server-side storage adapter, then exercise authoring save/load in local tests.
4. Never promote as secure MVP without Supabase credentials, RLS and auth.
