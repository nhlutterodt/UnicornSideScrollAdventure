# Game.js Refactoring Implementation Plan

**Date:** January 23, 2026  
**Status:** Planning Phase  
**Target Completion:** 3 Weeks  
**Based On:** [game_js_responsibility_analysis.md](game_js_responsibility_analysis.md)

---

## Overview

This document provides a detailed, step-by-step plan to refactor Game.js from 425 lines with 13+ responsibilities down to ~150-180 lines focused solely on high-level coordination. Each phase includes explicit validation checkpoints and quality standards.

**Goals:**
- Reduce Game.js from 425 → ~150-180 lines (65% reduction)
- Extract 7-10 specialized systems/managers
- Maintain 100% functional compatibility
- Improve testability and maintainability
- Zero regression in game behavior

---

## Quality Standards

### Code Quality Requirements

All extracted systems must adhere to these standards:

#### 1. **Single Responsibility Principle**
- Each class/module has ONE clear purpose
- Methods should do ONE thing
- If you can't describe a class in one sentence, it's too complex

#### 2. **Documentation Standards**
```javascript
/**
 * SystemName - Brief description of primary purpose
 * 
 * Responsibilities:
 * - Specific responsibility 1
 * - Specific responsibility 2
 * 
 * Events Emitted:
 * - EVENT_NAME: { payload } - when this happens
 * 
 * Events Consumed:
 * - EVENT_NAME - what it does in response
 * 
 * @example
 * const manager = new SystemName(config);
 * manager.doThing();
 */
```

#### 3. **Error Handling**
- All public methods must validate inputs
- Use logger for errors, not console.log
- Fail gracefully with meaningful error messages
- Use try-catch for operations that can fail

#### 4. **Testing Standards**
- Each extracted system must have unit tests
- Test coverage target: 80% minimum
- Test files named: `SystemName.test.js`
- Test structure:
  - describe() for each public method
  - Test happy path, edge cases, error conditions

#### 5. **Event-Driven Architecture**
- Prefer events over direct coupling
- Event names in SCREAMING_SNAKE_CASE
- Document all events emitted and consumed
- Include payload structure in documentation

#### 6. **Naming Conventions**
- Classes: PascalCase (e.g., `SpawnManager`)
- Methods: camelCase (e.g., `updateScore`)
- Private methods: prefix with underscore (e.g., `_buildContext`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `MAX_SCORE`)
- Files: PascalCase matching class name (e.g., `SpawnManager.js`)

#### 7. **File Organization**
```
js/
  systems/         - Game systems (managers, coordinators)
  utils/           - Pure utility functions (no state)
  core/            - Core engine components
  entities/        - Game entities
  factories/       - Factory classes for entity creation
```

---

## Pre-Refactoring Checklist

### Before Starting Any Work

- [ ] **Backup current codebase** (Git tag: `v1.0-pre-refactor`)
- [ ] **Run existing tests** and document baseline (if tests exist)
- [ ] **Play test the game** - Document current behavior
  - [ ] Can start game
  - [ ] Jump works
  - [ ] Abilities work (collect, use, cycle)
  - [ ] Collisions work (obstacles, items, platforms)
  - [ ] Score increments correctly
  - [ ] Game over triggers correctly
  - [ ] High score saves and loads
  - [ ] UI updates correctly
  - [ ] Resize works
- [ ] **Create feature branch**: `refactor/game-js-extraction`
- [ ] **Set up test infrastructure** if not already present
- [ ] **Review architecture.md** to ensure understanding of current system

---

## Phase 1: Foundation & Low-Risk Extractions
**Duration:** Week 1 (Days 1-5)  
**Goal:** Extract isolated systems with minimal coupling  
**Risk Level:** LOW

### Task 1.1: Extract ScoreManager
**Estimated Time:** 4 hours  
**Files to Create:** `js/systems/ScoreManager.js`  
**Lines Extracted from Game.js:** ~20 lines

#### Implementation Steps

1. **Create ScoreManager.js**
   - Implement constructor with highScore loading
   - Implement `addPoints(points)` method
   - Implement `reset()` method
   - Implement `finalize()` method (returns score data)
   - Implement `getScore()` and `getHighScore()` getters
   - Add event emissions: `SCORE_CHANGED`, `HIGH_SCORE_CHANGED`

