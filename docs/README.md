# Unicorn Magic Run 🦄

Welcome to **Unicorn Magic Run**, a magical side-scrolling adventure game!

## 🎮 How to Play

1.  **Start the Game**: Click the "Start Adventure" button on the screen.
2.  **Jump**: Press the **Spacebar**, click the mouse, or tap the screen to make the unicorn jump.
3.  **Avoid Obstacles**: Jump over Cacti (🌵) and Crystals (💎) to stay alive.
4.  **Score**: Run as far as you can to increase your score. Every 10 points the game speed increases!

## 🌟 Features

-   **Magical Unicorn**: Play as a unicorn leaving a trail of sparkles.
-   **Dynamic Environment**: Moving clouds and procedural obstacles.
-   **Responsive Design**: Play on desktop or mobile devices.
-   **Score Tracking**: Try to beat your high score!

## � Development & Protocols

-   **[Coding Standards](coding_standards.md)**: Guidelines for HTML, CSS, and JS.
-   **[AI Quality Protocol](ai_quality_protocol.md)**: Deterministic checklist for AI agents to prevent regressions and quality failures.
-   **[Architecture](architecture.md)**: Core engine design and state management.
-   **[Item System Architecture](item_system_architecture.md)**: Details on the decoupled Item and Ability system (Manager Pattern).
## ⚙️ Configuration & Data Management

-   **[Configuration JSON Schemas](config_json_schemas.md)**: Complete reference for editing stages, items, and abilities.
-   **[Data-Driven Design Pattern](data_driven_design_pattern.md)**: Best practices for externalizing game content.
-   **[Config Externalization Lessons Learned](config_externalization_lessons_learned.md)**: Implementation insights and team knowledge.

### Editing Game Content

Game content is now stored in external JSON files for easy editing:

-   **Stages**: `js/config/stages.json` - Level themes, physics, and progression
-   **Items**: `js/config/items.json` - Collectibles, power-ups, and spawn weights
-   **Abilities**: `js/config/abilities.json` - Special abilities and their effects

See [config_json_schemas.md](config_json_schemas.md) for detailed schema documentation and examples.

To play the game locally, simply open `index.html` in your web browser. No compilation or server is required for the basic version, though using a local server (like Live Server in VS Code) is recommended for best performance.
