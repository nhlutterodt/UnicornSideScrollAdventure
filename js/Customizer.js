'use strict';

import { Dom } from './utils/Dom.js';
import { Storage } from './systems/Storage.js';
import { AssetPipeline } from './systems/AssetPipeline.js';
import {
    CHARACTER_DEFAULTS,
    CHARACTER_SCHEMA_VERSION,
    validateCharacterData,
    createProfile,
    migrateCharacterProfile,
    unwrapProfileData
} from './ProfileSchemas.js';

/**
 * CUSTOMIZER.js
 * Logic for the Unicorn Customization Studio.
 * Follows encapsulation and data-driven configuration.
 */
export class Customizer {
    constructor() {
        // Selectors
        this.preview = Dom.get('unicornPreview');
        this.bodyOptions = Dom.get('bodyColors');
        this.maneOptions = Dom.get('maneColors');
        this.randomBtn = Dom.get('randomizeBtn');
        this.saveBtn = Dom.get('saveBtn');

        // Profile management elements (will be created in init)
        this.profileNameInput = null;
        this.profileList = null;
        this.saveAsBtn = null;
        this.loadBtn = null;
        this.deleteBtn = null;
        this.resetBtn = null;

        // State
        this.profiles = {}; // Store all profiles (versioned format)
        this.activeProfileId = null; // Currently selected profile

        this.init();
    }