2. **Add Documentation**
   - JSDoc for class and all public methods
   - Document event payloads
   - Add usage example

3. **Write Tests** (`js/systems/ScoreManager.test.js`)
   - Test score initialization
   - Test addPoints with various values
   - Test reset functionality
   - Test finalize with/without high score
   - Test event emissions
   - Test highScore persistence

4. **Integrate into Game.js**
   - Replace `this.score` with `this.scoreManager`
   - Replace `this.highScore` with `this.scoreManager.highScore`
   - Update all score references
   - Remove old score-related code from Game.js

#### Validation Checkpoints

- [ ] **Code Review Checklist**
  - [ ] Follows naming conventions
  - [ ] Has complete JSDoc documentation
  - [ ] Events properly documented
  - [ ] No direct DOM manipulation
  - [ ] Uses logger for any logging

- [ ] **Test Validation**
  - [ ] All tests pass
  - [ ] Coverage ≥ 80%
  - [ ] Tests are independent (can run in any order)

- [ ] **Integration Testing**
  - [ ] Game starts without errors
  - [ ] Score increments when passing obstacles
  - [ ] Score displays correctly in UI
  - [ ] High score saves and loads
  - [ ] Game over shows correct final score
  - [ ] High score updates when beaten

- [ ] **Regression Testing**
  - [ ] All pre-refactor features still work
  - [ ] No console errors
  - [ ] Performance unchanged (check FPS)

#### Rollback Plan
If validation fails:
1. Revert commit
2. Document issue in GitHub issue
3. Fix and restart validation

---

### Task 1.2: Extract ViewportManager
**Estimated Time:** 4 hours  
**Files to Create:** `js/systems/ViewportManager.js`  
**Lines Extracted from Game.js:** ~20 lines

#### Implementation Steps

1. **Create ViewportManager.js**
   - Implement constructor (container, canvas, logicalHeight)
   - Implement `resize()` method
   - Implement coordinate transformation methods
     - `toLogical(physicalX, physicalY)`
     - `toPhysical(logicalX, logicalY)`
   - Auto-bind to window resize event
   - Emit `VIEWPORT_CHANGED` event

2. **Add Documentation**
   - Document coordinate systems (logical vs physical)
   - Document all properties (logicalWidth, logicalHeight, scaleRatio)
   - Add diagrams/examples if helpful

3. **Write Tests**
   - Test resize calculations
   - Test coordinate transformations
   - Test event emissions
   - Test edge cases (zero size, extreme aspect ratios)

4. **Integrate into Game.js**
   - Create `this.viewport` in constructor
   - Remove `resize()` method from Game.js
   - Update all references to `this.logicalWidth` → `this.viewport.logicalWidth`
   - Update all references to `this.scaleRatio` → `this.viewport.scaleRatio`
   - Remove window resize listener from Game.js

#### Validation Checkpoints

- [ ] **Code Review Checklist**
  - [ ] Coordinate transformation logic correct
  - [ ] No memory leaks (event listeners cleaned up)
  - [ ] Edge cases handled (zero dimensions)

- [ ] **Test Validation**
  - [ ] All tests pass
  - [ ] Coordinate transformations verified mathematically
  - [ ] Coverage ≥ 80%

- [ ] **Integration Testing**
  - [ ] Game renders at correct scale
  - [ ] Window resize updates viewport correctly
  - [ ] No visual glitches during resize
  - [ ] Player stays grounded during resize (if not playing)
  - [ ] Test multiple aspect ratios (4:3, 16:9, 21:9, mobile)

- [ ] **Visual Regression Testing**
  - [ ] Screenshot comparison before/after
  - [ ] Elements positioned identically

---

### Task 1.3: Create Player Factory Pattern
**Estimated Time:** 2 hours  
**Files to Create:** `js/factories/PlayerFactory.js`  
**Lines Extracted from Game.js:** ~10 lines

#### Implementation Steps

1. **Create PlayerFactory.js**
   - Implement static `create()` method
   - Implement static `getDefaultOutfit()` method
   - Load outfit from Storage
   - Configure player callbacks (onGameOver)
   - Return configured Player instance

