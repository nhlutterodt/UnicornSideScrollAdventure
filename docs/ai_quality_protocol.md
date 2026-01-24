# AI Quality Protocol & Lessons Learned

This document serves as a deterministic checklist and a record of failures to ensure that AI agents (including GitHub Copilot) maintain the highest standards of code quality, accessibility, and compatibility for this project.

## 1. Failure Record (The "Stupidity" Log)

To avoid repeating past mistakes, the following failures have been documented:

-   **2026-01-23: Ignored Contextual Errors**: Failed to resolve 15+ accessibility (a11y) and CSS compatibility errors provided in the environment context while claiming the task was "polished".
-   **2026-01-23: Assumption of Completion**: Declared a feature "production-ready" without verifying WCAG standards for form inputs (missing `label` associations and `aria-label`).
-   **2026-01-23: Inconsistent Vendor Prefixing**: Applied `-webkit-backdrop-filter` in new files but failed to audit and fix existing project files (e.g., `level-customize.css`), leading to broken UI on Safari/iOS.
-   **2026-01-23: Monolithic Logic Failure**: Centralized item/ability logic directly into `Player.js` via a massive switch statement, violating the "Decoupled Entity Construction" standard and the Manager Pattern. Found only thanks to user intervention.

---

## 2. Deterministic Checklists

The following checks **MUST** be performed before claiming any task is complete.

### 2.1. HTML Accessibility (a11y)
- [ ] **Labels**: Every `<input>`, `<select>`, or `<textarea>` MUST have an associated `<label>` using the `for` attribute matching the input's `id`.
- [ ] **Aria-Labels**: If an input is visually "wrapped" or its purpose isn't clear from text alone, add a descriptive `aria-label`.
- [ ] **Titles**: Interactive elements like `<select>` should have a `title` attribute for auxiliary descriptions.
- [ ] **Tab Order**: Ensure custom UI components are keyboard navigable.

### 2.2. CSS Compatibility & Standards
- [ ] **Vendor Prefixes**: Properties like `backdrop-filter` MUST always be accompanied by `-webkit-backdrop-filter`.
- [ ] **No ID Selectors**: Cross-reference `coding_standards.md` - styling with `#id` is strictly forbidden.
- [ ] **CSS Variables**: Use project variables (`--primary-pink`, `--transition-mid`, etc.) instead of hardcoded hex codes or durations.
- [ ] **Standard Transitions**: Use `--transition-fast`, `--transition-mid`, or `--transition-slow` to maintain motion consistency.

### 2.3. JavaScript Robustness
- [ ] **Logic Decoupling**: Do entities (Player, Obstacle) contain complex business logic? If so, move it to a System Manager (e.g., `AbilityManager.js`).
- [ ] **Null Safety**: Always use null checks or optional chaining (`?.`) when accessing DOM elements that might be missing from specific pages (e.g., `if (el) el.addEventListener(...)`).
- [ ] **Storage Keys**: Use the `Storage.js` system for all persistence. Never use raw `localStorage.setItem`.
- [ ] **Default Values**: Define a `DEFAULT_SETTINGS` (or similar) constant to avoid "undefined" states in logic.
- [ ] **No Console Logging**: Never use `console.log()`, `console.warn()`, etc. Use `Logger.js` system instead.
- [ ] **External Configuration**: Content data (stages, items, abilities) should be in external JSON files, not hard-coded arrays. See [config_json_schemas.md](config_json_schemas.md).

### 2.4. Configuration & Data Management
- [ ] **JSON Structure**: All config JSON files must include `version` and `lastModified` metadata.
- [ ] **Fallback Safety**: Any external data loading must have fallback defaults (see Config.js FALLBACK pattern).
- [ ] **Validation**: External data should be validated after loading (required fields, correct types).
- [ ] **Schema Compliance**: JSON files must match schemas defined in [config_json_schemas.md](config_json_schemas.md).
- [ ] **Existing Utilities**: Always use existing utilities (Logger, EventManager, ErrorHandler) before creating new ones.

---

## 3. Tool Interaction Rules (For AI Agents)

1.  **Check Attachments**: ALWAYS read the `attachments` or `error` block in the prompt before starting. These are sources of truth that override any internal assumptions.
2.  **Deterministic Verification**: When told to "resolve issues", do not just fix the ones you see in the current file. Perform a `grep_search` or `get_errors` to find similar issues across the project.
3.  **Mandatory Linting**: Run `npm test` after EVERY modification to ensure no inline CSS/JS or raw storage regressions were introduced.
4.  **Strict Compliance**: If a coding standard is violated, the task is NOT complete. Correct the standard first.
5.  **The "Pre-Response" Verification**: Before responding to the user, perform a final `get_errors` call on all files modified or mentioned.

## 4. Aggressive Verification Tool
A custom script `scripts/standard-checker.js` has been implemented to scan for:
-   Inline styles in HTML.
-   Inline event handlers (onclick, etc.).
-   Inline script or style tags.
-   Direct `.style` assignment in JS (excluding `setProperty`).
-   Raw `localStorage` usage.
-   `console.log()` statements (use Logger.js instead).

**Note:** The checker may produce false positives for catch blocks that contain `ErrorHandler.handle()` calls. Manual verification recommended.

**Failure to pass this script constitutes a failure of the agent task.**

## 5. Mandatory Verification Checklist (Response Template)

Every time an AI agent completes a task, it must present a verification summary in the following format:

```markdown
### 🛡️ Quality Verification Report
- [ ] **Accessibility (a11y)**: All inputs have labels? All custom controls have ARIA roles?
- [ ] **Compatibility**: Vendor prefixes used? (e.g., -webkit-backdrop-filter)
- [ ] **Standards**: No ID selectors in CSS? `Storage.js` used for persistence? Logger.js for logging?
- [ ] **Configuration**: External data in JSON? Schemas documented? Fallbacks implemented?
- [ ] **Automated Check**: `get_errors` tool run on all modified files?
- [ ] **Standard Checker**: `node scripts/standard-checker.js` passes with zero violations (or documented false positives)?
```

