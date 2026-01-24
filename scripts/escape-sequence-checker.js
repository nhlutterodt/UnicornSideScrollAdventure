#!/usr/bin/env node

/**
 * ESCAPE_SEQUENCE_CHECKER.js
 * Detects literal escape sequences (like \n, \t) that should be actual characters.
 * 
 * Common mistakes:
 * - `;\n` instead of `;` followed by newline
 * - `\t` instead of actual tab
 * - `\r` instead of actual carriage return
 * 
 * These cause SyntaxError: Invalid or unexpected token at runtime.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JS_DIRS = ['js'];
const IGNORE_PATTERNS = [
    /node_modules/,
    /\.min\.js$/,
    /bundle\.js$/,
    /dist\//,
    /build\//
];

// Pattern to detect literal escape sequences outside of strings
// This looks for escape sequences followed by non-string context
const LITERAL_ESCAPE_PATTERNS = [
    {
        pattern: /;\s*\\n\s*$/m,
        message: 'Literal \\n found after semicolon (should be actual newline)'
    },
    {
        pattern: /\)\s*\\n\s*$/m,
        message: 'Literal \\n found after closing parenthesis (should be actual newline)'
    },
    {
        pattern: /}\s*\\n\s*$/m,
        message: 'Literal \\n found after closing brace (should be actual newline)'
    },
    {
        pattern: /break;\s*\\n/,
        message: 'Literal \\n found after break statement (should be actual newline)'
    },
    {
        pattern: /continue;\s*\\n/,
        message: 'Literal \\n found after continue statement (should be actual newline)'
    },
    {
        pattern: /return[^;]*;\s*\\n/,
        message: 'Literal \\n found after return statement (should be actual newline)'
    },
    {
        pattern: /\\t(?=[^'"]*(?:['"][^'"]*['"][^'"]*)*$)/,
        message: 'Literal \\t found outside of string (should be actual tab or spaces)'
    },
    {
        pattern: /\\r(?=[^'"]*(?:['"][^'"]*['"][^'"]*)*$)/,
        message: 'Literal \\r found outside of string (should be actual carriage return)'
    }
];

function shouldIgnoreFile(filePath) {
    return IGNORE_PATTERNS.some(pattern => pattern.test(filePath));
}

function walkDir(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            if (!shouldIgnoreFile(fullPath)) {
                walkDir(fullPath, files);
            }
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            if (!shouldIgnoreFile(fullPath)) {
                files.push(fullPath);
            }
        }
    }
    
    return files;
}

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const violations = [];
    
    // Check each pattern against the content
    for (const { pattern, message } of LITERAL_ESCAPE_PATTERNS) {
        const matches = content.matchAll(new RegExp(pattern, 'g'));
        
        for (const match of matches) {
            // Find line number
            const beforeMatch = content.substring(0, match.index);
            const lineNumber = beforeMatch.split('\n').length;
            
            // Get context (the actual line)
            const line = lines[lineNumber - 1];
            
            // Skip if this is inside a string literal
            if (isInsideString(line, match.index - beforeMatch.lastIndexOf('\n') - 1)) {
                continue;
            }
            
            violations.push({
                file: filePath,
                line: lineNumber,
                message: message,
                context: line.trim()
            });
        }
    }
    
    return violations;
}

/**
 * Check if a position in a line is inside a string literal
 * @param {string} line - The line of code
 * @param {number} position - Position in the line
 * @returns {boolean}
 */
function isInsideString(line, position) {
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;
    let escaped = false;
    
    for (let i = 0; i < position; i++) {
        const char = line[i];
        
        if (escaped) {
            escaped = false;
            continue;
        }
        
        if (char === '\\') {
            escaped = true;
            continue;
        }
        
        if (char === "'" && !inDoubleQuote && !inBacktick) {
            inSingleQuote = !inSingleQuote;
        } else if (char === '"' && !inSingleQuote && !inBacktick) {
            inDoubleQuote = !inDoubleQuote;
        } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
            inBacktick = !inBacktick;
        }
    }
    
    return inSingleQuote || inDoubleQuote || inBacktick;
}

// Main execution
function main() {
    console.log('=== Escape Sequence Validation ===\n');
    
    let allViolations = [];
    
    for (const dir of JS_DIRS) {
        const dirPath = path.join(ROOT, dir);
        if (!fs.existsSync(dirPath)) continue;
        
        const files = walkDir(dirPath);
        
        for (const file of files) {
            const violations = checkFile(file);
            allViolations = allViolations.concat(violations);
        }
    }
    
    if (allViolations.length > 0) {
        console.log(`Found ${allViolations.length} literal escape sequence(s):\n`);
        
        for (const violation of allViolations) {
            const relativePath = path.relative(ROOT, violation.file);
            console.log(`[ERROR] ${relativePath}:${violation.line}`);
            console.log(`  > ${violation.message}`);
            console.log(`  > ${violation.context}`);
            console.log('');
        }
        
        console.log('Validation Failed: Fix literal escape sequences.\n');
        process.exit(1);
    }
    
    console.log('✓ No literal escape sequences found.\n');
    process.exit(0);
}

main();
