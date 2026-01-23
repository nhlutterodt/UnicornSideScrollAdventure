# Coding Standards & Best Practices

This document outlines the coding standards for the Unicorn Magic Run project. We aim for clean, performant, and maintainable code suitable for web-based game development.

## 1. General Principles

-   **Consistency**: Follow the existing style of the codebase. If you see a pattern, stick to it.
-   **Readability**: Code is read much more often than it is written. Optimize for clarity.
-   **Performance**: In game development, performance is critical. Avoid operations that cause frame drops (garbage collection spikes, heavy reflows) inside the main loop.

## 2. HTML Standards

-   **Semantic HTML**: Use proper HTML5 tags (`<header>`, `<main>`, `<footer>`, `<canvas>`) where applicable outside the game view.
-   **Indentation**: Use 4 spaces for indentation.
-   **Attributes**: Use double quotes for attribute values.
-   **Canvas**: Always specify a fallback content inside the `<canvas>` tag specific to accessibility.

```html
<!-- BAD -->
<div id="game"></div>

<!-- GOOD -->
<canvas id="gameCanvas">
    Your browser does not support the HTML5 canvas tag.
</canvas>
```

## 3. CSS Standards

-   **Formatting**: Use 4 spaces for indentation.
-   **No IDs for Styling**: ID selectors (`#id`) are **strictly forbidden** in CSS files. IDs are JavaScript hooks only.
-   **Naming**: Use lowercase with hyphens (kebab-case) for class names.
-   **Specificity**: Keep selectors specific but flat. Avoid deep nesting (more than 3 levels).
-   **Separation of Concerns**: CSS files must contain all layout, color, and animation properties. No visual properties should be defined in JavaScript.

```css
/* BAD - Using an ID and defining style in JS */
#game-container {
    color: red; /* ID selector forbidden */
}

/* GOOD - Using classes and defining state in CSS */
.game-container {
    color: white;
}
.game-container.is-active {
    border-color: gold;
}
```

## 4. JavaScript Standards

We use modern ES6+ syntax.

### 4.1. Formatting
-   **Indentation**: 4 spaces.
-   **Semicolons**: Always use semicolons.
-   **Quotes**: Use single quotes `'` for strings, backticks `` ` `` for template literals. Avoid double quotes `"` in JS unless necessary (e.g., inside another string).

### 4.2. Variables
-   Use `const` by default.
-   Use `let` only when reassignment is needed.
-   **Avoid `var`**.

### 4.3. Naming Conventions
-   **Variables/Functions**: `camelCase` (e.g., `playerSpeed`, `spawnEnemy()`).
-   **Classes**: `PascalCase` (e.g., `Obstacle`, `Particle`).
-   **Constants**: `UPPER_SNAKE_CASE` for global configuration constants (e.g., `GRAVITY`, `MAX_SPEED`).
-   **Booleans**: Prefix with `is`, `has`, or `should` (e.g., `isGrounded`, `hasAmmo`).

### 4.4. Game Development Patterns

#### Game Loop
-   Use `requestAnimationFrame` for the main loop.
-   Keep the `update()` (logic) and `draw()` (rendering) phases distinct.

#### Entity Inheritance
To maintain standardization and interoperability, all game objects must extend the base `Entity` class.
-   Always call `super(x, y, width, height, type)` in the constructor.
-   Use `this.destroy()` for self-removal.
-   **Anti-Pattern Alert**: Do not implement complex logic (like item parsing or effect resolution) inside the Entity. Use a **System Manager** instead.

#### The Manager Pattern (Strict Decoupling)
Entities should be pure state containers where possible. Complex logic that bridges multiple entities or configurations MUST be moved to a static System class.
-   *Example*: `Item.js` does NOT know how to apply a power-up. It calls `AbilityManager.apply()`.
-   *Benefit*: Prevents `Player.js` from becoming a "God Object" or a monolithic switch-case nightmare.

#### Memory Management (Critical)
Allocating memory (creating new objects/arrays) inside the game loop causes the Garbage Collector (GC) to pause execution, leading to "stutters" or dropped frames.

-   **Object Pooling**: Reuse objects instead of creating/destroying them.
    -   *Example*: Instead of `new Particle()` every frame, have a pool of inactive particles and recycle them.
-   **Avoid Closures in Loop**: Do not define functions inside `update()` or `draw()`.
-   **Pre-allocation**: Pre-allocate arrays if size is known.

```javascript
// BAD: Creates garbage every frame
function update() {
    const tempVector = { x: 0, y: 1 }; // New object created 60 times/sec
    player.position.add(tempVector);
}

// GOOD: Reuse objects
const tempVector = { x: 0, y: 1 };
function update() {
    player.position.add(tempVector); // No allocation
}
```

