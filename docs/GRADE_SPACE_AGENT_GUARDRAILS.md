# Grade Space — Mandatory Agent Guardrails and Release Gates
Status: BINDING for all Grade Space contributions
Updated: 2026-10-20
Read before any code change. Related: docs/AGENT_GRADE_SPACE_BOUNDARIES.md and docs/GRADE_SPACE_IMPLEMENTATION.md

## What went wrong in iteration 1
- A link placed inside the game's start overlay was substituted for the explicitly agreed landing hub. That changed the delivery without approval.
- A publicly accessible, unauthenticated "Parent" interface with client-readable answer keys was deployed as a prototype, creating foreseeable risks if used for actual homework.
- Browser-local storage was described as progress toward an MVP whose central requirement was cross-device parent review.
- A ready Vercel deployment was treated as practical proof of the feature even though no real browser journey had been executed.
- Education authoring, storage, grading, and rendering were bundled into one large module.
These are failures to prevent, not reusable implementation patterns.

## Non-negotiable invariants
G1. Scope: never change game physics, gameplay loop, entity system, item/level profiles, game storage, or event bus for Grade Space. Do not import game runtime from education modules or vice versa. Existing game behavior is an explicit regression target.
G2. Requirements traceability: map every code change to a named user outcome. The home hub must visibly expose Play, Homework, Study Guide, and Progress, with working destinations or clearly disabled 'planned' labels. Do not substitute an overlay link for the landing hub.
G3. Privacy: no personal child information in demo data, client logs, URLs, analytics, or public example content. The local prototype must be labeled DEMO, not production-ready. Do not solicit real homework in an unprotected interface.
G4. Auth/authorization: production parent authoring/review requires authenticated sessions and server-side owner checks. Child access must be scoped to assigned published work; answer keys cannot be sent to the client before submission. Never treat a hidden tab, password in JS, or route obscurity as authentication.
G5. Persistence: browser localStorage is not a cross-device source of truth. Real submissions require dedicated durable storage, server-managed writes, immutable submitted attempts, and published question-version snapshots. Do not share the game's localStorage namespace or store education data in an unrelated business production database without explicit authorization.
G6. Data-driven, bounded design: grade/subject/skill are metadata, not route-specific code. Keep small independent education modules for catalog/authoring/attempts/evaluation/review/persistence; do not introduce microservices, generalized LMS workflows, or AI grading in MVP.
G7. Evaluation integrity: never trust client-supplied scores; validate answer types and question payloads on server; handle duplicate/replayed submissions idempotently; define retake as a new attempt.
G8. Operational safety: no migrations against existing business databases, secrets in repository, insecure auth fallback, public write endpoints, destructive overwrites, or production data resets. New infrastructure with potential spend requires cost review and user approval.
G9. Testing: verify existing game smoke/regression checks and add real education tests covering entry navigation, authoring, access control, attempts, submission, restart, cross-device review, mobile, and failure paths. Tests must actually execute and be reported with exact outcomes.
G10. Release truthfulness: "pushed to main", "Vercel READY", "URL returns 200", "UI navigated", and "end-to-end user journey passed" are five different facts. Report separately. Never claim a ready-to-use MVP without an observed end-to-end authenticated cross-device workflow.
G11. Change discipline: build on a dedicated branch; review diff/changeset; run preflight; merge/main deploy only after required gates pass. If infrastructure, browser access, or tests are unavailable, **STOP** and report the blocker. Do not lower gates to meet a deadline.
G12. Independent adversarial pass: review security, data leakage, domain separation, actual user discoverability, database consistency, and rollback before release; remediation evidence must accompany each closed finding.

## Release checklist (blocking)
- [ ] Validated existing production baseline and identified rollback target.
- [ ] Homepage presents the promised activity hub on desktop and mobile, with direct game link.
- [ ] Game unchanged and regression tests pass.
- [ ] Parent auth, child scoping, server authorization, and RLS denial tests pass.
- [ ] Answer keys invisible to student before submit; score calculated on server.
- [ ] Published assignment revisions immutable; submitted attempts immutable.
- [ ] Parent can author on device A; student complete on device B; parent review from device A after refresh.
- [ ] Offline, reload, duplicate submit, failed save, invalid data, and access-denied paths tested.
- [ ] Browser journey observed on production or release-equivalent URL, with captured steps/evidence.
- [ ] Adversarial review findings resolved or explicitly release-blocking.
- [ ] Release status accurately distinguishes prototype from secure MVP.

## Corrective plan (smallest safe sequence)
1. Freeze the game runtime and classify existing unsafe prototype as demo only.
2. Create a dedicated feature branch.
3. Implement the agreed visible homepage hub and preserve game navigation via a separate, unchanged entry point; test routing and game boot before moving on.
4. Restructure education into domain modules without changing feature semantics.
5. Provision an isolated educational backend only after infrastructure scope and cost are understood; enforce security policies first, then authenticated authoring/assignment/attempt services.
6. Implement end-to-end tests and perform independent adversarial pass.
7. Promote only with all gates satisfied. If not, leave as reviewed branch and report exact remaining work.

## Agent response contract
Every implementation report MUST state: files changed, protected files untouched, tests actually run and results, browser navigation actually performed, deployment identity and URL if verified, unresolved risks, and a precise classification (design, demo, release candidate, or secure MVP). No estimates dressed up as facts.
