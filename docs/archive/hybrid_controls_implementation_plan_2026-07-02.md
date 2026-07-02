# Hybrid Controls Implementation Plan

**Date:** 2026-07-02  
**Status:** Completed and Validated  
**Primary Goal:** Introduce a non-hardcoded, hybrid under-canvas controls system with state packs and capability-aware rendering, without gameplay rewrites.

---

## 1. Objective and Scope Boundaries

### 1.1 In Scope
1. Add a data-driven controls contract.
2. Render game controls under the canvas from config, not hardcoded button lists.
3. Support hybrid behavior: state pack selection + capability gating (touch/keyboard/viewport).
4. Route all control interactions through centralized input/action handling.
5. Preserve existing gameplay semantics and state flow.

### 1.2 Out of Scope
1. No gameplay mechanics changes.
2. No redesign of particle, collision, ability, or scoring systems.
3. No dynamic/growable UI framework introduction.
4. No broad visual redesign beyond controls area required for this feature.
5. No refactor of unrelated modules.

### 1.3 Rewrite Prevention Rules
1. Contract-first: finalize control schema before renderer behavior.
2. Action-first integration: new buttons must dispatch existing actions through centralized input/action routing.
3. Forward-only migration: legacy control paths are removed when their state checkpoint is completed; no keep-alive fallback.
4. One-way progression: do not start a later phase until phase exit criteria are satisfied.

---

## 2. Architecture Decision (Hybrid Early)

### 2.1 Chosen Model
Hybrid = **State Pack Resolution** + **Capability Gating** + **Central Action Dispatch**.

### 2.2 Required Building Blocks
1. Controls schema in configuration:
1. Action definitions.
2. Pack composition by game state.
3. Capability visibility rules.
2. Controls renderer:
1. Builds under-canvas controls from resolved pack.
2. Re-renders only on relevant state/capability/action-availability changes.
3. Action gateway:
1. Uses existing input command flow so behavior remains single-source.

---

## 3. Execution Plan With Hard Boundaries

## Phase A: Contract and Resolution Core

### Task A1 - Controls Schema Definition
**Boundary:** Config-only contract work. No DOM changes.

Deliverables:
1. Define controls config object with:
1. `actions` map (`id`, `label`, `icon`, `ariaLabel`, optional `variant`).
2. `packs` by state (`START`, `PLAYING`, `GAMEOVER`).
3. `rules` for capability filtering, including conflict precedence (`touchPrimary` vs `keyboardPresent`) and compact viewport behavior.
2. Document schema comments inline for maintainability.

Exit Criteria:
1. Schema is complete enough to render START/PLAYING/GAMEOVER without hardcoded control labels.
2. No runtime behavior change yet.

### Task A2 - Capability Profile Resolver
**Boundary:** Capability utility only. No rendering.

Deliverables:
1. Utility that resolves capability profile fields:
1. `touchPrimary`.
2. `keyboardPresent`.
3. `compactViewport`.
2. Stable, deterministic API used by renderer.

Exit Criteria:
1. Capability profile can be queried without side effects.
2. No action dispatch or game-state mutations introduced.

### Task A3 - Pack Resolution Function
**Boundary:** Pure resolution logic. No DOM node creation.

Deliverables:
1. Resolve active pack from game state.
2. Filter actions by capability rules.
3. Return ordered action descriptors for rendering.

Exit Criteria:
1. Pure function output is testable from inputs.
2. No direct dependency on canvas or layout.

### Task A4 - Action Contract and Handoff Freeze
**Boundary:** Contract verification only. No rendering or layout changes.

Deliverables:
1. Audit and freeze action ids dispatched by controls (`jump`, `useAbility`, `cycleLeft`, `cycleRight`, and state-specific actions).
2. Map each action id to centralized input/action route and state gating rules.
3. Produce a handoff note in this plan `Notes` column confirming A-phase outputs are renderer-ready.

