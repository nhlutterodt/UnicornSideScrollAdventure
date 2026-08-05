'use strict';

import { Storage } from './systems/Storage.js';
import { logger } from './utils/Logger.js';
import {
    LEVEL_DEFAULTS,
    LEVEL_SCHEMA_VERSION,
    validateLevelData,
    createProfile,
    unwrapProfileData
} from './ProfileSchemas.js';

/**
 * LEVEL-CUSTOMIZE.js
 * Level Studio — user-authored overrides for stage 1, persisted via Storage.
 * Now supports named profiles with save/load/delete/reset.
 */
export class LevelStudio {
    constructor() {
        this.state = { ...LEVEL_DEFAULTS };

        // Profile management
        this.profiles = {};
        this.activeProfileId = null;
        this.profileNameInput = null;
        this.profileList = null;
        this.saveAsBtn = null;
        this.loadBtn = null;
        this.deleteBtn = null;
        this.resetBtn = null;

        // DOM references
        this.previewBg = document.getElementById('previewBg');
        this.previewGround = document.querySelector('#previewGround path');
        this.previewObstacles = document.getElementById('previewObstacles');
        this.previewCollectibles = document.getElementById('previewCollectibles');

        // Config / Assets
        this.backgrounds = {
            day: 'url(#bg-day)',
            night: 'url(#bg-night)',
            sunset: 'url(#bg-sunset)'
        };

        this.terrains = {
            grass: '#4CAF50',
            stone: '#795548',
            candy: '#E91E63'
        };

        this.obstacles = {
            rock: '<path d="M0,20 L20,0 L40,20 Z" fill="#5D4037" transform="scale(1.5)" />',
            crystal: '<path d="M10,0 L20,15 L10,30 L0,15 Z" fill="#00BCD4" opacity="0.8" transform="scale(1.5)" />',
            spike: '<path d="M0,30 L10,0 L20,30 M20,30 L30,0 L40,30" stroke="#333" stroke-width="2" fill="#BDBDBD" />'
        };

        this.collectibles = {
            star: '<polygon points="20,0 25,12 38,12 28,20 31,32 20,25 9,32 12,20 2,12 15,12" fill="gold" />',
            gem: '<path d="M10,0 L30,0 L40,15 L20,40 L0,15 Z" fill="#9C27B0" />',
            heart: '<path d="M20,35 L5,20 Q0,10 10,5 Q20,10 20,15 Q20,10 30,5 Q40,10 35,20 Z" fill="#F44336" />'
        };

        this.init();
    }

    init() {
        // Load profiles
        this.loadProfiles();

        // Create profile management UI
        this.createProfileUI();

        // Load active profile
        this.loadActiveProfile();

        // Event listeners
        document.querySelectorAll('.accessory-grid').forEach(grid => {
            grid.addEventListener('click', (e) => this.handleSelection(e));
        });

        const randomizeBtn = document.getElementById('randomizeBtn');
        if (randomizeBtn) randomizeBtn.addEventListener('click', () => this.randomize());

        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) saveBtn.addEventListener('click', (e) => this.save(e));

        // Initial render
        this.updatePreview();

