# Grade Space — Corrective Design v2
**Status:** DESIGN ONLY · branch `design/grade-space-corrective-v2` · 2026-10-20
**Governance:** [GRADE_SPACE_AGENT_GUARDRAILS.md](GRADE_SPACE_AGENT_GUARDRAILS.md) (release-blocking). No feature code changes are authorized by this design document.

## 1. Outcomes and explicit exclusions
A parent can create and publish a grade-tagged assignment; a child can open assigned work, save responses, submit once; the parent can review *the exact authored version* and the child's responses from another device. System handles grades 4, 5, 6+ as data. Reuse existing domain/hosting.

Out of scope: game rewards and all changes to game simulation/storage; AI grading; uploads; curriculum bureaucracy; school-scale administration; microservices; multi-tenant sharing.

## 2. Correct route and experience design
- `/` → **Unicorn Magic World** hub with four clear, keyboard-accessible choices: **Play**, **My Homework**, **Study Guide**, **My Progress**. Label study/progress as planned until functional; no fake links.
- `/play.html` → existing game markup and `js/main.js`, behavior unchanged; game companion pages remain navigable.
- `/education.html` or `/learn/` → student assignments after access check.
- `/parent/` → authenticated parent authoring and review only.
- Direct navigation, back navigation, mobile viewport and deep links are acceptance tests.
- Migration note: moving existing `index.html` to `play.html` is a routing-only change with explicit game smoke test. Do not use an iframe to disguise a failed navigation boundary. Preserve existing relative paths/assets.
- Do not ship a public 'Parent' tab in student view. Existing local demo should remain visibly marked a demo or be removed once secure backend route is live.

## 3. Modular-monolith boundaries
`education/domain/`: deterministic validators, immutable assignment version schema, supported question types; zero browser, DB or game dependencies.
`education/application/`: publish, assign, draft, submit, evaluate, review services; inputs + explicit outcomes; no DOM.
`education/adapters/`: authenticated backend client; error mapping; no direct localStorage game keys.
`education/ui/`: student and parent views; form and state concerns only.
`education/tests/`: unit, application contract, access-control, browser E2E.
No imports from `js/Game.js`, `js/core/`, `js/systems/EventManager.js`, `js/Config.js`, or game storage. Avoid a wholesale framework migration.

## 4. Canonical records and ownership
- `student_profiles(id, parent_id, nickname, grade, created_at)` — pseudonymous child data; no public signup.
- `assignments(id, parent_id, title, grade, subject, skill_tags, status)`.
- `assignment_versions(id, assignment_id, revision, published_at, questions_json)` — append-only snapshots.
- `assignments_students(id, version_id, student_id, assigned_at, due_at)`.
- `attempts(id, assignment_student_id, attempt_number, status, draft_answers_json, submitted_answers_json, started_at, submitted_at)`.
- `evaluations(id, attempt_id, result_json, score, evaluated_at, reviewer_notes)`.
- Question payload `{id, type, prompt, options?, answer_spec, feedback, skill_tag}` validated by type. The student-facing projection **must omit** `answer_spec` until a server-authorized post-submission result request.
- Grade/subject/skill are metadata; application code should not branch on 'fourth grade'.

## 5. State and command contract
`createAssignment(parent, draft)` → owner-scoped draft.
`publishVersion(parent, assignmentId)` → validated immutable revision, idempotent write key.
`assign(parent, revisionId, studentId)` → enrollment, server-authorized.
`getStudentWork(studentSession)` → published, assigned student-safe projection.
`saveDraft(studentSession, assignedId, answers, mutationId)` → validated optimistic version; reject stale writes.
`submit(studentSession, assignedId, answers, mutationId)` → atomic transition; preserve exact revision; replay with same mutation ID yields same result.
`evaluate(backend, submission)` → server-only deterministic scoring; mark free-response as manual-review-required if outside supported answer match semantics.
`review(parentSession, attemptId)` → parent ownership checks, immutable student answers + scoring + explanations.
Retake creates new attempt. Failed writes must not claim success.

## 6. Security and backend boundary
- New *isolated* Supabase project and scoped Vercel environment variables after user approves organization and any quoted cost. Existing unrelated business DB never becomes default fallback.
- Authentication for parent; child uses a bounded parent-issued access grant/session. Parent credentials never given to child.
- All tables RLS enabled deny-by-default; explicit policy tests for owned, unowned, anonymous, expired grants and direct REST access.
- Client never receives privileged service-role key. No client-side-only score authority.
- Versioned migration files reviewed before applying. Production secrets not in Git.
- Avoid collecting real student data while local demo remains unauthenticated.

## 7. Required tests and release evidence
1. Capture baseline: git HEAD, Vercel live alias, screenshot/observed route, Jest/Playwright results; record failures.
2. Static routing: hub visible on root, Play launches *unchanged* game, keyboard/mobile navigation works.
3. Pure-domain tests: schema validation, grade independence, malformed inputs, numeric normalization, revision immutability.
4. Auth/RLS negative tests: anonymous, unrelated parent/child, answer-key visibility before submission, expired access.
5. State tests: draft across refresh/device, retry/idempotency, simultaneous updates, network failure, post-submit immutability.
6. E2E: parent device A publishes → child device B submits → parent device A reviews exact answers and correct revision. Confirm persisted refresh.
7. Repeat original game smoke/regression; no new JS errors; verify content on live domain.
8. Independent adversarial review and decision record. No main merge if any blocking item fails.

## 8. Rollout plan and gates
- **Milestone 0 — guardrails and design (this branch):** approved route map, module boundaries, data contract. No runtime changes.
- **Milestone 1 — navigable hub:** minimal routing-only changes on feature branch, game smoke before and after.
- **Milestone 2 — backend foundation:** isolated project, migration, RLS and auth; access denial tests pass.
- **Milestone 3 — single vertical slice:** author → publish → assign → draft → submit → evaluate → review.
- **Milestone 4 — readiness:** full cross-device E2E, game regressions, adversarial review, deploy verification; only then merge to main.
Do not describe Milestone 1 as secure MVP. Stop safely when required credential/infrastructure/browser evidence is missing.

## 9. Open constraints requiring resolution before the backend is enabled
- Which Supabase organization hosts the *new* dedicated education project; any quoted cost.
- Parent/child access method acceptable to the family; do not improvise secret PINs or anonymous write routes.
- Actual production page navigation must be witnessed via a browser-capable tool; deployment metadata is insufficient.

## 10. Evidence register (existing `main`)
`index.html` remains the game start screen, loading `js/main.js`. A Homework link was added to the start overlay, not the intended hub. `education.html`, `css/education.css`, `js/education/main.js` constitute the browser-local demo. `js/systems/Storage.js` and `StorageManager.js` are separate game persistence conventions and excluded. `docs/AGENT_GRADE_SPACE_BOUNDARIES.md` lists game protections. `playwright.config.js` matches existing `tests/*.integration.spec.js` and `*.regression.spec.js`; presence does not prove passing. Vercel production deployment for commit `5644cfa` reported READY; user reported intended UI not discoverable.