2. **Add Documentation**
   - Document factory pattern reasoning
   - Document default outfit structure

3. **Write Tests**
   - Test player creation with default outfit
   - Test player creation with custom outfit
   - Test outfit loading from storage
   - Test callback configuration

4. **Integrate into Game.js**
   - Replace player creation code in `resetInternalState()`
   - Use `PlayerFactory.create()`
   - Handle onGameOver callback through events

#### Validation Checkpoints

- [ ] **Code Review Checklist**
  - [ ] Factory pattern correctly implemented
  - [ ] No tight coupling to Game.js

- [ ] **Test Validation**
  - [ ] All tests pass
  - [ ] Coverage ≥ 80%

- [ ] **Integration Testing**
  - [ ] Player loads with correct outfit
  - [ ] Customization system still works
  - [ ] Player initializes with correct stats

---

### Task 1.4: Phase 1 Integration Testing
**Estimated Time:** 2 hours

#### Complete System Validation

- [ ] **Run Full Test Suite**
  - [ ] All unit tests pass
  - [ ] No test failures or warnings
  - [ ] Coverage report generated

- [ ] **Comprehensive Play Testing**
  - [ ] Complete 3 full game sessions
  - [ ] Test all abilities
  - [ ] Test game over and restart
  - [ ] Test score persistence across sessions
  - [ ] Test window resize during gameplay
  - [ ] Test on different screen sizes

- [ ] **Code Quality Check**
  - [ ] Run standard-checker.js (if exists)
  - [ ] No ESLint warnings
  - [ ] All new files follow standards

- [ ] **Performance Testing**
  - [ ] FPS unchanged from baseline
  - [ ] No memory leaks (Chrome DevTools)
  - [ ] Smooth rendering during resize

- [ ] **Documentation Updated**
  - [ ] architecture.md updated with new systems
  - [ ] README updated if necessary

---

## Phase 2: Core System Extractions
**Duration:** Week 2 (Days 6-10)  
**Goal:** Extract major systems (spawn, render, UI, input)  
**Risk Level:** MEDIUM-HIGH

### Task 2.1: Extract SpawnManager
**Estimated Time:** 8 hours  
**Files to Create:** `js/systems/SpawnManager.js`  
**Lines Extracted from Game.js:** ~60 lines

#### Implementation Steps

1. **Create Base Architecture**
   - Create `SpawnManager` class
   - Create `EntitySpawner` base class
   - Create specialized spawners:
     - `ObstacleSpawner`
     - `PlatformSpawner`
     - `CloudSpawner`
     - `ItemSpawner`
     - `TrailParticleSpawner`

2. **Implement SpawnManager**
   - Constructor accepts configuration
   - Manages collection of spawners
   - Implements `update(dt, context)` method
   - Implements `reset()` method
   - Implements `setSpawnInterval(interval)` method (sync with level system)

3. **Implement EntitySpawner Base**
   - Timer management
   - Abstract `spawn(context)` method
   - Configurable intervals
   - Enable/disable functionality

4. **Implement Specialized Spawners**
   - **ObstacleSpawner**: Spawns obstacles at screen edge
   - **PlatformSpawner**: Platform logic with probability
   - **CloudSpawner**: Background cloud spawning
   - **ItemSpawner**: Uses LevelUtils for random items
   - **TrailParticleSpawner**: Player trail particles

5. **Add Documentation**
   - Document spawner architecture
   - Document how to add new spawner types
   - Document spawn timing and intervals

6. **Write Tests**
   - Test each spawner independently
   - Test SpawnManager coordination
   - Test interval changes (level scaling)
   - Test reset functionality
   - Mock entity creation

7. **Integrate into Game.js**
   - Create `this.spawn = new SpawnManager(config)`
   - Remove all spawn timers from Game.js
   - Remove spawn logic from `update()`
   - Call `this.spawn.update(dt, context)` in update loop
   - Sync spawn intervals with level system

#### Validation Checkpoints

- [ ] **Code Review Checklist**
  - [ ] Spawner architecture is extensible
  - [ ] No hardcoded entity types in base classes
  - [ ] Configuration-driven where possible
  - [ ] Proper abstraction between base and specialized spawners

