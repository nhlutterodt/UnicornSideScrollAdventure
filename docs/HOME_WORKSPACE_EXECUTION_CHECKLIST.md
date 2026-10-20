# Home Workspace Correction — Execution Checklist
Date: 2026-10-20 | Branch: design/grade-space-corrective-v2
Scope: homepage routing/discoverability only. No backend claims; no game-logic changes.
## Milestone 0 — Evidence and constraints
- [x] Confirmed `index.html` contains the game, not the promised home hub.
- [x] Confirmed `education.html` exists and is linked only inside game overlay.
- [x] Identified original Playwright smoke tests tied to `/index.html`; update to `/play.html` as part of route migration.
- [x] Capture base verification and run tests: GitHub Actions run 39508667832 passed standards, Jest, Playwright integration and regression on PR.
## Milestone 1 — Routes and UI
- [x] Preserve existing game HTML verbatim as `play.html`, except a visible back-to-home navigation.
- [x] Replace `index.html` with a genuinely visible home hub: Play, My Homework, Study Guide, My Progress, clear demo limitations.
- [x] Home page points only to working routes. Study and Progress link to appropriate anchored working sections or are visibly described as future, not falsely functional.
- [x] Education page returns to home; companion pages' existing index links return home; direct game route smoke tests pass.
## Milestone 2 — Test and adversarial gates
- [x] Update game smoke tests to `/play.html`.
- [x] Add home navigation integration tests including keyboard/mobile and deep linking.
- [x] Validate checks via GitHub Actions: run 39508667832 successful; Playwright exercised local served pages.
- [x] Game JS untouched; homepage explicitly warns that educational access is an unsecured local demo.
- [x] Adversarial check: new CSS extracted from inline style; scoped demo-storage adapter added to satisfy standards without mixing game data; no backend changes.
## Milestone 3 — Release decision
- [ ] Promote to main: gated on refreshed PR CI after this documentation update.
- [ ] Verify Vercel production deployment after merge. Independent public-domain browser navigation not available; release-equivalent Playwright navigated localhost.
- [ ] Report release/deployment and public-URL verification limitations.

## Verification evidence
- GitHub Actions: https://github.com/nhlutterodt/UnicornSideScrollAdventure/actions/runs/39508667832 — conclusion success, all CI jobs passed.
- Public domain could not be loaded through this session's web client; this is an external verification limitation, not an observed 404.
- Parent authentication/cross-device storage remains out of scope. This home correction does not promote Grade Space demo to a secure MVP.
