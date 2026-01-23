# Development Guide

Want to modify the magic? Here is how you can tweak the game.

## Key Constants

All main game tuning variables are located in `js/Config.js`:

```javascript
GRAVITY: 800,           // How fast the unicorn falls (px/s²)
JUMP_FORCE: -450,       // Upward velocity on jump (px/s)
GROUND_HEIGHT: 60,      // Height of the floor from bottom
```

## Adding New Entities

To add a new type of entity (like a new obstacle or background element):

1.  Create a new file in `js/entities/`.
2.  Extend the `Entity` base class from `../core/Entity.js`.
3.  Implement `update(dt)` for movement/logic.
4.  Implement `draw(ctx)` for rendering.

```javascript
import { Entity } from '../core/Entity.js';

export class Ghost extends Entity {
    constructor(x, y) {
        super(x, y, 40, 40, 'ghost');
    }
    
    update(dt) {
        this.x -= 200 * dt; // Move left
    }
    
    draw(ctx) {
        ctx.fillText('👻', this.x, this.y);
    }
}
```

## Styling

-   **`css/variables.css`**: Color palettes and global variables.
-   **`css/game.css`**: Canvas and container styling.
-   **`css/ui.css`**: UI overlays (Start Screen, Game Over).

## Best Practices

-   **Performance**: Avoid heavy computations in the `draw()` loop.
-   **Assets**: Currently using emojis for simplicity. If switching to images, preload them before starting the game loop.
