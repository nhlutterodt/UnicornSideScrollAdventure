# Local Storage Analysis: Early Considerations

**Context**: Implementing game state persistence using `localStorage`.
**Goal**: Ensure data integrity, performance, and future-proofing.

## 1. Key Namespacing (Critical)
`localStorage` is shared by all scripts on the same domain (scheme + hostname + port).
*   **Risk**: Collisions. If you host on Itch.io or GitHub Pages, generic keys like `score` or `save` might be overwritten by other games or previous versions.
*   **Decision**: MUST use a unique, consistent prefix.
    *   *Bad*: `localStorage.setItem('score', 100)`
    *   *Good*: `localStorage.setItem('unicorn_run_v1_score', 100)`

## 2. Loop Performance & Blocking
`localStorage.setItem` is **Synchronous** and disk I/O bound.
*   **Risk**: Saving inside the 60FPS loop (`update()`) will cause stuttering (dropped frames).
*   **Decision**: "Save on Event" Pattern.
    *   Only save when: Level Complete, Game Over, or User Pauses.
    *   **NEVER** save in `update()` or `draw()`.

## 3. Data Integrity & Serialization
`localStorage` stores **Strings** only.
*   **Serialization**: You must `JSON.stringify()` on save and `JSON.parse()` on load.
*   **Risk**: `JSON.stringify` removes functions, `undefined`, and converts `Date` to strings.
*   **Decision**: Ensure your "Save Object" is pure data (POJO).
    ```javascript
    const saveState = {
        score: 1000,
        unlockedItems: ['hat', 'scarf'], // Array OK
        lastPlayed: Date.now() // timestamp (number) better than Date object
    };
    ```

## 4. Quota Limits (~5MB)
Browsers limit storage per origin to roughly 5MB.
*   **Risk**: Storing raw images, huge logs, or binary assets will hit the limit instantly.
*   **Decision**: Store only *State*, not *Assets*.
    *   Store: `{"skinId": "blue_unicorn"}` (20 bytes)
    *   Don't Store: The base64 string of the blue pony image (50KB+)

## 5. Versioning (Future-Proofing)
Games change. You might add new stats later.
*   **Risk**: Loading a save file from v1 when the game is v2 might crash if expected fields are missing.
*   **Decision**: Include a `version` field in the save object.
    ```javascript
    const saveData = {
        version: 1,
        score: 500
    };
    
    // On Load
    if (save.version === 1) {
        // Migration logic if needed
        save.newFeature = false; 
    }
    ```
