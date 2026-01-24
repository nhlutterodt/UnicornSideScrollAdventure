'use strict';

import { logger, VerbosityLevel } from '../utils/Logger.js';
import { Dom } from '../utils/Dom.js';
import { Storage } from './Storage.js';

/**
 * LOG_OVERLAY.js
 * On-screen live logging display for gameplay analysis.
 * Shows real-time game events in an overlay panel.
 */
export class LogOverlay {
    constructor() {
        this.container = null;
        this.logList = null;
        this.maxVisibleLogs = 50;
        this.isVisible = true;
        this.isMinimized = false;
        
        // Load saved settings
        const savedVisible = Storage.load('logOverlayVisible');
        const savedMinimized = Storage.load('logOverlayMinimized');
        const savedVerbosity = Storage.load('logVerbosity');
        
        if (savedVisible !== null) this.isVisible = savedVisible;
        if (savedMinimized !== null) this.isMinimized = savedMinimized;
        if (savedVerbosity !== null) logger.setVerbosity(savedVerbosity);
        
        this.init();
    }

    /**
     * Initialize overlay UI
     */
    init() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'logOverlay';
        this.container.className = 'log-overlay';
        if (!this.isVisible) this.container.classList.add('hidden');
        if (this.isMinimized) this.container.classList.add('minimized');

        // Create header
        const header = document.createElement('div');
        header.className = 'log-overlay-header';
        
        const title = document.createElement('span');
        title.textContent = 'Game Log';
        title.className = 'log-overlay-title';
        
        const controls = document.createElement('div');
        controls.className = 'log-overlay-controls';
        
        // Verbosity selector
        const verbositySelect = document.createElement('select');
        verbositySelect.className = 'log-verbosity-select';
        verbositySelect.title = 'Log Verbosity Level';
        ['OFF', 'LOW', 'MEDIUM', 'HIGH', 'VERBOSE'].forEach((level, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = level;
            if (index === logger.getVerbosity()) {
                option.selected = true;
            }
            verbositySelect.appendChild(option);
        });
        verbositySelect.addEventListener('change', (e) => {
            const level = parseInt(e.target.value);
            logger.setVerbosity(level);
            Storage.save('logVerbosity', level);
        });
        
        // Clear button
        const clearBtn = document.createElement('button');
        clearBtn.textContent = '🗑️';
        clearBtn.className = 'log-btn';
        clearBtn.title = 'Clear logs';
        clearBtn.addEventListener('click', () => {
            this.clearLogs();
        });
        
        // Minimize button
        const minimizeBtn = document.createElement('button');
        minimizeBtn.textContent = this.isMinimized ? '🔼' : '🔽';
        minimizeBtn.className = 'log-btn log-minimize-btn';
        minimizeBtn.title = 'Minimize/Maximize';
        minimizeBtn.addEventListener('click', () => {
            this.toggleMinimize();
            minimizeBtn.textContent = this.isMinimized ? '🔼' : '🔽';
        });
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.className = 'log-btn';
        closeBtn.title = 'Hide log (Press L to toggle)';
        closeBtn.addEventListener('click', () => {
            this.hide();
        });
        
        controls.appendChild(verbositySelect);
        controls.appendChild(clearBtn);
        controls.appendChild(minimizeBtn);
        controls.appendChild(closeBtn);
        
        header.appendChild(title);
        header.appendChild(controls);
        
        // Create log list
        this.logList = document.createElement('div');
        this.logList.className = 'log-overlay-list';
        
        // Assemble
        this.container.appendChild(header);
        this.container.appendChild(this.logList);
        document.body.appendChild(this.container);
        
        // Register as logger listener
        this.boundLogHandler = this.handleLog.bind(this);
        logger.addListener(this.boundLogHandler);
        
        // Keyboard shortcut (L key to toggle)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'l' || e.key === 'L') {
                // Don't toggle if typing in input
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    return;
                }
                this.toggle();
            }
        });
        
        logger.info('LogOverlay', `Initialized (verbosity: ${logger.getVerbosityName(logger.getVerbosity())})`);
    }

    /**
     * Handle incoming log entry
     * @param {Object} entry - Log entry from Logger
     */
    handleLog(entry) {
        if (!this.isVisible || this.isMinimized) return;
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-level-${entry.level.toLowerCase()}`;
        
        // Format timestamp
        const time = new Date(entry.timestamp);
        const timeStr = `${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}.${time.getMilliseconds().toString().padStart(3, '0')}`;
        
        // Format message
        let message = `<span class="log-time">[${timeStr}]</span> `;
        message += `<span class="log-module">${entry.module}</span>: `;
        message += `<span class="log-message">${entry.message}</span>`;
        
        // Add data if present
        if (entry.data !== null && entry.data !== undefined) {
            const dataStr = typeof entry.data === 'object' ? 
                JSON.stringify(entry.data).substring(0, 100) : 
                String(entry.data).substring(0, 100);
            message += ` <span class="log-data">${dataStr}</span>`;
        }
        
        logEntry.innerHTML = message;
        
        // Add to list (newest at bottom)
        this.logList.appendChild(logEntry);
        
        // Remove old entries
        while (this.logList.children.length > this.maxVisibleLogs) {
            this.logList.removeChild(this.logList.firstChild);
        }
        
        // Auto-scroll to bottom
        this.logList.scrollTop = this.logList.scrollHeight;
    }

    /**
     * Clear all logs
     */
    clearLogs() {
        this.logList.innerHTML = '';
        logger.clearHistory();
        logger.info('LogOverlay', 'Logs cleared');
    }

    /**
     * Toggle visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Show overlay
     */
    show() {
        this.isVisible = true;
        this.container.classList.remove('hidden');
        Storage.save('logOverlayVisible', true);
        logger.info('LogOverlay', 'Shown (Press L to hide)');
    }

    /**
     * Hide overlay
     */
    hide() {
        this.isVisible = false;
        this.container.classList.add('hidden');
        Storage.save('logOverlayVisible', false);
        logger.info('LogOverlay', 'Hidden (Press L to show)');
    }

    /**
     * Toggle minimize state
     */
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        if (this.isMinimized) {
            this.container.classList.add('minimized');
        } else {
            this.container.classList.remove('minimized');
        }
        Storage.save('logOverlayMinimized', this.isMinimized);
    }

    /**
     * Cleanup
     */
    dispose() {
        if (this.boundLogHandler) {
            logger.removeListener(this.boundLogHandler);
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
