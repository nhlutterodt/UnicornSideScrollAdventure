/**
 * INITIALIZATION DIAGNOSTIC SCRIPT
 * Run this in browser console to diagnose game initialization issues
 */

(function GameDiagnostics() {
    console.log('%c=== GAME INITIALIZATION DIAGNOSTICS ===', 'font-size: 16px; font-weight: bold; color: #7afcff');
    
    const results = {
        passed: [],
        failed: [],
        warnings: []
    };
    
    function pass(test) {
        results.passed.push(test);
        console.log('%c✓ ' + test, 'color: #00ff00');
    }
    
    function fail(test, details) {
        results.failed.push({test, details});
        console.error('✗ ' + test, details || '');
    }
    
    function warn(test, details) {
        results.warnings.push({test, details});
        console.warn('⚠ ' + test, details || '');
    }
    
    // TEST 1: DOM Elements
    console.log('\n%c--- DOM Elements ---', 'font-weight: bold');
    
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        pass('Canvas element exists');
        console.log('  Canvas dimensions:', canvas.width, 'x', canvas.height);
    } else {
        fail('Canvas element NOT FOUND', 'Check index.html for #gameCanvas');
    }
    
    const container = document.getElementById('gameContainer');
    if (container) {
        pass('Game container exists');
        console.log('  Container state:', container.dataset.state);
    } else {
        fail('Game container NOT FOUND', 'Check index.html for #gameContainer');
    }
    
    const startButtons = document.querySelectorAll('.js-start-btn');
    if (startButtons.length > 0) {
        pass(`Start buttons found (${startButtons.length})`);
        startButtons.forEach((btn, i) => {
            console.log(`  Button ${i+1}:`, btn.textContent.trim());
        });
    } else {
        fail('Start buttons NOT FOUND', 'Check index.html for .js-start-btn');
    }
    
    // TEST 2: Game Instance
    console.log('\n%c--- Game Instance ---', 'font-weight: bold');
    
    if (typeof window.game !== 'undefined') {
        pass('Game instance exists (window.game)');
        
        if (window.game.state) {
            pass('StateController initialized');
            console.log('  Current state:', window.game.state.current);
        } else {
            fail('StateController missing');
        }
        
        if (window.game.player) {
            pass('Player exists');
            console.log('  Player position:', window.game.player.x, window.game.player.y);
            console.log('  Player lives:', window.game.player.lives);
        } else {
            warn('Player not created yet', 'This is normal before clicking start');
        }
        
        if (window.game.loop) {
            pass('Game loop exists');
            console.log('  Loop running:', window.game.loop.isRunning);
        } else {
            fail('Game loop missing');
        }
        
    } else {
        fail('Game instance NOT FOUND', 'Game should be available as window.game');
    }
    
    // TEST 3: Configuration
    console.log('\n%c--- Configuration ---', 'font-weight: bold');
    
    if (typeof Config !== 'undefined') {
        pass('Config loaded');
        
        if (Config.GRAVITY) {
            pass('Config.GRAVITY defined: ' + Config.GRAVITY);
        } else {
            fail('Config.GRAVITY undefined', 'Config may not be loaded');
        }
        
        if (Config.STAGES && Config.STAGES.length > 0) {
            pass(`Stages loaded (${Config.STAGES.length} stages)`);
        } else {
            fail('Stages not loaded', 'Check Config.loadExternalConfig()');
        }
        
        if (Config.ITEMS && Config.ITEMS.length > 0) {
            pass(`Items loaded (${Config.ITEMS.length} items)`);
        } else {
            warn('Items not loaded');
        }
        
    } else {
        fail('Config NOT FOUND', 'Config should be globally accessible');
    }
    
    // TEST 4: Registry
    console.log('\n%c--- Entity Registry ---', 'font-weight: bold');
    
    if (typeof engineRegistry !== 'undefined') {
        pass('Engine registry exists');
        console.log('  Total entities:', engineRegistry.entities.size);
        
        const entityTypes = {};
        engineRegistry.entities.forEach(entity => {
            entityTypes[entity.entityType] = (entityTypes[entity.entityType] || 0) + 1;
        });
        
        console.log('  Entities by type:', entityTypes);
        
    } else {
        fail('Engine registry NOT FOUND');
    }
    
    // TEST 5: Event System
    console.log('\n%c--- Event System ---', 'font-weight: bold');
    
    if (typeof eventManager !== 'undefined') {
        pass('Event manager exists');
        console.log('  Total listeners:', eventManager.listeners.size);
    } else {
        fail('Event manager NOT FOUND');
    }
    
    // SUMMARY
    console.log('\n%c=== SUMMARY ===', 'font-size: 14px; font-weight: bold');
    console.log('%c✓ Passed: ' + results.passed.length, 'color: #00ff00');
    console.log('%c⚠ Warnings: ' + results.warnings.length, 'color: #ffaa00');
    console.log('%c✗ Failed: ' + results.failed.length, 'color: #ff0000');
    
    if (results.failed.length > 0) {
        console.log('\n%cCritical Issues:', 'font-weight: bold; color: #ff0000');
        results.failed.forEach(({test, details}) => {
            console.log('  •', test);
            if (details) console.log('    →', details);
        });
    }
    
    if (results.warnings.length > 0) {
        console.log('\n%cWarnings:', 'font-weight: bold; color: #ffaa00');
        results.warnings.forEach(({test, details}) => {
            console.log('  •', test);
            if (details) console.log('    →', details);
        });
    }
    
    // MANUAL TESTS
    console.log('\n%c=== MANUAL TESTS ===', 'font-size: 14px; font-weight: bold');
    console.log('Run these commands to test functionality:');
    console.log('');
    console.log('%cgame.start()', 'background: #222; padding: 4px;');
    console.log('  → Force start the game');
    console.log('');
    console.log('%cgame.state.setState("PLAYING")', 'background: #222; padding: 4px;');
    console.log('  → Change state directly');
    console.log('');
    console.log('%cArray.from(engineRegistry.entities.values())', 'background: #222; padding: 4px;');
    console.log('  → List all entities');
    console.log('');
    console.log('%cgame.player', 'background: #222; padding: 4px;');
    console.log('  → Inspect player object');
    console.log('');
    
    return {
        passed: results.passed.length,
        warnings: results.warnings.length,
        failed: results.failed.length,
        details: results
    };
})();