    init() {
        if (!this.preview) return;

        // Load existing profiles or create default (with migration from old system)
        this.loadProfiles();

        // Create profile management UI
        this.createProfileUI();

        // Load active profile or default
        this.loadActiveProfile();

        // Event Listeners
        this.attachListeners('.color-dot', (el) => {
            const container = el.parentElement;
            container.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
            el.classList.add('active');

            const type = el.closest('#bodyColors') ? 'body' : 'mane';
            this.updateState(type, el.dataset.name);

            // Update active profile if we have one selected
            if (this.activeProfileId) {
                this.updateActiveProfile();
            }
        });

        this.attachListeners('.acc-item', (el) => {
            const container = el.parentElement;
            container.querySelectorAll('.acc-item').forEach(i => i.classList.remove('active'));
            el.classList.add('active');

            const accessory = el.dataset.acc;
            const trail = el.dataset.trail;

            if (accessory) {
                this.updateState('accessory', accessory);
                const overlay = Dom.get('accessoryOverlay');
                if (overlay) {
                    overlay.classList.add('is-animating');
                    setTimeout(() => overlay.classList.remove('is-animating'), 200);
                }
            }
            if (trail) {
                this.updateState('trail', trail);

                // Update active profile if we have one selected
                if (this.activeProfileId) {
                    this.updateActiveProfile();
                }
            }
        });

        if (this.randomBtn) this.randomBtn.addEventListener('click', () => this.randomize());
        if (this.saveBtn) this.saveBtn.addEventListener('click', (e) => this.save(e));

        // Profile management event listeners
        if (this.profileNameInput) {
            this.profileNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveAsProfile();
                }
            });
        }

        if (this.saveAsBtn) this.saveAsBtn.addEventListener('click', () => this.saveAsProfile());
        if (this.loadBtn) this.loadBtn.addEventListener('click', () => this.loadSelectedProfile());
        if (this.deleteBtn) this.deleteBtn.addEventListener('click', () => this.deleteSelectedProfile());
        if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.resetToDefault());
    }

    /**
     * Create the profile management UI elements
     */
    createProfileUI() {
        const controlsSection = Dom.get('controls-section');
        if (!controlsSection) return;

        // Create profile management container
        const profileContainer = Dom.create('div', 'profile-management');
        profileContainer.innerHTML = `
            <div class="control-group">
                <label class="control-label">Profile Name</label>
                <input type="text" id="profileNameInput" placeholder="Enter profile name" />
            </div>
            <div class="control-group">
                <label class="control-label">Profiles</label>
                <select id="profileList"></select>
            </div>
            <div class="action-bar profile-actions">
                <button type="button" class="btn-magic btn-secondary" id="saveAsBtn">Save As</button>
                <button type="button" class="btn-magic" id="loadBtn">Load</button>
                <button type="button" class="btn-magic btn-warning" id="deleteBtn">Delete</button>
                <button type="button" class="btn-magic" id="resetBtn">Reset to Default</button>
            </div>
        `;

        // Insert after the existing action bar
        const existingActionBar = controlsSection.querySelector('.action-bar');
        if (existingActionBar) {
            controlsSection.insertBefore(profileContainer, existingActionBar.nextSibling);
        } else {
            controlsSection.appendChild(profileContainer);
        }

        // Cache the elements
        this.profileNameInput = Dom.get('profileNameInput');
        this.profileList = Dom.get('profileList');
        this.saveAsBtn = Dom.get('saveAsBtn');
        this.loadBtn = Dom.get('loadBtn');
        this.deleteBtn = Dom.get('deleteBtn');
        this.resetBtn = Dom.get('resetBtn');

        // Populate profile list
        this.populateProfileList();
    }

    /**
     * Load all profiles from storage, with migration from old format.
     */
    loadProfiles() {
        // First, try to migrate from old system if needed
        const oldOutfit = Storage.load('current_outfit');
        const stored = Storage.load('characterProfiles', {});

        if (oldOutfit && Object.keys(stored).length === 0) {
            // Migrate old outfit to new versioned profile system
            const migrated = migrateCharacterProfile('default', oldOutfit);
            stored['default'] = migrated;
            Storage.save('characterProfiles', stored);
            Storage.save('activeCharacterProfile', 'default');
        }

        // Ensure we have at least a default profile (versioned format)
        if (!stored['default']) {
            stored['default'] = createProfile('default', 'Default', CHARACTER_DEFAULTS, CHARACTER_SCHEMA_VERSION);
        } else if (typeof stored['default'] === 'object' && !stored['default'].schemaVersion) {
            // Migrate unversioned profile to versioned format
            stored['default'] = migrateCharacterProfile('default', stored['default']);
        }

        // Validate and normalize all profiles to versioned format
        this.profiles = {};
        for (const [id, profile] of Object.entries(stored)) {
            if (profile && profile.schemaVersion) {
                // Already versioned — keep as-is
                this.profiles[id] = profile;
            } else {
                // Unversioned — wrap it
                const result = validateCharacterData(profile);
                this.profiles[id] = createProfile(id, id, result.data, CHARACTER_SCHEMA_VERSION);
            }
        }

        // Load active profile ID
        const activeId = Storage.load('activeCharacterProfile', 'default');
        this.activeProfileId = this.profiles[activeId] ? activeId : 'default';
    }

    /**
     * Save all profiles to storage
     */
    saveProfiles() {
        Storage.save('characterProfiles', this.profiles);
        if (this.activeProfileId) {
            Storage.save('activeCharacterProfile', this.activeProfileId);
        }
    }

    /**
     * Load the active profile and apply it to the preview
     */
    loadActiveProfile() {
        if (this.activeProfileId && this.profiles[this.activeProfileId]) {
            const outfit = unwrapProfileData(this.profiles[this.activeProfileId], validateCharacterData, CHARACTER_DEFAULTS);
            this.applyOutfit(outfit);
            this.syncUIToOutfit(outfit);
            if (this.profileNameInput) this.profileNameInput.value = this.activeProfileId;
            if (this.profileList) this.profileList.value = this.activeProfileId;
        } else {
            // Fallback to default
            this.activeProfileId = 'default';
            const outfit = unwrapProfileData(this.profiles['default'], validateCharacterData, CHARACTER_DEFAULTS);
            this.applyOutfit(outfit);
            this.syncUIToOutfit(outfit);
            if (this.profileNameInput) this.profileNameInput.value = 'default';
            if (this.profileList) this.profileList.value = 'default';
        }
    }

    /**
     * Update the preview with an outfit
     * @param {Object} outfit - The outfit to apply
     */
    applyOutfit(outfit) {
        Object.entries(outfit).forEach(([key, val]) => {
            this.updateState(key, val);

            // Sync UI state
            const selector = `[data-${key}="${val}"], [data-name="${val}"]`;
            const el = document.querySelector(selector);
            if (el && (el.classList.contains('color-dot') || el.classList.contains('acc-item'))) {
                const container = el.parentElement;
                if (container) {
                    container.querySelectorAll('.color-dot, .acc-item').forEach(i => i.classList.remove('active'));
                }
                el.classList.add('active');
            }
        });
    }

    /**
     * Sync UI controls to match an outfit (for loading profiles)
     * @param {Object} outfit - The outfit to sync to
     */
    syncUIToOutfit(outfit) {
        // Body color
        if (outfit.body) {
            const bodyEl = this.bodyOptions.querySelector(`[data-name="${outfit.body}"]`);
            if (bodyEl) {
                this.bodyOptions.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                bodyEl.classList.add('active');
            }
        }

        // Mane color
        if (outfit.mane) {
            const maneEl = this.maneOptions.querySelector(`[data-name="${outfit.mane}"]`);
            if (maneEl) {
                this.maneOptions.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                maneEl.classList.add('active');
            }
        }

        // Accessory
        if (outfit.accessory) {
            const accEl = document.querySelector(`.acc-item[data-acc="${outfit.accessory}"]`);
            if (accEl) {
                document.querySelectorAll('.acc-item').forEach(i => i.classList.remove('active'));
                accEl.classList.add('active');
            }
        }

        // Trail
        if (outfit.trail) {
            const trailEl = document.querySelector(`.acc-item[data-trail="${outfit.trail}"]`);
            if (trailEl) {
                document.querySelectorAll('.acc-item').forEach(i => i.classList.remove('active'));
                trailEl.classList.add('active');
            }
        }
    }

    /**
     * Update the preview state (existing method)
     */
    updateState(key, value) {
        if (!this.preview) return;
        this.preview.dataset[key] = value;
    }

    /**
     * Randomize outfit and update preview
     */
    randomize() {
        const outfit = AssetPipeline.getRandomOutfit();
        this.applyOutfit(outfit);

        // Add visual feedback
        if (this.preview) {
            this.preview.classList.add('is-animating');
            setTimeout(() => this.preview.classList.remove('is-animating'), 300);
        }

        // Update active profile if we have one selected
        if (this.activeProfileId) {
            this.updateActiveProfile();
        }
    }

    /**
     * Save the current outfit to the active profile
     * @param {Event} event - The save button click event
     */
    save(event) {
        if (!this.preview) return;

        // Extract data from the preview's dataset
        const outfit = {
            body: this.preview.dataset.body,
            mane: this.preview.dataset.mane,
            accessory: this.preview.dataset.accessory,
            trail: this.preview.dataset.trail
        };

        if (this.activeProfileId) {
            // Validate before saving
            const result = validateCharacterData(outfit);
            this.profiles[this.activeProfileId] = createProfile(
                this.activeProfileId,
                this.activeProfileId,
                result.data,
                CHARACTER_SCHEMA_VERSION
            );
            this.saveProfiles();

            // Button feedback
            const btn = event.target;
            const originalText = btn.innerText;
            btn.innerText = '✨ Magic Saved! ✨';
            btn.classList.add('is-saved');

            setTimeout(() => {
                btn.innerText = originalText;
                btn.classList.remove('is-saved');
            }, 2000);
        }
    }

    /**
     * Save the current outfit as a new profile
     */
    saveAsProfile() {
        if (!this.preview) return;

        const profileName = this.profileNameInput ? this.profileNameInput.value.trim() : '';
        if (!profileName) {
            alert('Please enter a profile name');
            return;
        }

        // Check if profile already exists
        if (this.profiles[profileName]) {
            if (!confirm(`Profile "${profileName}" already exists. Overwrite?`)) {
                return;
            }
        }

        // Extract current outfit
        const outfit = {
            body: this.preview.dataset.body,
            mane: this.preview.dataset.mane,
            accessory: this.preview.dataset.accessory,
            trail: this.preview.dataset.trail
        };

        // Validate and save as versioned profile
        const result = validateCharacterData(outfit);
        this.profiles[profileName] = createProfile(profileName, profileName, result.data, CHARACTER_SCHEMA_VERSION);
        this.activeProfileId = profileName;
        this.saveProfiles();

        // Update UI
        this.populateProfileList();
        if (this.profileList) this.profileList.value = profileName;
        if (this.profileNameInput) this.profileNameInput.value = profileName;

        // Visual feedback
        this.saveBtn.innerText = '✨ Profile Saved! ✨';
        this.saveBtn.classList.add('is-saved');
        setTimeout(() => {
            this.saveBtn.innerText = 'Save Outfit';
            this.saveBtn.classList.remove('is-saved');
        }, 1500);
    }

    /**
     * Load the selected profile from the dropdown
     */
    loadSelectedProfile() {
        if (!this.profileList) return;

        const selectedId = this.profileList.value;
        if (selectedId && this.profiles[selectedId]) {
            this.activeProfileId = selectedId;
            const outfit = unwrapProfileData(this.profiles[selectedId], validateCharacterData, CHARACTER_DEFAULTS);
            this.applyOutfit(outfit);
            this.syncUIToOutfit(outfit);
            this.saveProfiles();

            if (this.profileNameInput) this.profileNameInput.value = selectedId;

            // Visual feedback
            this.loadBtn.innerText = 'Loaded!';
            this.loadBtn.classList.add('is-saved');
            setTimeout(() => {
                this.loadBtn.innerText = 'Load';
                this.loadBtn.classList.remove('is-saved');
            }, 1500);
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

        // Prevent deleting the default profile
        if (selectedId === 'default') {
            alert('Cannot delete the default profile');
            return;
        }

        if (confirm(`Delete profile "${selectedId}"?`)) {
            delete this.profiles[selectedId];

            // If we deleted the active profile, switch to default
            if (this.activeProfileId === selectedId) {
                this.activeProfileId = 'default';
                const outfit = unwrapProfileData(this.profiles['default'], validateCharacterData, CHARACTER_DEFAULTS);
                this.applyOutfit(outfit);
                this.syncUIToOutfit(outfit);
                if (this.profileNameInput) this.profileNameInput.value = 'default';
            }

            this.saveProfiles();
            this.populateProfileList();

            // Visual feedback
            this.deleteBtn.innerText = 'Deleted!';
            this.deleteBtn.classList.add('is-saved');
            setTimeout(() => {
                this.deleteBtn.innerText = 'Delete';
                this.deleteBtn.classList.remove('is-saved');
            }, 1500);
        }
    }

    /**
     * Reset to default outfit and clear active profile
     */
    resetToDefault() {
        if (confirm('Reset to default outfit?')) {
            this.activeProfileId = 'default';
            const outfit = unwrapProfileData(this.profiles['default'], validateCharacterData, CHARACTER_DEFAULTS);
            this.applyOutfit(outfit);
            this.syncUIToOutfit(outfit);
            this.saveProfiles();

            if (this.profileNameInput) this.profileNameInput.value = 'default';
            if (this.profileList) this.profileList.value = 'default';

            // Visual feedback
            this.resetBtn.innerText = 'Reset!';
            this.resetBtn.classList.add('is-saved');
            setTimeout(() => {
                this.resetBtn.innerText = 'Reset to Default';
                this.resetBtn.classList.remove('is-saved');
            }, 1500);
        }
    }

    /**
     * Populate the profile list dropdown
     */
    populateProfileList() {
        if (!this.profileList) return;

        // Clear existing options
        this.profileList.innerHTML = '';

        // Sort profiles alphabetically, but keep 'default' first
        const profileIds = Object.keys(this.profiles).sort((a, b) => {
            if (a === 'default') return -1;
            if (b === 'default') return 1;
            return a.localeCompare(b);
        });

        // Add options
        profileIds.forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = id;
            this.profileList.appendChild(option);
        });
    }

    /**
     * Update the active profile with current preview state
     */
    updateActiveProfile() {
        if (!this.activeProfileId || !this.preview) return;

        const outfit = {
            body: this.preview.dataset.body,
            mane: this.preview.dataset.mane,
            accessory: this.preview.dataset.accessory,
            trail: this.preview.dataset.trail
        };

        // Validate before saving
        const result = validateCharacterData(outfit);
        this.profiles[this.activeProfileId] = createProfile(
            this.activeProfileId,
            this.activeProfileId,
            result.data,
            CHARACTER_SCHEMA_VERSION
        );
        this.saveProfiles();
    }
}