Exit Criteria:
1. Action contract is explicit and stable for B-phase implementation.
2. A1-A3 outputs are verified compatible with renderer input requirements.

---

## Phase B: Rendering and Integration (No Legacy Removal)

**Entry Criteria (MANDATORY GATE):**
1. A1, A2, A3, and A4 are `DONE`.
2. Phase A Gate is fully satisfied.
3. Controls schema and action contract are frozen for B-phase.

### Task B1 - Under-Canvas Host Integration
**Boundary:** Markup + styles for mount area only.

Deliverables:
1. Add under-canvas controls host container.
2. Add responsive styles for desktop and touch-primary layouts.

Exit Criteria:
1. Host appears correctly under canvas.
2. No control logic attached yet.

### Task B2 - Controls Renderer Component
**Boundary:** Render-only component, no gameplay decisions.

Deliverables:
1. Create renderer module that:
1. Accepts resolved action list.
2. Renders buttons with accessibility labels.
3. Uses event delegation or bounded listener setup.
2. Exposes `render(state, profile, context)` and `dispose()`.

Exit Criteria:
1. UI can render from mock descriptors.
2. No direct calls to player/entity internals.

### Task B3 - Action Dispatch Bridge
**Boundary:** Input/action routing only.

Deliverables:
1. Bridge from rendered button click to existing action triggers.
2. Keep keyboard/touch paths intact and behaviorally identical.
3. Create per-state parity checkpoint artifact at `docs/hybrid_controls_parity_checkpoints.md` with START, PLAYING, and GAMEOVER sections.

Exit Criteria:
1. Each new button triggers the same code path as existing input routes.
2. No duplicated gameplay logic in renderer.
3. Per-state checkpoint entries are completed for implemented states with pass/fail evidence.

---

## Phase C: Controlled Migration and Cleanup

**Entry Criteria (MANDATORY GATE):**
1. B1, B2, and B3 are `DONE`.
2. Phase B Gate is fully satisfied.
3. Per-state parity checkpoints exist for START, PLAYING, and GAMEOVER.

### Task C1 - State Pack Rollout
**Boundary:** Enable packs incrementally.

Deliverables:
1. Enable PLAYING pack first and complete PLAYING parity checkpoint.
2. Enable START pack and complete START parity checkpoint.
3. Enable GAMEOVER pack and complete GAMEOVER parity checkpoint.

Exit Criteria:
1. All required states have rendered controls.
2. Existing state transitions remain unchanged.
3. All three per-state checkpoints are marked `PASS`.

### Task C2 - Redundancy Reduction
**Boundary:** Remove all replaced hardcoded controls with no legacy fallback.

Deliverables:
1. Remove duplicated hardcoded button definitions/listeners where replaced by hybrid controls.
2. Document removed legacy paths in this plan `Notes` column by task and file.
3. Verify no duplicate control entry points remain after removal.

Exit Criteria:
1. No duplicate control entry points for same action.
2. Standards/tests pass after cleanup.

---

## 3.1 Blast Radius and Test Enrichment Matrix (Mandatory)

Every task must evaluate blast radius, not only dependencies. When a task changes, required tests expand to cover all affected runtime surfaces listed below.