- [ ] **Test Validation**
  - [ ] All spawner tests pass
  - [ ] Mock verification confirms entity creation
  - [ ] Timing tests verify interval accuracy
  - [ ] Coverage ≥ 80%

- [ ] **Integration Testing**
  - [ ] Obstacles spawn at correct intervals
  - [ ] Platforms spawn with correct probability
  - [ ] Clouds appear in background
  - [ ] Items spawn correctly
  - [ ] Trail particles render
  - [ ] Spawn intervals increase with level
  - [ ] No spawn after game over

- [ ] **Performance Testing**
  - [ ] No FPS drop
  - [ ] Entity count stays within bounds
  - [ ] No memory accumulation over time

---

### Task 2.2: Extract RenderSystem
**Estimated Time:** 8 hours  
**Files to Create:** `js/systems/RenderSystem.js`  
**Lines Extracted from Game.js:** ~45 lines

#### Implementation Steps

1. **Create RenderSystem.js**
   - Constructor accepts canvas and context
   - Implement render layer system
   - Implement `render(context)` method
   - Implement individual layer renderers:
     - `renderBackground(context)`
     - `renderGround(context)`
     - `renderEnvironment(context)` (scrolling elements)
   - Implement `setScale(scaleRatio, logicalWidth)` method
   - Listen to `VIEWPORT_CHANGED` event

2. **Configure Render Layers**
   - Define layer order array
   - Make layers configurable
   - Support layer enable/disable

3. **Extract Ground Rendering**
   - Move ground theme rendering from Game.js
   - Use stage theme data

4. **Extract Environment Rendering**
   - Move `drawEnvironment()` logic from Game.js
   - Scrolling flower/element system

5. **Add Documentation**
   - Document render layer system
   - Document how to add custom layers
   - Document performance considerations

6. **Write Tests**
   - Test layer ordering
   - Test canvas operations
   - Test scaling calculations
   - Mock canvas context for testing

7. **Integrate into Game.js**
   - Create `this.render = new RenderSystem(canvas, ctx)`
   - Replace `draw()` implementation with `this.render.render(context)`
   - Remove ground and environment rendering from Game.js
   - Remove `drawEnvironment()` method
   - Build and pass draw context to render system

#### Validation Checkpoints

- [ ] **Code Review Checklist**
  - [ ] Render order preserved
  - [ ] No direct entity references in RenderSystem
  - [ ] Clean separation between render and game logic
  - [ ] Canvas context properly managed (save/restore)

- [ ] **Test Validation**
  - [ ] All render tests pass
  - [ ] Mock context calls verified
  - [ ] Coverage ≥ 70% (rendering harder to test)

- [ ] **Integration Testing**
  - [ ] All entities render correctly
  - [ ] Ground renders with correct theme
  - [ ] Environment scrolls correctly
  - [ ] Particles and effects visible
  - [ ] Layer order correct (clouds behind, player in front)
  - [ ] Scaling works correctly

- [ ] **Visual Regression Testing**
  - [ ] Screenshot comparison before/after
  - [ ] Record video of gameplay for comparison
  - [ ] Check multiple screen sizes
  - [ ] Verify theme transitions

---

### Task 2.3: Extract UIManager
**Estimated Time:** 6 hours  
**Files to Create:** `js/systems/UIManager.js`  
**Lines Extracted from Game.js:** ~70 lines

#### Implementation Steps

1. **Create UIManager.js**
   - Constructor accepts DOM element references
   - Implement `updateScore(score)` method
   - Implement `updateLives(lives)` method
   - Implement `updateHighScore(highScore)` method
   - Implement `updateAbilityInventory(abilities, currentIndex)` method
   - Implement `showGameOver(scoreData)` method
   - Set up event listeners for game events

2. **Extract Ability UI Logic**
   - Move complex DOM construction from `updateAbilityUI()`
   - Create ability card generation logic
   - Handle active/inactive states
   - Display remaining time/uses

3. **Event-Driven Updates**
   - Listen to `SCORE_CHANGED` event
   - Listen to `LIFE_CHANGED` event
   - Listen to `HIGH_SCORE_CHANGED` event
   - Listen to `ABILITIES_CHANGED` event
   - Listen to `GAME_OVER` event

