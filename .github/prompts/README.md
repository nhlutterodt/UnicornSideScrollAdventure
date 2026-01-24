# Prompt Directory - Unicorn Magic Run

Specialized guidance documents for AI coding agents working on this game project.

## Core Development Guides

- **[performance.md](performance.md)** - Performance-first game development patterns
  - Memory management, object pooling, GC optimization
  - Canvas rendering optimization
  - Profiling techniques
  
- **[entity-template.md](entity-template.md)** - Quick entity creation template
  - Complete boilerplate for new game objects
  - Collision setup patterns
  - Common entity behaviors
  
- **[game-balance.md](game-balance.md)** - Tuning gameplay feel
  - Physics modifiers (gravity, friction, bounciness)
  - Spawn rate configuration
  - Difficulty curve design
  
- **[visual-effects.md](visual-effects.md)** - Particle effect recipes
  - Trail, explosion, pickup, impact effects
  - Performance-optimized particle usage
  - Color palettes and animation patterns
  
- **[debugging.md](debugging.md)** - Game-specific debugging techniques
  - Visual debug overlays
  - Console inspection commands
  - Performance profiling

- **[events.md](events.md)** - Event-driven cross-system communication
  - EventManager patterns
  - Event naming conventions
  - Real-world event flow examples

- **[troubleshooting.md](troubleshooting.md)** - Common pitfalls and quick fixes
  - Entity not rendering
  - Collision not detected
  - Config changes not applying
  - Performance issues

## Task-Specific Templates

Located in `tasks/` subdirectory:

- **[create-entity.md](tasks/create-entity.md)** - Complete checklist for adding new entity types
- **[add-stage.md](tasks/add-stage.md)** - Add themed levels with physics and visual config
- **[debug-collision.md](tasks/debug-collision.md)** - Step-by-step collision debugging guide

## How to Use These Prompts

### For AI Agents

When tasked with specific work:

1. **Read relevant prompt first** before writing code
2. **Follow patterns exactly** - they're battle-tested
3. **Reference examples** from existing codebase
4. **Run quality checks** as specified in each guide

### For Developers

Use these as:
- **Reference documentation** for project patterns
- **Onboarding material** for new contributors
- **Design patterns** to maintain consistency
- **Troubleshooting guides** when stuck

## Prompt Usage by Task Type

| Task | Primary Prompts | Related Docs |
|------|----------------|--------------|
| Add new entity | entity-template.md, create-entity.md | troubleshooting.md |
| Fix collision | debug-collision.md, troubleshooting.md | architecture.md |
| Add level/stage | add-stage.md, game-balance.md | config_json_schemas.md |
| Performance issue | performance.md, debugging.md | coding_standards.md |
| Visual effect | visual-effects.md | - |
| System integration | events.md | item_system_architecture.md |

## Quick Command Reference

```bash
# Quality checks (ALWAYS run before commit)
npm test

# View all entities
console: gameEntities

# Enable debug visualizations
Config.DEBUG = true

# Profile performance
Chrome DevTools → Performance tab → Record
```

## Contributing New Prompts

When adding new specialized guides:

1. Follow existing format (H1 title, clear sections, code examples)
2. Include "Common Mistakes" section
3. Provide runnable code snippets
4. Reference specific project files
5. Add checklist at end
6. Update this README with link

## Feedback

Found an issue with a prompt? Have suggestions?
- Check if example code actually works in current codebase
- Verify patterns match [docs/coding_standards.md](../../docs/coding_standards.md)
- Update with lessons learned from real development

---

**Remember**: These prompts encode hard-won project knowledge. Follow them to avoid repeating past mistakes and maintain code quality.