        logger.info('LevelStudio', 'Level Studio Initialized');
    }

    /**
     * Create the profile management UI elements
     */
    createProfileUI() {
        const controlsSection = document.querySelector('.controls-section');
        if (!controlsSection) return;

        const profileContainer = document.createElement('div');
        profileContainer.className = 'profile-management';
        profileContainer.innerHTML = `
            <div class="control-group">
                <label class="control-label">Profile Name</label>
                <input type="text" id="levelProfileNameInput" placeholder="Enter profile name" />
            </div>
            <div class="control-group">
                <label class="control-label">Profiles</label>
                <select id="levelProfileList"></select>
            </div>
            <div class="action-bar profile-actions">
                <button type="button" class="btn-magic btn-secondary" id="levelSaveAsBtn">Save As</button>
                <button type="button" class="btn-magic" id="levelLoadBtn">Load</button>
                <button type="button" class="btn-magic btn-warning" id="levelDeleteBtn">Delete</button>
                <button type="button" class="btn-magic" id="levelResetBtn">Reset to Default</button>
            </div>
        `;

        const existingActionBar = controlsSection.querySelector('.action-bar');
        if (existingActionBar) {
            controlsSection.insertBefore(profileContainer, existingActionBar.nextSibling);
        } else {
            controlsSection.appendChild(profileContainer);
        }

        this.profileNameInput = document.getElementById('levelProfileNameInput');
        this.profileList = document.getElementById('levelProfileList');
        this.saveAsBtn = document.getElementById('levelSaveAsBtn');
        this.loadBtn = document.getElementById('levelLoadBtn');
        this.deleteBtn = document.getElementById('levelDeleteBtn');
        this.resetBtn = document.getElementById('levelResetBtn');

        // Profile event listeners
        if (this.profileNameInput) {
            this.profileNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.saveAsProfile();
            });
        }
        if (this.saveAsBtn) this.saveAsBtn.addEventListener('click', () => this.saveAsProfile());
        if (this.loadBtn) this.loadBtn.addEventListener('click', () => this.loadSelectedProfile());
        if (this.deleteBtn) this.deleteBtn.addEventListener('click', () => this.deleteSelectedProfile());
        if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.resetToDefault());

        this.populateProfileList();
    }

    /**
     * Load all level profiles from storage
     */
    loadProfiles() {
        const stored = Storage.load('levelProfiles', {});

        // Ensure we have at least a default profile
        if (!stored['default']) {
            stored['default'] = createProfile('default', 'Default', LEVEL_DEFAULTS, LEVEL_SCHEMA_VERSION);
        } else if (typeof stored['default'] === 'object' && !stored['default'].schemaVersion) {
            // Migrate unversioned
            const result = validateLevelData(stored['default']);
            stored['default'] = createProfile('default', 'Default', result.data, LEVEL_SCHEMA_VERSION);
        }

        // Normalize all profiles to versioned format
        this.profiles = {};
        for (const [id, profile] of Object.entries(stored)) {
            if (profile && profile.schemaVersion) {
                this.profiles[id] = profile;
            } else {
                const result = validateLevelData(profile);
                this.profiles[id] = createProfile(id, id, result.data, LEVEL_SCHEMA_VERSION);
            }
        }

        // Load active profile ID
        const activeId = Storage.load('activeLevelProfile', 'default');
        this.activeProfileId = this.profiles[activeId] ? activeId : 'default';
    }

    /**
     * Save all profiles to storage
     */
    saveProfiles() {
        Storage.save('levelProfiles', this.profiles);
        if (this.activeProfileId) {
            Storage.save('activeLevelProfile', this.activeProfileId);
        }
        // Also save the active config for the game to consume (backward compat)
        this.saveActiveConfig();
    }

    /**
     * Save the active level config for the game to consume (legacy key)
     */
    saveActiveConfig() {
        if (this.activeProfileId && this.profiles[this.activeProfileId]) {
            const data = unwrapProfileData(this.profiles[this.activeProfileId], validateLevelData, LEVEL_DEFAULTS);
            Storage.save('levelConfig', data);
        }
    }

    /**
     * Load the active profile and apply it
     */
    loadActiveProfile() {
        if (this.activeProfileId && this.profiles[this.activeProfileId]) {
            const data = unwrapProfileData(this.profiles[this.activeProfileId], validateLevelData, LEVEL_DEFAULTS);
            this.state = { ...data };
            this.updateUI();
            this.updatePreview();
            if (this.profileNameInput) this.profileNameInput.value = this.activeProfileId;
            if (this.profileList) this.profileList.value = this.activeProfileId;
        } else {
            this.activeProfileId = 'default';
            const data = unwrapProfileData(this.profiles['default'], validateLevelData, LEVEL_DEFAULTS);
            this.state = { ...data };
            this.updateUI();
            this.updatePreview();
            if (this.profileNameInput) this.profileNameInput.value = 'default';
            if (this.profileList) this.profileList.value = 'default';
        }
    }

    /**
     * Update the SVG preview
     */
    updatePreview() {
        // Background
        this.previewBg.setAttribute('fill', this.backgrounds[this.state.bg]);

        // Sky Elements
        const previewDistant = document.getElementById('previewDistant');
        previewDistant.innerHTML = '';
        if (this.state.sky === 'clouds') {
            previewDistant.innerHTML = `
                <circle cx="50" cy="50" r="20" fill="white" />
                <circle cx="80" cy="50" r="25" fill="white" />
                <circle cx="110" cy="50" r="20" fill="white" />
            `;
        } else if (this.state.sky === 'stars') {
            for (let i = 0; i < 5; i++) {
                previewDistant.innerHTML += `<circle cx="${Math.random() * 400}" cy="${Math.random() * 150}" r="2" fill="white" opacity="${Math.random()}" />`;
            }
        } else if (this.state.sky === 'dragons') {
            previewDistant.innerHTML = '<path d="M50,50 Q100,0 150,50 L100,60 Z" fill="#4A148C" opacity="0.8" />';
        }

        // Terrain
        this.previewGround.setAttribute('fill', this.terrains[this.state.terrain]);
        this.previewGround.setAttribute('opacity', this.state.surface === 'slippery' ? '0.7' : '1');

        // Obstacles
        this.previewObstacles.innerHTML = '';
        const obs1 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        obs1.innerHTML = this.obstacles[this.state.obstacle];
        obs1.setAttribute('transform', 'translate(0, 0)');

        const obs2 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        obs2.innerHTML = this.obstacles[this.state.obstacle];
        obs2.setAttribute('transform', 'translate(80, -10) scale(0.8)');

        this.previewObstacles.appendChild(obs1);
        this.previewObstacles.appendChild(obs2);

        // Collectibles
        this.previewCollectibles.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.innerHTML = this.collectibles[this.state.collectible];
            const x = i * 40;
            const y = Math.abs(i - 1) * -20;
            g.setAttribute('transform', `translate(${x}, ${y})`);

            const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
            animate.setAttribute('attributeName', 'transform');
            animate.setAttribute('type', 'translate');
            animate.setAttribute('values', `${x},${y}; ${x},${y - 5}; ${x},${y}`);
            animate.setAttribute('dur', '2s');
            animate.setAttribute('repeatCount', 'indefinite');
            animate.setAttribute('begin', `${i * 0.2}s`);

            g.appendChild(animate);
            this.previewCollectibles.appendChild(g);
        }
    }

    /**
     * Handle a selection click on the accessory grid
     */
    handleSelection(e) {
        const item = e.target.closest('.acc-item');
        if (!item) return;

        const parent = item.parentElement;
        const siblings = parent.querySelectorAll('.acc-item');
        siblings.forEach(sib => sib.classList.remove('active'));
        item.classList.add('active');

        if (item.dataset.bg) this.state.bg = item.dataset.bg;
        if (item.dataset.terrain) this.state.terrain = item.dataset.terrain;
        if (item.dataset.obstacle) this.state.obstacle = item.dataset.obstacle;
        if (item.dataset.collectible) this.state.collectible = item.dataset.collectible;
        if (item.dataset.surface) this.state.surface = item.dataset.surface;
        if (item.dataset.effect) this.state.effect = item.dataset.effect;
        if (item.dataset.flora) this.state.flora = item.dataset.flora;
        if (item.dataset.sky) this.state.sky = item.dataset.sky;
        if (item.dataset.pace) this.state.pace = item.dataset.pace;

        this.updatePreview();

        // Auto-save to active profile
        if (this.activeProfileId) {
            this.updateActiveProfile();
        }
    }

    /**
     * Randomize all level settings
     */
    randomize() {
        const pick = (list) => list[Math.floor(Math.random() * list.length)];

        this.state.bg = pick(['day', 'night', 'sunset']);
        this.state.terrain = pick(['grass', 'stone', 'candy']);
        this.state.obstacle = pick(['rock', 'crystal', 'spike']);
        this.state.collectible = pick(['star', 'gem', 'heart']);
        this.state.surface = pick(['normal', 'slippery', 'bouncy']);
        this.state.effect = pick(['none', 'sparkles', 'mist', 'rain']);
        this.state.flora = pick(['none', 'flowers', 'mushrooms']);
        this.state.sky = pick(['clouds', 'stars', 'dragons']);
        this.state.pace = pick(['zen', 'normal', 'turbo']);

        this.updateUI();
        this.updatePreview();

        if (this.activeProfileId) {
            this.updateActiveProfile();
        }
    }

    /**
     * Update UI active classes to match state
     */
    updateUI() {
        document.querySelectorAll('.acc-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.bg === this.state.bg) item.classList.add('active');
            if (item.dataset.terrain === this.state.terrain) item.classList.add('active');
            if (item.dataset.obstacle === this.state.obstacle) item.classList.add('active');
            if (item.dataset.collectible === this.state.collectible) item.classList.add('active');
            if (item.dataset.surface === this.state.surface) item.classList.add('active');
            if (item.dataset.effect === this.state.effect) item.classList.add('active');
            if (item.dataset.flora === this.state.flora) item.classList.add('active');
            if (item.dataset.sky === this.state.sky) item.classList.add('active');
            if (item.dataset.pace === this.state.pace) item.classList.add('active');
        });
    }

    /**
     * Save the current level config to the active profile
     */
    save(event) {
        const btn = event.target;
        const originalText = btn.innerText;

        if (this.activeProfileId) {
            const result = validateLevelData(this.state);
            this.profiles[this.activeProfileId] = createProfile(
                this.activeProfileId,
                this.activeProfileId,
                result.data,
                LEVEL_SCHEMA_VERSION
            );
            this.saveProfiles();

            btn.innerText = 'Saved!';
            btn.classList.add('btn-saved');
            setTimeout(() => {
                btn.innerText = originalText;
                btn.classList.remove('btn-saved');
            }, 1500);
        }
    }

    /**
     * Save current state as a new profile
     */
    saveAsProfile() {
        const profileName = this.profileNameInput ? this.profileNameInput.value.trim() : '';
        if (!profileName) {
            alert('Please enter a profile name');
            return;
        }

        if (this.profiles[profileName]) {
            if (!confirm(`Profile "${profileName}" already exists. Overwrite?`)) {
                return;
            }
        }

        const result = validateLevelData(this.state);
        this.profiles[profileName] = createProfile(profileName, profileName, result.data, LEVEL_SCHEMA_VERSION);
        this.activeProfileId = profileName;
        this.saveProfiles();

        this.populateProfileList();
        if (this.profileList) this.profileList.value = profileName;
        if (this.profileNameInput) this.profileNameInput.value = profileName;

        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.innerText = '✨ Profile Saved! ✨';
            saveBtn.classList.add('btn-saved');
            setTimeout(() => {
                saveBtn.innerText = 'Save Level';
                saveBtn.classList.remove('btn-saved');
            }, 1500);
        }
    }

    /**
     * Load the selected profile
     */
    loadSelectedProfile() {
        if (!this.profileList) return;

        const selectedId = this.profileList.value;
        if (selectedId && this.profiles[selectedId]) {
            this.activeProfileId = selectedId;
            const data = unwrapProfileData(this.profiles[selectedId], validateLevelData, LEVEL_DEFAULTS);
            this.state = { ...data };
            this.updateUI();
            this.updatePreview();
            this.saveProfiles();

            if (this.profileNameInput) this.profileNameInput.value = selectedId;

            if (this.loadBtn) {
                this.loadBtn.innerText = 'Loaded!';
                this.loadBtn.classList.add('is-saved');
                setTimeout(() => {
                    this.loadBtn.innerText = 'Load';
                    this.loadBtn.classList.remove('is-saved');
                }, 1500);
            }
        }
    }

    /**
     * Delete the selected profile
     */
    deleteSelectedProfile() {
        if (!this.profileList) return;

        const selectedId = this.profileList.value;
        if (!selectedId) {
            alert('Please select a profile to delete');
            return;
        }

        if (selectedId === 'default') {
            alert('Cannot delete the default profile');
            return;
        }

        if (confirm(`Delete profile "${selectedId}"?`)) {
            delete this.profiles[selectedId];

            if (this.activeProfileId === selectedId) {
                this.activeProfileId = 'default';
                const data = unwrapProfileData(this.profiles['default'], validateLevelData, LEVEL_DEFAULTS);
                this.state = { ...data };
                this.updateUI();
                this.updatePreview();
                if (this.profileNameInput) this.profileNameInput.value = 'default';
            }

            this.saveProfiles();
            this.populateProfileList();

            if (this.deleteBtn) {
                this.deleteBtn.innerText = 'Deleted!';
                this.deleteBtn.classList.add('is-saved');
                setTimeout(() => {
                    this.deleteBtn.innerText = 'Delete';
                    this.deleteBtn.classList.remove('is-saved');
                }, 1500);
            }
        }
    }

    /**
     * Reset to default level config
     */
    resetToDefault() {
        if (confirm('Reset to default level settings?')) {
            this.activeProfileId = 'default';
            const data = unwrapProfileData(this.profiles['default'], validateLevelData, LEVEL_DEFAULTS);
            this.state = { ...data };
            this.updateUI();
            this.updatePreview();
            this.saveProfiles();

            if (this.profileNameInput) this.profileNameInput.value = 'default';
            if (this.profileList) this.profileList.value = 'default';

            if (this.resetBtn) {
                this.resetBtn.innerText = 'Reset!';
                this.resetBtn.classList.add('is-saved');
                setTimeout(() => {
                    this.resetBtn.innerText = 'Reset to Default';
                    this.resetBtn.classList.remove('is-saved');
                }, 1500);
            }
        }
    }

    /**
     * Populate the profile list dropdown
     */
    populateProfileList() {
        if (!this.profileList) return;

        this.profileList.innerHTML = '';

        const profileIds = Object.keys(this.profiles).sort((a, b) => {
            if (a === 'default') return -1;
            if (b === 'default') return 1;
            return a.localeCompare(b);
        });

        profileIds.forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = id;
            this.profileList.appendChild(option);
        });
    }

    /**
     * Update the active profile with current state
     */
    updateActiveProfile() {
        if (!this.activeProfileId) return;

        const result = validateLevelData(this.state);
        this.profiles[this.activeProfileId] = createProfile(
            this.activeProfileId,
            this.activeProfileId,
            result.data,
            LEVEL_SCHEMA_VERSION
        );
        this.saveProfiles();
    }
}

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    window.levelStudio = new LevelStudio();
});
