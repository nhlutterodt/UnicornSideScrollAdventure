import { AmbientEffects } from './systems/AmbientEffects.js';
import { Storage } from './systems/Storage.js';
import { Logger } from './utils/Logger.js';

/**
 * SETTINGS-MAIN.js
 * The entry point for the Settings page.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Ambient Background
    const ambient = new AmbientEffects('ambientBg');
    ambient.init({ 
        starCount: 40, 
        cloudCount: 4 
    });

    // 2. DOM Elements
    const musicSlider = document.getElementById('musicVolume');
    const sfxSlider = document.getElementById('sfxVolume');
    const musicVal = document.getElementById('musicVal');
    const sfxVal = document.getElementById('sfxVal');

    const shakeToggle = document.getElementById('screenShake');
    const particleToggle = document.getElementById('particleQuality');
    const fpsToggle = document.getElementById('showFps');
    const restartToggle = document.getElementById('autoRestart');
    const difficultySelect = document.getElementById('difficulty');

    const resetBtn = document.getElementById('resetData');
    const restoreBtn = document.getElementById('restoreDefaults');
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // 3. Tab Switching Logic
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            
            navBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });

    // 4. Load Existing Settings from Storage
    const DEFAULT_SETTINGS = {
        musicVolume: 70,
        sfxVolume: 80,
        screenShake: true,
        particleQuality: true,
        showFps: false,
        autoRestart: false,
        difficulty: 'normal'
    };

    const loadSettings = () => {
        const settings = Storage.load('game_settings', DEFAULT_SETTINGS);

        // Apply values to UI with null checks
        if (musicSlider) musicSlider.value = settings.musicVolume;
        if (sfxSlider) sfxSlider.value = settings.sfxVolume;
        if (musicVal) musicVal.textContent = `${settings.musicVolume}%`;
        if (sfxVal) sfxVal.textContent = `${settings.sfxVolume}%`;

        if (shakeToggle) shakeToggle.checked = settings.screenShake;
        if (particleToggle) particleToggle.checked = settings.particleQuality;
        if (fpsToggle) fpsToggle.checked = settings.showFps;
        if (restartToggle) restartToggle.checked = settings.autoRestart;
        if (difficultySelect) difficultySelect.value = settings.difficulty;
    };

    loadSettings();

    // 5. Event Listeners for Live Updates
    const saveSettings = () => {
        const newSettings = {
            musicVolume: musicSlider ? parseInt(musicSlider.value) : DEFAULT_SETTINGS.musicVolume,
            sfxVolume: sfxSlider ? parseInt(sfxSlider.value) : DEFAULT_SETTINGS.sfxVolume,
            screenShake: shakeToggle ? shakeToggle.checked : DEFAULT_SETTINGS.screenShake,
            particleQuality: particleToggle ? particleToggle.checked : DEFAULT_SETTINGS.particleQuality,
            showFps: fpsToggle ? fpsToggle.checked : DEFAULT_SETTINGS.showFps,
            autoRestart: restartToggle ? restartToggle.checked : DEFAULT_SETTINGS.autoRestart,
            difficulty: difficultySelect ? difficultySelect.value : DEFAULT_SETTINGS.difficulty
        };
        
        if (musicVal) musicVal.textContent = `${newSettings.musicVolume}%`;
        if (sfxVal) sfxVal.textContent = `${newSettings.sfxVolume}%`;
        
        Storage.save('game_settings', newSettings);
        Logger.log('Settings', 'Settings saved:', newSettings);
    };

    [musicSlider, sfxSlider].forEach(el => {
        if (el) el.addEventListener('input', saveSettings);
    });
    
    [shakeToggle, particleToggle, fpsToggle, restartToggle, difficultySelect].forEach(el => {
        if (el) el.addEventListener('change', saveSettings);
    });


    // Restore Defaults
    restoreBtn.addEventListener('click', () => {
        if (confirm('Restore all settings to default values?')) {
            Storage.save('game_settings', DEFAULT_SETTINGS);
            loadSettings();
        }
    });

    // Reset everything logic
    resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all game data? This includes high scores, customizations, and settings.')) {
            Storage.clear();
            location.reload();
        }
    });
});

