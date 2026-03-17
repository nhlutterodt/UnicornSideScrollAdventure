import { Storage } from './systems/Storage.js';
import { logger } from './utils/Logger.js';

export function initLevelStudio() {
    logger.info('LevelStudio', 'Level Studio Initialized');

    // -- State --
    const state = {
        bg: 'day',
        terrain: 'grass',
        obstacle: 'rock',
        collectible: 'star',
        surface: 'normal',
        effect: 'none',
        flora: 'none',
        sky: 'clouds',
        pace: 'normal'
    };

    // -- DOM Elements --
    const previewBg = document.getElementById('previewBg');
    const previewGround = document.querySelector('#previewGround path');
    const previewObstacles = document.getElementById('previewObstacles');
    const previewCollectibles = document.getElementById('previewCollectibles');

    // -- Config / Assets --
    const backgrounds = {
        day: 'url(#bg-day)',
        night: 'url(#bg-night)',
        sunset: 'url(#bg-sunset)'
    };

    const terrains = {
        grass: '#4CAF50',
        stone: '#795548',
        candy: '#E91E63'
    };

    const obstacles = {
        rock: `<path d="M0,20 L20,0 L40,20 Z" fill="#5D4037" transform="scale(1.5)" />`,
        crystal: `<path d="M10,0 L20,15 L10,30 L0,15 Z" fill="#00BCD4" opacity="0.8" transform="scale(1.5)" />`,
        spike: `<path d="M0,30 L10,0 L20,30 M20,30 L30,0 L40,30" stroke="#333" stroke-width="2" fill="#BDBDBD" />`
    };

    const collectibles = {
        star: `<polygon points="20,0 25,12 38,12 28,20 31,32 20,25 9,32 12,20 2,12 15,12" fill="gold" />`,
        gem: `<path d="M10,0 L30,0 L40,15 L20,40 L0,15 Z" fill="#9C27B0" />`,
        heart: `<path d="M20,35 L5,20 Q0,10 10,5 Q20,10 20,15 Q20,10 30,5 Q40,10 35,20 Z" fill="#F44336" />`
    };

    // -- Functions --

    function updatePreview() {
        // Background
        previewBg.setAttribute('fill', backgrounds[state.bg]);

        // Sky Elements
        const previewDistant = document.getElementById('previewDistant');
        previewDistant.innerHTML = '';
        if (state.sky === 'clouds') {
            previewDistant.innerHTML = `
                <circle cx="50" cy="50" r="20" fill="white" />
                <circle cx="80" cy="50" r="25" fill="white" />
                <circle cx="110" cy="50" r="20" fill="white" />
            `;
        } else if (state.sky === 'stars') {
            for(let i=0; i<5; i++) {
                previewDistant.innerHTML += `<circle cx="${Math.random()*400}" cy="${Math.random()*150}" r="2" fill="white" opacity="${Math.random()}"/>`;
            }
        } else if (state.sky === 'dragons') {
            previewDistant.innerHTML = `<path d="M50,50 Q100,0 150,50 L100,60 Z" fill="#4A148C" opacity="0.8" />`;
        }

        // Terrain
        previewGround.setAttribute('fill', terrains[state.terrain]);
        // Visual indicator for surface
        if (state.surface === 'slippery') {
             previewGround.setAttribute('opacity', '0.7');
        } else {
             previewGround.setAttribute('opacity', '1');
        }

        // Obstacles (Render 2 obstacles for preview)
        previewObstacles.innerHTML = '';
        const obs1 = document.createElementNS("http://www.w3.org/2000/svg", "g");
        obs1.innerHTML = obstacles[state.obstacle];
        obs1.setAttribute('transform', 'translate(0, 0)');
        
        const obs2 = document.createElementNS("http://www.w3.org/2000/svg", "g");
        obs2.innerHTML = obstacles[state.obstacle];
        obs2.setAttribute('transform', 'translate(80, -10) scale(0.8)'); // Slight variation

        previewObstacles.appendChild(obs1);
        previewObstacles.appendChild(obs2);

        // Collectibles (Render 3 in an arc)
        previewCollectibles.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.innerHTML = collectibles[state.collectible];
            // Arc position
            const x = i * 40;
            const y = Math.abs(i - 1) * -20; // 0 -> -20, 1 -> 0, 2 -> -20 (arc shape)
            g.setAttribute('transform', `translate(${x}, ${y})`);
            
            // Add simple animation
            const animate = document.createElementNS("http://www.w3.org/2000/svg", "animateTransform");
            animate.setAttribute('attributeName', 'transform');
            animate.setAttribute('type', 'translate');
            animate.setAttribute('values', `${x},${y}; ${x},${y-5}; ${x},${y}`);
            animate.setAttribute('dur', '2s');
            animate.setAttribute('repeatCount', 'indefinite');
            animate.setAttribute('begin', `${i * 0.2}s`);
            
            g.appendChild(animate);
            previewCollectibles.appendChild(g);
        }
    }

    function handleSelection(e) {
        const item = e.target.closest('.acc-item');
        if (!item) return;

        // Determine category
        const parent = item.parentElement;
        const siblings = parent.querySelectorAll('.acc-item');
        siblings.forEach(sib => sib.classList.remove('active'));
        item.classList.add('active');

        // Update state
        if (item.dataset.bg) state.bg = item.dataset.bg;
        if (item.dataset.terrain) state.terrain = item.dataset.terrain;
        if (item.dataset.obstacle) state.obstacle = item.dataset.obstacle;
        if (item.dataset.collectible) state.collectible = item.dataset.collectible;
        if (item.dataset.surface) state.surface = item.dataset.surface;
        if (item.dataset.effect) state.effect = item.dataset.effect;
        if (item.dataset.flora) state.flora = item.dataset.flora;
        if (item.dataset.sky) state.sky = item.dataset.sky;
        if (item.dataset.pace) state.pace = item.dataset.pace;

        updatePreview();
    }

    function randomize() {
        // Helper to pick random key from object
        const pick = (list) => list[Math.floor(Math.random() * list.length)];

        state.bg = pick(['day', 'night', 'sunset']);
        state.terrain = pick(['grass', 'stone', 'candy']);
        state.obstacle = pick(['rock', 'crystal', 'spike']);
        state.collectible = pick(['star', 'gem', 'heart']);
        state.surface = pick(['normal', 'slippery', 'bouncy']);
        state.effect = pick(['none', 'sparkles', 'mist', 'rain']);
        state.flora = pick(['none', 'flowers', 'mushrooms']);
        state.sky = pick(['clouds', 'stars', 'dragons']);
        state.pace = pick(['zen', 'normal', 'turbo']);

        // Update UI to reflect state
        updateUI();
        updatePreview();
    }

    function updateUI() {
        // Update active classes based on state
        document.querySelectorAll('.acc-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.bg === state.bg) item.classList.add('active');
            if (item.dataset.terrain === state.terrain) item.classList.add('active');
            if (item.dataset.obstacle === state.obstacle) item.classList.add('active');
            if (item.dataset.collectible === state.collectible) item.classList.add('active');
            if (item.dataset.surface === state.surface) item.classList.add('active');
            if (item.dataset.effect === state.effect) item.classList.add('active');
            if (item.dataset.flora === state.flora) item.classList.add('active');
            if (item.dataset.sky === state.sky) item.classList.add('active');
            if (item.dataset.pace === state.pace) item.classList.add('active');
        });
    }

    // -- Event Listeners --

    // Delegation for all grid items
    document.querySelectorAll('.accessory-grid').forEach(grid => {
        grid.addEventListener('click', handleSelection);
    });

    document.getElementById('randomizeBtn').addEventListener('click', () => {
        randomize();
        // Add a little feedback animation to the button? sfx?
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
        const btn = document.getElementById('saveBtn');
        const originalText = btn.innerText;
        btn.innerText = 'Saved!';
        btn.classList.add('btn-saved');
        
        // Save to namespaced storage
        Storage.save('levelConfig', state);

        setTimeout(() => {
            btn.innerText = originalText;
            btn.classList.remove('btn-saved');
        }, 1500);
    });

    // Initial render
    updatePreview();
}

// Auto-init
document.addEventListener('DOMContentLoaded', initLevelStudio);