4. **Add Documentation**
   - Document all UI update methods
   - Document event dependencies
   - Document DOM structure requirements

5. **Write Tests**
   - Test DOM element updates
   - Mock DOM elements for testing
   - Test event listener setup
   - Test ability card generation

6. **Integrate into Game.js**
   - Create `this.ui = new UIManager(elements)`
   - Remove all `updateXXXUI()` methods from Game.js
   - Remove DOM element references from Game.js
   - Ensure events are emitted correctly from other systems

7. **Update Event Emitters**
   - ScoreManager emits `SCORE_CHANGED`
   - Player emits `LIFE_CHANGED`
   - AbilityManager emits `ABILITIES_CHANGED`
   - Game emits `GAME_OVER`

#### Validation Checkpoints

- [ ] **Code Review Checklist**
  - [ ] No game logic in UIManager (pure presentation)
  - [ ] DOM manipulation is safe (null checks)
  - [ ] Event listeners properly documented
  - [ ] No memory leaks from event listeners

- [ ] **Test Validation**
  - [ ] All UI tests pass
  - [ ] DOM updates verified
  - [ ] Coverage ≥ 80%

- [ ] **Integration Testing**
  - [ ] Score updates in real-time
  - [ ] Lives display updates correctly
  - [ ] High score displays correctly
  - [ ] Ability inventory shows correct abilities
  - [ ] Active ability highlighted
  - [ ] Ability info (time/uses) displays correctly
  - [ ] Game over screen shows correct score

- [ ] **UI Testing**
  - [ ] Test on different browsers
  - [ ] Test with missing DOM elements (graceful degradation)
  - [ ] Test rapid updates (no flicker)

---

### Task 2.4: Extract GameInputHandler
**Estimated Time:** 4 hours  
**Files to Create:** `js/systems/GameInputHandler.js`  
**Lines Extracted from Game.js:** ~30 lines

#### Implementation Steps

1. **Create GameInputHandler.js**
   - Constructor accepts dependencies (input, state, player getter)
   - Implement `bindHandlers()` method
   - Implement handler methods:
     - `handleJump()`
     - `handleUseAbility()`
     - `handleCycleAbility(direction)`
   - Implement `isPlaying()` helper
   - Implement `updatePlayer(player)` method (for player reference updates)

2. **Add Documentation**
   - Document input command handling
   - Document state dependencies
   - Document player interaction patterns

3. **Write Tests**
   - Test each handler independently
   - Test state checking (only works when playing)
   - Mock player and input manager
   - Test event emissions

4. **Integrate into Game.js**
   - Create `this.inputHandler = new GameInputHandler(...)`
   - Remove input handler setup from `init()`
   - Update player reference in inputHandler after creation
   - Ensure particle and effect systems accessible

#### Validation Checkpoints

- [ ] **Code Review Checklist**
  - [ ] Input handlers properly isolated
  - [ ] State checks consistent
  - [ ] No direct coupling to Game.js

- [ ] **Test Validation**
  - [ ] All handler tests pass
  - [ ] State checking works correctly
  - [ ] Coverage ≥ 80%

- [ ] **Integration Testing**
  - [ ] Jump works (Space, Touch, Click)
  - [ ] Ability use works (E key)
  - [ ] Ability cycling works (Q/R keys)
  - [ ] Inputs ignored when not playing
  - [ ] Particle effects still trigger on jump

---

### Task 2.5: Phase 2 Integration Testing
**Estimated Time:** 4 hours

#### Complete System Validation

- [ ] **Run Full Test Suite**
  - [ ] All unit tests pass
  - [ ] Integration tests pass
  - [ ] No test failures or warnings

- [ ] **Comprehensive Play Testing**
  - [ ] Play 5 complete game sessions
  - [ ] Test every feature systematically
  - [ ] Document any behavioral differences
  - [ ] Test edge cases (rapid input, resize during play, etc.)

- [ ] **Visual Comparison**
  - [ ] Side-by-side video comparison (before/after)
  - [ ] Verify identical visual output
  - [ ] Check UI updates timing

- [ ] **Performance Testing**
  - [ ] FPS measurement (should be identical)
  - [ ] Memory profiling (no leaks)
  - [ ] CPU usage comparison
  - [ ] Test for 10+ minutes continuous play

