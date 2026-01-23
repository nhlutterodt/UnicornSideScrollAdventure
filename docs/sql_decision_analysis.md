# SQL for Unicorn Magic Run: A Decision Analysis

**Status**: Analysis Complete
**Date**: 2026-01-22
**Context**: Moving from stateless/variables to "Local SQL".

## 1. Executive Summary
Implementing SQL for *Unicorn Magic Run* transforms the game from a transient experience (scores lost on refresh) to a persistent application. However, "Local SQL" in a browser context is a non-trivial architectural decision that drastically increases complexity compared to simpler persistence methods (like `localStorage`).

**Recommendation**: Use **sql.js (WASM)** or **IndexedDB** if the goal is learning database concepts. If the goal is simply "High Scores", standard `localStorage` is 100x simpler.

---

## 2. Technical Options for "Local SQL"

### Option A: In-Browser SQL (WASM)
Using libraries like **sql.js** (SQLite compiled to WebAssembly) or **wa-sqlite**.
*   **Pros**: Real SQL syntax (`SELECT`, `INSERT`), relational data models, runs entirely client-side.
*   **Cons**: 
    *   **Async Complexity**: All DB operations are asynchronous. You must refactor synchronous game logic.
    *   **Persistence Issues**: `sql.js` runs in memory. You still need to manually save the binary binary blob to `localStorage` or IndexedDB to survive a page refresh.
    *   **Overhead**: ~1MB+ download for the WASM binary.

### Option B: Local Backend (Node + SQLite)
Running a separate Node.js server connecting to a real `database.sqlite` file.
*   **Pros**: Standard industry architecture, data persists permanently on disk.
*   **Cons**:
    *   **Deployment**: Valid ONLY for local dev. You cannot check in a running server to GitHub Pages/Itch.io.
    *   **Network Latency**: Game must now handle HTTP/Fetch calls.

### Option C: The "Right Tool" Alternative (localStorage)
*   **Pros**: Key-Value pair, synchronous, built-in, 0 latency.
*   **Cons**: Not relational (no SQL).

---

## 3. Impact Analysis

### 3.1. Architecture Shift (Sync -> Async)
Currently, `score` is a variable updated instantly.
```javascript
// Current (Sync)
score++;
ui.update(score);

// With SQL (Async)
async function updateScore(newScore) {
    await db.run("INSERT INTO scores (val) VALUES (?)", [newScore]);
    const avg = await db.get("SELECT AVG(val) FROM scores"); // Async read
    ui.update(avg);
}
```
**Risk**: Frame drops if DB operations are awaited inside the 60FPS Game Loop. DB usage must be decoupled from the `update()` loop.

### 3.2. Data Serialization
*   **Game State**: JSON is natural for JS. SQL requires flattening objects into tables/rows.
*   **Schema**: You must define tables (`CREATE TABLE users...`). Changing this later requires **Migrations**.

### 3.3. Complexity Cost
| Feature | JS Variables | LocalStorage | SQLite (WASM) |
| :--- | :--- | :--- | :--- |
| **Setup** | 0 overhead | 0 overhead | High (Loader, Init) |
| **Persistence**| None (RAM) | Browser Cache | Manual File IO |
| **Querying** | Array.filter() | JSON.parse() | SQL Queries |
| **Relations** | References | Hard/Manual | Native (JOINs) |

---

## 4. Conclusion & Decision
If you proceed with **Local SQL**, you are accepting a significant architectural refactor for the educational benefit of using SQL.

**What you must prepare for:**
1.  **Event-Driven Data**: The UI cannot simply read `player.score` anymore; it must react to DB promises resolving.
2.  **Mocking/Testing**: It becomes harder to test game logic in isolation.
3.  **Loading States**: The game cannot start until the DB initializes (WASM compile time).

**Verdict**: Proceed only if *Learning SQL* is the primary objective.