| Task | Blast Radius (What Can Break) | Required Test Enrichment |
|---|---|---|
| A1 | Config contract changes can break resolver inputs, renderer mapping, and action bridge assumptions. | Add schema-shape and invalid-schema tests for actions, packs, and capability rules. |
| A2 | Capability detection can break visibility and control availability on mobile/desktop/compact layouts. | Add deterministic profile tests for touch/keyboard/compact permutations and mixed-device edge cases. |
| A3 | Resolver output can break per-state control list, ordering, and filtering. | Add table-driven tests for START/PLAYING/GAMEOVER outputs and ordering stability checks. |
| A4 | Contract freeze errors can break centralized dispatch and state-gating consistency. | Add contract tests asserting action ids map to canonical input routes with state-gating assertions. |
| B1 | Host/layout changes can break canvas adjacency, overlay stacking, and clickability. | Add viewport DOM checks and layout assertions for desktop and compact/touch-primary states. |
| B2 | Renderer lifecycle changes can break accessibility and event listener cleanup. | Add render/update/dispose tests, ARIA assertions, and listener leak regression tests. |
| B3 | Dispatch bridge changes can cause action drift or duplicate trigger paths. | Add per-action parity tests across keyboard/touch/rendered controls and duplicate-trigger guards. |
| C1 | State rollout changes can break state transitions and required control availability. | Add state-transition tests with per-state action availability assertions and checkpoint evidence. |
| C2 | Legacy path removals can break references/selectors and final production action entry points. | Add cleanup regressions for stale handlers/selectors and full post-removal integration sweep. |

Blast Radius Review Rules:
1. Each completed task must record changed files, affected surfaces, and updated tests in the tracking table `Notes` column.
2. If blast radius expands mid-task, mark task `BLOCKED` until test plan is updated.
3. No phase gate can pass without blast radius review evidence for all tasks in that phase.

---

## 4. Tracking Artifact Format (Use During Execution)

Use this table as the single tracking source in this file.

| ID | Task | Owner | Status | Start | End | Gate | Notes |
|---|---|---|---|---|---|---|---|
| A1 | Controls Schema Definition | Copilot + User Review | DONE | 2026-07-02 | 2026-07-02 | Contract Approved | Blast radius: config contract surface. Files: `js/Config.js`. Tests: `js/systems/HybridControlsBar.test.js` schema/action-pack assertions. |
| A2 | Capability Profile Resolver | Copilot | DONE | 2026-07-02 | 2026-07-02 | Pure Utility Verified | Blast radius: viewport/device gating. Files: `js/systems/HybridControlsBar.js`. Tests: `resolveCapabilityProfile` deterministic coverage in `js/systems/HybridControlsBar.test.js`. |
| A3 | Pack Resolution Function | Copilot | DONE | 2026-07-02 | 2026-07-02 | Deterministic Resolution | Blast radius: per-state control availability and ordering. Files: `js/systems/HybridControlsBar.js`. Tests: START/PLAYING ability-filter table assertions in `js/systems/HybridControlsBar.test.js`. |
| A4 | Action Contract and Handoff Freeze | Copilot + User Review | DONE | 2026-07-02 | 2026-07-02 | Contract Frozen | Blast radius: unified dispatch contracts. Files: `js/Config.js`, `js/Game.js`, `js/systems/GameInputHandler.js`, `js/systems/HybridControlsBar.js`. Tests: dispatch path assertions in `js/systems/HybridControlsBar.test.js`. |
| B1 | Under-Canvas Host Integration | Copilot | DONE | 2026-07-02 | 2026-07-02 | Layout Verified | Blast radius: canvas adjacency and overlay layering. Files: `index.html`, `css/game.css`, `css/ui.css`, `css/abilities.css`. Tests: browser integration checks in `tests/smoke.integration.spec.js` and `tests/smoke.regression.spec.js`. |
| B2 | Controls Renderer Component | Copilot | DONE | 2026-07-02 | 2026-07-02 | Render API Stable | Blast radius: button rendering, accessibility, lifecycle. Files: `js/systems/HybridControlsBar.js`, `css/ui.css`. Tests: renderer lifecycle and visibility tests in `js/systems/HybridControlsBar.test.js`. |
| B3 | Action Dispatch Bridge | Copilot | DONE | 2026-07-02 | 2026-07-02 | Path Parity Confirmed Per State | Blast radius: action trigger parity and duplicate path prevention. Files: `js/Game.js`, `js/systems/GameInputHandler.js`, `tests/smoke.integration.spec.js`, `tests/smoke.regression.spec.js`. Tests: per-state parity evidence in `docs/hybrid_controls_parity_checkpoints.md`. |
| C1 | State Pack Rollout | Copilot + User Review | DONE | 2026-07-02 | 2026-07-02 | State Parity Verified | Blast radius: START/PLAYING/GAMEOVER control transitions. Files: `js/Config.js`, `js/Game.js`, `index.html`. Tests: regression state-pack traversal in `tests/smoke.regression.spec.js`. |
| C2 | Redundancy Reduction | Copilot + User Approval | DONE | 2026-07-02 | 2026-07-02 | Forward-Only Migration Complete | Blast radius: removed legacy selectors/listeners. Files: `index.html`, `js/systems/UIManager.js`, `js/systems/GameInputHandler.js`, `css/abilities.css`, `tests/smoke.integration.spec.js`. Tests: full suite (`npm test`, `npm run test:unit`, `npm run test:integration`, `npm run test:regression`). |