- [ ] **Code Quality Check**
  - [ ] Run all linters
  - [ ] Check for TODOs or FIXMEs
  - [ ] Verify all new files follow standards

---

## Phase 3: Final Cleanup & Polish
**Duration:** Week 3 (Days 11-15)  
**Goal:** Final optimizations, documentation, and testing  
**Risk Level:** LOW

### Task 3.1: Create EnvironmentInitializer
**Estimated Time:** 2 hours  
**Files to Create:** `js/utils/EnvironmentInitializer.js`  
**Lines Extracted from Game.js:** ~5 lines

#### Implementation Steps

1. **Create EnvironmentInitializer.js**
   - Static utility class
   - Implement `initialize(logicalWidth, logicalHeight, config)`
   - Implement `spawnInitialClouds(width, height, count)`
   - Make cloud count configurable via Config

2. **Add Documentation**
   - Document initial environment setup
   - Document configuration options

3. **Write Tests**
   - Test cloud spawning
   - Verify correct positioning

4. **Integrate into Game.js**
   - Call in `resetInternalState()` or `start()`
   - Remove inline cloud spawning loop

#### Validation Checkpoints

- [ ] Clouds spawn correctly at game start
- [ ] Configurable through Config.js
- [ ] Tests pass

---

### Task 3.2: Optimize Context Building
**Estimated Time:** 2 hours  
**Files to Create:** `js/utils/GameContext.js` (optional)

#### Implementation Steps

1. **Analyze Context Usage**
   - Document what each system needs from context
   - Identify opportunities for optimization
   - Consider creating GameContext helper class

2. **Implement Context Builder** (if beneficial)
   - Create reusable context builder
   - Reduce redundant object creation
   - Cache unchanging references

3. **Refactor Game.js**
   - Simplify `buildContext()` method
   - Reduce inline object creation

#### Validation Checkpoints

- [ ] Context building is cleaner
- [ ] No performance regression
- [ ] All systems receive correct context

---

### Task 3.3: Move Theme Application
**Estimated Time:** 2 hours

#### Implementation Steps

1. **Analyze Best Location**
   - Decide: RenderSystem, UIManager, or ThemeManager
   - Consider: Does it affect rendering or UI only?

2. **Move applyStageTheme()**
   - Extract from Game.js
   - Move to chosen system
   - Update event listener

3. **Test Integration**
   - Verify theme changes work
   - Verify particle effects trigger
   - Verify CSS variables update

#### Validation Checkpoints

- [ ] Themes apply correctly
- [ ] Visual transitions work
- [ ] No broken stage changes

---

### Task 3.4: Extract Remaining Event Handlers
**Estimated Time:** 2 hours

#### Implementation Steps

1. **Review setupEvents()**
   - Move LEVEL_UP handler to appropriate system
   - Move STAGE_CHANGED handler (already moved with theme)
   - Move ABILITY_APPLIED handler to UIManager
   - Move LIFE_CHANGED handler to UIManager

2. **Clean Up Game.js**
   - Minimize setupEvents() method
   - Only keep high-level coordination events

#### Validation Checkpoints

- [ ] Event handlers in appropriate systems
- [ ] All events still trigger correctly
- [ ] Game.js setupEvents() is minimal

---

### Task 3.5: Final Game.js Cleanup
**Estimated Time:** 3 hours

#### Implementation Steps

1. **Review Game.js Line by Line**
   - Remove commented-out code
   - Simplify constructor
   - Simplify init()
   - Ensure update() is clean
   - Ensure draw() is minimal

2. **Optimize Method Structure**
   - Group related methods
   - Add clear section comments
   - Ensure logical flow

3. **Verify Responsibilities**
   - Game.js should ONLY:
     - Initialize systems
     - Coordinate high-level updates
     - Manage game state transitions
     - Build context for systems
   - Everything else should be extracted

#### Target Structure Verification