### 4.5. Style Separation & State Management
-   **No Inline Styles**: Never use `element.style.property = value` for visual state changes.
-   **State via Classes**: Use `element.classList.add/remove/toggle()` to trigger styles defined in CSS.
-   **State via Data Attributes**: For complex states, use `element.dataset.state = value` and target it in CSS with attribute selectors (e.g., `[data-state="active"]`).
-   **Dynamic Runtime Values**: If a value cannot be known beforehand (e.g., random color or coordinate), use CSS Variables: `element.style.setProperty('--dynamic-val', value)`. The mapping of the variable to a CSS property must still live in the stylesheet.

```javascript
/* BAD - Manipulating styles directly */
button.style.backgroundColor = 'gold';
button.style.display = 'block';

/* GOOD - Using classes and data attributes */
button.classList.add('is-active');
preview.dataset.color = 'pink';

/* GOOD - Using CSS Variables for dynamic values */
star.style.setProperty('--x-pos', Math.random() * 100 + '%');
```

### 4.6. Comments
-   Use JSDoc style `/** ... */` for classes and complex functions.
-   Use inline `//` comments to explain *why* something is done, not *what* is done.

## 5. File Structure
-   `css/`: Stylesheets.
-   `js/`: Modular JavaScript files.
    -   `core/`: Engine essentials (Registry, Loop, State).
    -   `systems/`: Global systems (Input, Storage, Particles).
    -   `entities/`: Game object classes (Player, Obstacle).
    -   `utils/`: Helper utilities (DOM safety, Math).
-   `assets/`: Images, sounds, fonts.
-   `docs/`: Documentation.

## 6. Modular Architecture Standards
-   **No Inline Scripts**: HTML files should only contain a single `type="module"` script tag referencing an entry point file (e.g., `<script type="module" src="./js/main.js"></script>`). This improves security (CSP) and enforces total separation of concerns.
-   **Bootstrapping**: Use a `DOMContentLoaded` listener in the entry point file to ensure the DOM is ready before instantiating core classes.
-   **Singleton vs Instance**: Core systems (Registry, Storage) should be exported as singletons if global state is required, otherwise use constructor injection.
-   **Data-Driven Config**: Physics constants and intervals MUST be defined in a `config` object, not hardcoded in logic.
-   **Mandatory Cleanup**: Any system attaching event listeners MUST implement a `dispose()` method.

#### Type Coercion Pitfalls
JavaScript's lose typing can lead to subtle bugs. Always use strict equality (`===`).
-   `0 == ""` is `true`. `0 === ""` is `false`.
-   `null == undefined` is `true`. `null === undefined` is `false`.
-   **Safe Check**: When checking if a variable has a "real" value, be explicit. `if (val !== null && val !== undefined)` is safer than `if (val)` which fails for `0` or `""`.

#### Floating Point Math
JavaScript uses IEEE 754 doubles.
-   **The Problem**: `0.1 + 0.2 !== 0.3` (it's actually `0.30000000000000004`).
-   **The Fix**: Use an epsilon for float comparison.
    ```javascript
    const EPSILON = 0.000001;
    if (Math.abs(a - b) < EPSILON) { /* they are equal */ }
    ```

#### The `this` Keyword
The value of `this` depends on *how* a function is called, not where it's defined.
-   **Pitfall**: Passing a class method as a callback loses context.
    ```javascript
    // BAD: 'this' will be undefined or window when called
    window.addEventListener('keydown', player.jump);

    // GOOD: Bind the context
    window.addEventListener('keydown', player.jump.bind(player));
    // OR Use arrow functions
    window.addEventListener('keydown', () => player.jump());
    ```

#### Reference Sharing
Objects and arrays are passed by reference.
-   **Pitfall**: Assigning an object to another variable does *not* copy it. Modifying one modifies both.
    ```javascript
    const config = { speed: 10 };
    const currentLevel = config;
    currentLevel.speed = 20; // 'config.speed' is now also 20!
    // Fix: Use spread syntax to shallow copy
    const currentLevel = { ...config };
    ```

### 6.2. CSS Nuances

#### Stacking Contexts ('z-index' not working)
`z-index` only works on positioned elements, but `transform`, `opacity` < 1, and `filter` create new *Stacking Contexts*.
-   **Gotcha**: An element with `z-index: 100` inside a transformed parent cannot be on top of an element with `z-index: 1` outside that parent. The child is trapped in the parent's stacking context.

#### Performance: Reflow vs. Repaint vs. Composite
-   **Expensive (Reflow)**: Changing `width`, `height`, `left`, `top`, `margin`. Browser has to recalculate layout.
-   **Cheap (Composite)**: Changing `transform` (GPU accelerated), `opacity`.
-   **Rule**: For animations (like moving the player or obstacles), **ALWAYS** use `transform: translate3d(x, y, 0)` instead of `top/left`. This is critical for 60FPS on mobile.
