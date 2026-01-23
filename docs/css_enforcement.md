# CSS Enforcement Guide 🎨

**Goal**: Conflicts and "specificity wars" are strictly forbidden. All CSS must be modular, namespaced, and additive.

## 1. File Isolation
-   **Rule**: One CSS file per logical component.
-   **Do**: `hud.css`, `player.css`, `menu.css`.
-   **Don't**: Dumping everything into `game.css` or `style.css`.

## 2. Mandatory Namespacing
-   **Rule**: Every class selector inside a component file MUST start with that component's prefix.
-   **Reason**: Prevents style leaks (e.g., `.title` in the menu affecting `.title` in the HUD).

```css
/* hud.css */

/* BAD */
.title { font-size: 20px; }
.score { color: white; }

/* GOOD */
.hud-title { font-size: 20px; }
.hud-score { color: white; }
```

## 3. Ban on ID Selectors
-   **Rule**: **NEVER** use IDs for styling. IDs (`#header`) have dangerously high specificity that is hard to override.
-   **Exception**: IDs are reserved strictly for JavaScript hooks (e.g., `document.getElementById('game-container')`).

```css
/* BAD (from game.css, to be refactored) */
#game-container { ... }

/* GOOD */
.game-container { ... }
```

## 4. No Global Resets
-   **Rule**: Component files must **NEVER** contain global resets or element selectors that affect the whole page.
-   **Violation**: Putting `* { margin: 0 }` inside `player.css`.
-   **Correct Place**: Global resets belong ONLY in `base.css` or `reset.css`.

## 5. Variable Usage
-   **Rule**: Hardcoded colors and magic numbers are **FORBIDDEN**. You MUST use variables defined in `variables.css`.
-   **Reason**: Theming and consistency.

```css
/* BAD */
.player { color: #ff7eb9; }

/* GOOD */
.player { color: var(--primary-pink); }
```

## 6. Specificity Management
-   **Rule**: Maximum nesting depth is **2**.
-   **Reason**: Keeps styles flat and overridable.

```css
/* BAD: Depth 4 */
.menu .container .list .item { ... }

/* GOOD: Depth 1 */
.menu-item { ... }
```
