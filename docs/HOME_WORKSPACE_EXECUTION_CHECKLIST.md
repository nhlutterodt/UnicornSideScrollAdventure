# Home Workspace Correction — Execution Checklist
Date: 2026-10-20 | Branch: design/grade-space-corrective-v2
Scope: homepage routing/discoverability only. No backend claims; no game-logic changes.
## Milestone 0 — Evidence and constraints
- [x] Confirmed `index.html` contains the game, not the promised home hub.
- [x] Confirmed `education.html` exists and is linked only inside game overlay.
- [x] Identified original Playwright smoke tests tied to `/index.html`; update to `/play.html` as part of route migration.
- [ ] Capture base verification and run tests.
## Milestone 1 — Routes and UI
- [ ] Preserve existing game HTML verbatim as `play.html`, except a visible back-to-home navigation.
- [ ] Replace `index.html` with a genuinely visible home hub: Play, My Homework, Study Guide, My Progress, clear demo limitations.
- [ ] Home page points only to working routes. Study and Progress link to appropriate anchored working sections or are visibly described as future, not falsely functional.
- [ ] Education page and customize/level studio return to home; direct game route remains functional.
## Milestone 2 — Test and adversarial gates
- [ ] Update game smoke tests to `/play.html`.
- [ ] Add home navigation integration tests including keyboard/mobile and deep linking.
- [ ] Validate markup/asset paths and tests via available runtime.
- [ ] Confirm game JS untouched; verify parent access is not falsely presented as secure.
- [ ] Review implementation against scope and reject deviations.
## Milestone 3 — Release decision
- [ ] Promote to main only with all gates verified.
- [ ] Verify Vercel production deployment AND actual page, if browser verification available.
- [ ] Report each gate honestly and list blockers.
