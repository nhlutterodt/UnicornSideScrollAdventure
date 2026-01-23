/**
 * standard-checker.js
 * Aggressive linting script to ensure zero inline CSS/JS and compliance with project standards.
 * Run this to verify the codebase.
 */

const fs = require('fs');
const path = require('path');

const VIOLATIONS = {
    INLINE_STYLE: {
        pattern: /\sstyle=["']/,
        message: 'Inline style attribute found in HTML. Move to a CSS class.',
        files: ['.html']
    },
    INLINE_ON_HANDLER: {
        pattern: /\son\w+=["']/,
        message: 'Inline event handler (on*) found in HTML. Move to an external JS listener.',
        files: ['.html']
    },
    INLINE_SCRIPT_TAG: {
        pattern: /<script(?!.*src)/,
        message: 'Inline <script> tag without src found. Move logic to an external .js file.',
        files: ['.html']
    },
    INLINE_CSS_TAG: {
        pattern: /<style/,
        message: 'Inline <style> tag found in HTML. Move to a .css file.',
        files: ['.html']
    },
    JS_INLINE_STYLE: {
        pattern: /\.style\.(?!(setProperty))/,
        message: 'Direct .style property assignment found in JS. Use classList toggle or .style.setProperty for variables.',
        files: ['.js']
    },
    RAW_LOCALSTORAGE: {
        pattern: /localStorage\.(setItem|getItem|removeItem|clear)/,
        message: 'Raw localStorage usage found. Use the Storage.js system for persistence.',
        files: ['.js']
    },
    CONSOLE_LOG: {
        pattern: /console\.(log|info|debug)(?!\.\w+)/,
        message: 'Direct console.log/info/debug found. Use logger.info() or logger.debug() from Logger.js.',
        files: ['.js']
    },
    ONCOLLISION_NO_CONTEXT: {
        pattern: /onCollision\s*\(\s*\w+\s*,\s*\w+\s*\)\s*{/,
        message: 'onCollision signature missing context parameter. Should be: onCollision(other, particles, context)',
        files: ['.js']
    },
    MISSING_ERROR_HANDLER: {
        pattern: /catch\s*\(\s*\w+\s*\)\s*{\s*$/,
        message: 'Empty catch block found. Use ErrorHandler.handle() to log errors properly.',
        files: ['.js']
    }
};

const IGNORE_FILES = [
    'standard-checker.js',
    'Storage.js', // Allowed to use localStorage
    'StorageManager.js', // Allowed to use localStorage
    'Logger.js', // Allowed to use console
    'ErrorHandler.js' // Allowed to use console
];

const IGNORE_DIRS = [
    'node_modules',
    '.git',
    'docs'
];

let errorCount = 0;

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                walk(fullPath);
            }
        } else {
            if (!IGNORE_FILES.includes(file)) {
                checkFile(fullPath);
            }
        }
    });
}

function checkFile(filePath) {
    const ext = path.extname(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    Object.keys(VIOLATIONS).forEach(key => {
        const v = VIOLATIONS[key];
        if (v.files.includes(ext)) {
            lines.forEach((line, index) => {
                if (v.pattern.test(line)) {
                    console.error(`\x1b[31m[VIOLATION]\x1b[0m ${filePath}:${index + 1}`);
                    console.error(`  > ${v.message}`);
                    console.error(`  > Line: ${line.trim()}`);
                    console.error('');
                    errorCount++;
                }
            });
        }
    });
}

console.log('--- Starting Aggressive Standard Audit ---');
walk(process.cwd());

if (errorCount > 0) {
    console.error(`\x1b[31mAudit Failed: ${errorCount} violation(s) found.\x1b[0m`);
    process.exit(1);
} else {
    console.log('\x1b[32mAudit Passed: No inline CSS/JS or raw storage violations found.\x1b[0m');
    process.exit(0);
}