Status values: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`.

Notes requirement:
1. Every task completion note must include blast radius summary and linked test updates.

---

## 5. Validation Gates (Per Phase)

### Phase A Gate
1. No UI behavior changes observed.
2. Unit-level coverage for pack resolution path.
3. Action contract freeze is complete and documented.
4. Blast radius review evidence exists for A1-A4.

### Phase B Gate
1. New controls render under canvas in expected states.
2. Button interactions trigger existing action routes only.
3. Per-state checkpoint file exists with evidence sections for START, PLAYING, GAMEOVER.
4. Blast radius review evidence exists for B1-B3.

### Phase C Gate
1. No duplicate or conflicting action paths remain.
2. `npm test` passes.
3. `npm run test:unit` passes.
4. All per-state checkpoints are `PASS`.
5. Blast radius review evidence exists for C1-C2, including removed-path verification.

---

## 6. Token and Accuracy Strategy (Execution Efficiency)

1. Work in bounded task slices (A1, A2, A3, ...), one gate at a time.
2. Keep context packets per task:
1. Only read files required by current task.
2. Avoid re-reading full files once boundary is stable.
3. Maintain delta-only updates in this artifact after each completed task.
4. Do not implement speculative enhancements outside current task boundary.
5. Defer optional improvements to a Post-Completion Notes section.

---

## 7. Risk Register and Controls

1. Risk: behavior drift between keyboard and rendered buttons.
   Control: enforce action dispatch through centralized input route.

2. Risk: forward-only removal introduces regressions during migration.
   Control: enforce per-state checkpoint pass before each removal step in C2.

3. Risk: schema creep and accidental feature expansion.
   Control: strict A1 schema freeze before B-phase starts.

---

## 8. Completion and Archival Procedure

When C2 is complete and all gates pass:
1. Mark all tasks `DONE` with final dates and notes.
2. Add completion summary with: planned vs actual sequence, checkpoint results per state, and removed legacy paths.
3. Move a frozen copy to `docs/archive/hybrid_controls_implementation_plan_2026-07-02.md`.
4. Keep this original file with a one-line pointer to archived location.

Completion summary:
1. Planned vs actual sequence: A1-A4, B1-B3, C1-C2 completed in planned order with no phase rollback.
2. Per-state checkpoints: START `PASS`, PLAYING `PASS`, GAMEOVER `PASS` (see `docs/hybrid_controls_parity_checkpoints.md`).
3. Removed legacy paths: `js-start-btn` flow and `abilityTouch*` controls/listeners removed with forward-only migration.
4. Robust validation completed: `npm test`, `npm run test:unit`, `npm run test:integration`, `npm run test:regression` all pass.

---

## 9. Review Checklist (For Joint Plan Review)

1. Are phase boundaries strict enough to prevent rewrites?
2. Are any tasks too broad and needing further split?
3. Is state pack rollout order acceptable (PLAYING, START, then GAMEOVER)?
4. Are per-state checkpoints sufficient for forward-only legacy removal?
5. Do we need additional acceptance checks for mobile layout behavior?