```javascript
export class Game {
    constructor() {
        // Initialize all systems (20-30 lines)
    }

    init() {
        // Setup buttons and start loop (5-10 lines)
    }

    start() {
        // Reset systems and start playing (5-10 lines)
    }

    gameOver() {
        // Handle game over (5-10 lines)
    }

    update(dt) {
        // Coordinate system updates (20-30 lines)
    }

    draw() {
        // Delegate to render system (3-5 lines)
    }

    buildContext() {
        // Build context object (15-20 lines)
    }

    buildDrawContext() {
        // Build draw context (10-15 lines)
    }
}
```

**Target Total: 150-180 lines**

---

### Task 3.6: Comprehensive Documentation Update
**Estimated Time:** 4 hours

#### Documentation Tasks

1. **Update architecture.md**
   - Document all new systems
   - Update system interaction diagrams
   - Document event flow
   - Update component descriptions

2. **Create System Documentation**
   - Document each new system separately
   - Include usage examples
   - Include configuration options
   - Include testing approach

3. **Update README.md**
   - Update project structure
   - Update any relevant sections

4. **Create Migration Guide**
   - Document what changed
   - Document for future developers
   - Include before/after comparisons

#### Validation Checkpoints

- [ ] All new systems documented
- [ ] architecture.md reflects current state
- [ ] Documentation is clear and accurate
- [ ] Code examples are tested

---

### Task 3.7: Comprehensive Testing & Quality Assurance
**Estimated Time:** 8 hours

#### Testing Phases

**Phase A: Automated Testing**
- [ ] Run complete test suite
- [ ] Verify 80%+ coverage for new systems
- [ ] All tests pass
- [ ] No flaky tests
- [ ] Performance tests pass

**Phase B: Manual Play Testing**
- [ ] Play test for 30 minutes continuously
- [ ] Test every feature:
  - [ ] Game start/restart
  - [ ] Jump mechanics
  - [ ] Platform jumping
  - [ ] Obstacle collision
  - [ ] Item collection (all types)
  - [ ] Ability usage (all abilities)
  - [ ] Ability cycling
  - [ ] Score tracking
  - [ ] High score saving
  - [ ] Lives system
  - [ ] Level progression
  - [ ] Stage changes
  - [ ] Theme transitions
  - [ ] UI updates
  - [ ] Game over screen
- [ ] Test on multiple devices:
  - [ ] Desktop (Windows)
  - [ ] Desktop (Mac if available)
  - [ ] Tablet
  - [ ] Mobile phone
- [ ] Test on multiple browsers:
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Edge
  - [ ] Safari (if available)
- [ ] Test edge cases:
  - [ ] Window resize during play
  - [ ] Rapid input
  - [ ] Tab switching (pause/resume)
  - [ ] Multiple rapid restarts

**Phase C: Performance Testing**
- [ ] Measure FPS (should be 60fps)
- [ ] Memory profiling (no leaks over 10 min)
- [ ] CPU usage acceptable
- [ ] No dropped frames
- [ ] Smooth animations

**Phase D: Code Quality Audit**
- [ ] Run ESLint (zero errors)
- [ ] Run standard-checker.js
- [ ] Review all new files for standards compliance
- [ ] No console.log statements (use logger)
- [ ] No TODOs or FIXMEs left
- [ ] No commented-out code
- [ ] Consistent formatting

**Phase E: Regression Testing**
- [ ] Compare with pre-refactor video recording
- [ ] Verify identical gameplay experience
- [ ] Verify identical visual output
- [ ] Verify identical performance

---

### Task 3.8: Final Review & Sign-off
**Estimated Time:** 2 hours

#### Final Checklist

- [ ] **Code Metrics**
  - [ ] Game.js reduced from 425 → ~150-180 lines
  - [ ] 7-10 new systems created
  - [ ] Test coverage ≥ 80% for new systems
  - [ ] Zero regressions

- [ ] **Documentation Complete**
  - [ ] All systems documented
  - [ ] architecture.md updated
  - [ ] Migration guide created
  - [ ] README updated

- [ ] **Quality Standards Met**
  - [ ] All code follows standards
  - [ ] All tests pass
  - [ ] No linter errors
  - [ ] No console errors

- [ ] **Stakeholder Review**
  - [ ] Code review completed
  - [ ] Play testing by others
  - [ ] Feedback incorporated

