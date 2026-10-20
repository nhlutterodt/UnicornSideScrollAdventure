# Grade Space: Implementation Design and Release Contract
Version: 1.0 (2026-10-20)
Status: First local vertical slice on main; production cross-device MVP not yet achieved
Owner: education domain only
Defer game work: [AGENT_GRADE_SPACE_BOUNDARIES.md](AGENT_GRADE_SPACE_BOUNDARIES.md)

## Goal and scope
Build a parent-directed Grade Space within the current Unicorn Magic World website. The same educational domain must support grades 4, 5, 6+ without domain rewrites. The first release allows authoring a math assignment, answering it, submitting it, and reviewing explanations and results.

## Existing code evidence
- `index.html` is the current game entry point. It now includes a link to `education.html`; gameplay bootstrap remains `js/main.js`.
- `js/Game.js`, `js/core/GameLoop.js`, `js/systems/LevelSystem.js`, and `js/entities/` are a separate game runtime. Education MUST NOT import these modules or the game event bus.
- `js/systems/Storage.js` prefixes `unicorn_magic_run_v1_` and encloses payloads; `js/systems/StorageManager.js` uses another local-storage convention. Education uses its own isolated key `unicorn_grade_space_v1` only as a throwaway local prototype adapter.
- Existing Playwright specifications live in `tests/` and the repository has `playwright.config.js`. Do not claim they pass without executing them.

## Bounded education modules (conceptual)
1. Curriculum catalog: grade, subject, skill tags. These are metadata, NOT per-grade program logic.
2. Assignment authoring: draft questions; publish immutable revisions.
3. Attempt lifecycle: not started -> draft -> submitted; preserve answer snapshots.
4. Evaluation: deterministic answer checks for supported types; explanation for each question. Do not rely on generative AI or trust client-provided scores.
5. Review/reporting: parent-only access to submitted work and historical results.
6. Identity and persistence: dedicated backend, authenticated parent, child profile, row-level authorization, explicit backup/deletion.

## Data contracts for backend
`learning_profiles(id, parent_user_id, display_name, active_grade, created_at)`
`assignments(id, owner_user_id, title, grade, subject, status, created_at)`
`assignment_versions(id, assignment_id, version, content_json, published_at)`
`assignments_to_students(id, version_id, student_id, assigned_at, due_at)`
`attempts(id, assignment_student_id, status, answers_json, started_at, submitted_at)`
`evaluations(id, attempt_id, version_id, score, per_question_json, reviewed_at)`

### Invariants
- Grade belongs to content metadata; no hardcoded grade-specific routes or schema.
- Published version content and answer keys are immutable. New edits create new versions.
- A submitted attempt becomes immutable. Retakes create new attempts.
- Evaluation must be derived server-side from trusted version and answers. No client-supplied score.
- Student access is restricted to assigned published content; never disclose answer keys before submission.
- Parent access is restricted to owned profiles, authored materials, and associated submissions; enforce on backend with RLS and tests.
- Reject malformed question and answer payloads; cap lengths and sizes; avoid raw HTML rendering.
- Never store a child's full name, birth date, or unnecessary personal details.
- Parent credentials/secrets never appear in shipped JS or static config.
- Do not allow guest/local prototype mode to masquerade as cloud persistence.

## First vertical slice (already implemented, LOCAL DEMONSTRATION ONLY)
- `education.html`: standalone entry linked from game start overlay.
- `css/education.css`: responsive educational UI.
- `js/education/main.js`: sample ten-question multiplication assignment, parent-facing creation, choice/number input, browser-local draft/submission, answer explanation, review, JSON export.
- Parent mode in local demo is *not* authenticated. All content including answer keys is client-visible. These screens MUST NOT be used to store real child educational records or presented as a secure production MVP.
- Results are device/browser-local; user cannot review from another device. No cloud synchronization.
- This local prototype is a UI/product feedback baseline, NOT the required cross-device completion criterion.

## Backend release gate (required before production use)
- Provision a **separate Supabase project** (user selects organization; cost must be accepted if quoted); no changes to unrelated business databases.
- Create schema with migration + RLS deny-by-default; write authorization/visibility tests with parent and child identities.
- Implement secure authenticated parent session; simple child access via parent-managed invitation/session.
- Use server-owned publish and submit operations; server-side scoring; prevent duplicate/mutating submissions.
- Implement server-facing repository adapter, network failure states, and restart/cross-device tests.
- Remove or disable unsecured local parent/review mode before labeling cloud MVP production-ready.
- Verify all existing game smoke tests plus education E2E journeys, including mobile.
- Confirm Vercel production deployment and actual URL availability; do not equate `main` push with a ready deployment.

## Deferred work
No game progression rewards, gamification integration, AI grading, uploaded files, rich rubrics, curriculum catalogs beyond tags, multi-parent administration, school integration, multi-tenant LMS, complex workflow engines, or automated mastery predictions.

## Acceptance milestones
A. Static prototype: entry navigation works; sample assignment answers and explanations; publish/draft/submit/review in one browser; data isolated from game storage.
B. Secure MVP: authenticated parent publishes; assigned child completes; persistence survives browser/device changes; parent on another device reviews exact submitted answers and explanation history; RLS tests show no cross-user reads; production URL verified; existing game unchanged.
