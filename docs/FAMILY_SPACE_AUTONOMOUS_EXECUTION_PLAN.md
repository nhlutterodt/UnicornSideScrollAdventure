# Family Space — Autonomous MVP Execution Plan
Status: EXECUTION PLAN ONLY · 2026-10-20
Repository: nhlutterodt/UnicornSideScrollAdventure
Baseline branch: `main`. Working branch: `foundation/family-space-agent-authoring` (draft PR #3). No implementation work is authorized by this document alone beyond the previously approved local prototype scope.

## Executive objective
Deliver a **usable SQLite-first Family Space local prototype** for authoring reusable questions and organized workbooks, reviewing AI-generated *structured proposals*, saving/reopening work, trying learner responses, and reviewing deterministic/manual evaluations. Preserve the existing Unicorn Magic World game and routes.

**Release classification:** local development prototype, *not* secure multi-device family MVP. Production with real family data remains blocked until a separate Supabase project, authenticated authorization/RLS, server-side grading and cross-device E2E are verified.

## Existing assets / hard facts
- `js/education/domain/AuthoringContract.js`: versioned question/workbook contracts, validator, learner-safe projection.
- `tests/family-authoring.test.js`: core validation cases.
- `db/sqlite/001_family_foundation.sql`: initial migration **committed but not independently exercised locally**. Check immutability triggers, foreign keys and JSON checks before further changes.
- `docs/FAMILY_SPACE_AUTHORING_FOUNDATION.md` and `docs/FAMILY_SPACE_SQLITE_DECISION.md`: guiding design.
- Existing `education.html` + `js/education/main.js` remain browser-local, publicly viewable **demo**; do not silently treat them as secure.
- Draft PR #3's earlier CI passed on its earlier commit; **a new CI run is necessary after subsequent SQLite/documentation changes**.
- Separate Supabase project creation was blocked; existing Vista Solutions business project is **explicitly off-limits**.
- No native parallel-subagent launcher is available in the current session; implement as clearly isolated workstreams with review handoffs. Never claim independent agents executed if they did not.

## Scope: what the user should do in the prototype
1. Create, edit, duplicate, validate, save and reopen an independent Question.
2. Author single- and multi-part Questions with single/multiple choice, number, short text, descriptive text and per-part guidance.
3. Create/edit a Workbook (Assignment) of ordered, named, categorized sections; add one or more reusable Question revisions, rearrange/remove without deleting source Questions.
4. Preview the complete learner-facing Workbook with **no answer keys or private rubrics**.
5. Take a sample learner attempt using fictional data: save/resume locally, submit, receive deterministic objective outcomes, queue descriptive work for manual review; submitted answers immutable.
6. Enter a natural-language brief and **prepare an agent-ready prompt/contract**; paste/import a JSON proposal produced by an AI outside the app; validate, preview and explicitly accept or reject; no model API or paid calls required.
7. Export/import versioned Question/Workbook JSON for portability; reject malformed/unsupported versions; show confirmation for collisions.
8. Run locally on a developer computer with a server-side SQLite database file; separately permit a **labeled browser-only preview** for mobile usability without claiming remote persistence.

## Explicit exclusions and safety invariants
- **Zero game runtime changes:** `js/main.js`, `js/Game.js`, game systems, assets, profiles, game storage, and game behavior untouched.
- Never use the Vista Solutions business Supabase project or create `family_` tables there.
- No public SQLite write endpoints, no unauthenticated family records, no real minors' personal information, no credentials in repo.
- No generalized LMS, classroom rostering, notifications, uploads, analytics, school administration, automatic AI grades, or AI orchestration platform.
- No project-provisioning or paid provider actions within this MVP scope.
- No unconditional `main` merge or production launch of unsecured authoring/answer keys.
- `docs/GRADE_SPACE_AGENT_GUARDRAILS.md` G1–G12 remain binding; where production-only requirements cannot be met, mark release BLOCKED rather than quietly waive.
- Do not fabricate test execution, screenshots, browser actions, independent agent operation, or deployed availability.

## Workstreams and ownership boundaries
### W0 — Coordinator / release steward
Maintain this plan's checkboxes and evidence register, enforce branch ownership, check diff, scope and rollback. Resolve defects through focused follow-up commits and re-run gates. Own merge/no-merge decision.

### W1 — Domain and persistence
Own only `js/education/domain/`, `server/family/`, `db/sqlite/`, relevant unit/DB tests.
- Formalize immutable question and assignment revisions; reject duplicate identifiers/invalid answer specifications, malformed multi-part structures and contradictory choice keys.
- Define an interface for question repository, assignment repository, and attempt repository; SQLite adapter behind it, server-only.
- Run transactional schema initialization, foreign-key integrity, version lookup and submitted-attempt immutability. Define migration history and rollback/backup procedure.
- Expose bounded **local-only** endpoints with validation, bounded request bodies and explicit errors; do not expose to public deployment.
- Never store server-side scoring authority in browser-supplied scores.

### W2 — Authoring UX
Own only `family-builder.html`, `css/family-builder.css`, `js/education/ui/`, UI/browser tests.
- Accessible Question Library, Question Editor, Workbook Library, section organizer, add/reuse/duplicate/reorder, draft persistence, dirty state and meaningful save feedback.
- Provide descriptive/numeric/choice response composition without dozens of type-specific forms.
- Dynamic labels and keyboard accessibility; 375px mobile and 1360px desktop.
- Learner preview reads *whitelisted* safe projections; correct answers never included.
- Add navigation from home only if the destination actually works; original `education.html` demo must not be silently replaced.

### W3 — AI proposal intake and evaluation
Own only `js/education/application/`, `js/education/agent/`, optional proposal UX module, application tests.
- Define a prompt-template and JSON export schema for full-workbook generation from natural language; enforce section/category/order and question types.
- Parse and validate model output as **untrusted data** (no arbitrary code, SQL, HTML injection or auto-publish); bounded size, field-path error feedback, explicit human approval.
- No provider keys or network LLM calls in first local prototype. Provider integration later requires opt-in, budget and data transfer policy.
- Define deterministic objective evaluation and human-reviewed descriptive evaluation; AI output can only be a non-authoritative suggestion.
- Avoid direct imports from game engine or DB-specific APIs.

### W4 — Verification / adversarial reviewer
Own test scripts, CI assertions, evidence and defect register (no production mutations).
- Independently attempt malformed proposals, answer-key exfiltration, cross-workbook revision corruption, duplicate submissions, stale drafts, SQLite restart, invalid foreign keys, SQL injection, oversized input, browser storage failure.
- Check regression across home/game/study routes, desktop and mobile authoring, keyboard/accessibility.
- Verify test identities are fictional and no real learner data was transmitted.
- Review W1–W3 changes for domain, privacy, scope, and migration portability.

## Sequenced milestones, gates, and deliverables
### M0 — Baseline and isolation [BLOCKING]
- [ ] Record `main` SHA, current deployment/rollback reference and draft PR SHA.
- [ ] Inspect prior CI results and capture fresh preflight baseline; distinguish previous run success from current HEAD.
- [ ] Validate safe branch structure and establish W1/W2/W3/W4 touched-path boundaries.
**Gate:** no changes in protected game files, no use of business Supabase.

### M1 — Domain contract and SQLite persistence
- [ ] Execute `001_family_foundation.sql` against empty SQLite locally.
- [ ] Add idempotent migrations, versioned record CRUD, transaction/error mapping, persistence after process restart.
- [ ] Unit and DB tests for referential integrity, immutable versions/submissions, malformed JSON, duplicate IDs.
**Gate:** actual pass evidence and repeatable local run commands. Do not proceed with UI wiring on DB assumptions.

### M2 — Usable question/workbook authoring
- [ ] Independently create/save/reopen/duplicate Questions.
- [ ] Workbook sections, categories, ordering, reusable question snapshots and human editing.
- [ ] Accessible form controls and responsive desktop/mobile layouts.
- [ ] Export/import valid portable JSON and reject malformed imports.
**Gate:** browser tests demonstrate complete authoring workflow; saved drafts reappear after restart.

### M3 — AI-agent-ready intake and evaluation
- [ ] Convert natural-language brief into a structured prompt and schema template export.
- [ ] Paste/import an AI-generated multi-section workbook proposal.
- [ ] Validate -> user review -> accept as *draft* (never automatic publication).
- [ ] Learner preview/fictional attempt/resume/submit; objective grading server-side; descriptive manual-review pending.
**Gate:** 30-question/3-section sample with mixed response types works end-to-end locally; malformed/adversarial proposals denied; no answer keys in student view.

### M4 — Independent test/release decision
- [ ] `npm test`, `npm run test:unit`, `npm run test:integration`, `npm run test:regression`, SQLite integration suite all execute successfully.
- [ ] Inspect actual test logs (watch for CI steps which swallow failures); capture screenshots/observed browser paths when browser tools available.
- [ ] Threat review: data disclosure, unauthorized local/network access, stale writes, submission replay, revision drift, XSS/injection, accidental integration with business DB.
- [ ] Publish evidence register with passing/failing tests, unresolved defects, exact artifacts/commits and rollback action.
- [ ] Merge **only** if branch gates meet allowed *prototype* release conditions, and no production security guardrail is violated; otherwise keep PR draft and provide local run instructions.

## Architecture and transition
```
Human editor ─┐
              ├─> Question/Workbook versioned JSON contract ─> application service ─> repository port ─> SQLite adapter (local)
AI proposal ──┘                  │
                        strict validation
                                │
Learner preview <─ safe projection / read model
                                │
Objective evaluation: server-authoritative; descriptive: human review

Later: swap SQLite adapter for isolated Supabase/PostgreSQL adapter with Auth + RLS + child scoping.
```

### Migration acceptance to dedicated Supabase (future)
- Source migration history and JSON document schema versions intact.
- Translation SQLite SQL/types/checks/triggers -> reviewed PostgreSQL SQL/JSONB policies.
- Authoritative ownership/parent-child model, Supabase Auth and deny-by-default RLS; direct REST negative tests.
- Compare source/target counts, revision hashes, referential consistency; dry-run with backups, verify rollback.
- Cross-device parent device A -> learner device B -> parent review device A observed; only then classify as secure MVP.

## Execution instructions for autonomous continuation
1. First read this plan and all mandatory guardrails. Use separate worktrees/branches if available; otherwise sequence strictly, never overwrite another stream.
2. Work M0 -> M1 -> M2 -> M3 -> M4, with evidence recorded immediately at each gate.
3. If a tool or cost approval blocks work, do not bypass: finish safe independent tasks, document blocker, and preserve rollback.
4. Scope questions have been resolved: use SQLite locally, no shared Supabase, fictional identities, no paid AI integration, browser preview allowed with demo warnings.
5. Never mark a milestone complete based on committed code alone; require executed tests and observed behavior.

## Evidence log
- 2026-10-20: Plan written from live GitHub files `GRADE_SPACE_AGENT_GUARDRAILS.md`, `FAMILY_SPACE_AUTHORING_FOUNDATION.md`, `FAMILY_SPACE_SQLITE_DECISION.md` and `package.json`. No code or database modifications made in this planning pass. All M0–M4 checks pending actual execution.