- [ ] **Prepare for Merge**
  - [ ] Squash/organize commits if needed
  - [ ] Write comprehensive PR description
  - [ ] Tag release candidate
  - [ ] Schedule merge

---

## Success Criteria

### Quantitative Metrics

| Metric | Before | Target | Actual |
|--------|--------|--------|--------|
| Game.js Line Count | 425 | 150-180 | ___ |
| Game.js Method Count | 12 | 6-8 | ___ |
| Systems Extracted | 0 | 7-10 | ___ |
| Test Coverage | ___% | 80%+ | ___% |
| FPS (Desktop) | 60 | 60 | ___ |
| Load Time | ___ms | ≤ ___ms | ___ms |

### Qualitative Metrics

- [ ] Code is more maintainable
- [ ] Systems are independently testable
- [ ] New developers can understand architecture
- [ ] Easy to add new features
- [ ] Clear separation of concerns
- [ ] Event-driven architecture working well

---

## Risk Management

### Identified Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking gameplay | Medium | High | Comprehensive testing at each phase |
| Performance degradation | Low | Medium | Performance testing after each extraction |
| Event system bugs | Low | Medium | Test event emissions thoroughly |
| Context passing errors | Low | High | Validate context structure carefully |
| Merge conflicts | Medium | Low | Frequent commits, clear branch strategy |
| Test maintenance burden | Medium | Medium | Write maintainable, clear tests |

### Rollback Procedures

**If Critical Issue Found:**
1. Immediately stop work on current task
2. Document the issue in GitHub
3. Revert to last known good state
4. Analyze root cause
5. Update plan if needed
6. Resume work

**If Multiple Issues Found:**
1. Consider rolling back entire phase
2. Re-evaluate approach
3. Consult team
4. Update plan based on learnings

---

## Communication Plan

### Progress Updates

**Daily Standup:**
- What was completed yesterday
- What will be completed today
- Any blockers

**Phase Completion:**
- Demo working system
- Review metrics
- Get approval to proceed

**Issues Found:**
- Immediately communicate
- Don't hide problems
- Collaborate on solutions

### Documentation of Changes

**Git Commits:**
- Clear, descriptive commit messages
- Reference task numbers
- One logical change per commit

**Pull Requests:**
- Detailed description
- Before/after comparison
- Test results
- Screenshots/videos if applicable

---

## Post-Refactoring Activities

### After Merge

1. **Monitor Production** (if applicable)
   - Watch for errors
   - Monitor performance
   - Gather user feedback

2. **Retrospective**
   - What went well
   - What could be improved
   - Lessons learned
   - Update this plan for future refactorings

3. **Knowledge Transfer**
   - Present new architecture to team
   - Create video walkthrough if helpful
   - Answer questions

4. **Plan Next Improvements**
   - Identify further refactoring opportunities
   - Prioritize based on impact
   - Schedule future work

---

## Appendix

### Tools & Resources

**Testing:**
- Jest or similar test framework
- Chrome DevTools for performance
- Browser DevTools for visual testing

**Code Quality:**
- ESLint for linting
- Prettier for formatting (if used)
- standard-checker.js (project-specific)

**Documentation:**
- JSDoc for inline documentation
- Markdown for architecture docs

**Version Control:**
- Git for version control
- GitHub for collaboration

### Reference Documents

- [game_js_responsibility_analysis.md](game_js_responsibility_analysis.md) - Detailed analysis
- [architecture.md](architecture.md) - Current architecture
- [coding_standards.md](coding_standards.md) - Code standards
- [js_enforcement.md](js_enforcement.md) - JS-specific standards

---

## Sign-off

### Phase 1 Completion
- [ ] **Developer:** _______________ Date: ___________
- [ ] **Reviewer:** _______________ Date: ___________

### Phase 2 Completion
- [ ] **Developer:** _______________ Date: ___________
- [ ] **Reviewer:** _______________ Date: ___________

### Phase 3 Completion
- [ ] **Developer:** _______________ Date: ___________
- [ ] **Reviewer:** _______________ Date: ___________

### Final Sign-off
- [ ] **Project Lead:** _______________ Date: ___________
- [ ] **QA:** _______________ Date: ___________

---

**Document Version:** 1.0  
**Last Updated:** January 23, 2026  
**Status:** Ready for Implementation
