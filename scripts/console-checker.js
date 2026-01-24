'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Console Checker
 * Finds all instances of console.log/warn/error/etc. instead of Logger usage.
 */

const CONSOLE_PATTERN = /console\.(log|warn|error|info|debug|trace)/g;

function findConsoleUsage(dir, results = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            // Skip node_modules and other non-source directories
            if (entry.name === 'node_modules' || entry.name === '.git') {
                continue;
            }
            findConsoleUsage(fullPath, results);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');

            lines.forEach((line, index) => {
                const matches = line.match(CONSOLE_PATTERN);
                if (matches) {
                    results.push({
                        file: path.relative(process.cwd(), fullPath),
                        line: index + 1,
                        code: line.trim(),
                        method: matches[0]
                    });
                }
            });
        }
    }

    return results;
}

function main() {
    console.log('=== Console Usage Checker ===\n');
    console.log('Scanning for console.log/warn/error usage instead of Logger...\n');

    const jsDir = path.join(process.cwd(), 'js');
    const results = findConsoleUsage(jsDir);

    if (results.length === 0) {
        console.log('✓ No console usage found! All files use Logger correctly.\n');
        process.exit(0);
    }

    console.log(`Found ${results.length} console usage violation(s):\n`);

    results.forEach(result => {
        console.log(`  ${result.file}:${result.line}`);
        console.log(`    ${result.code}`);
        console.log('');
    });

    console.log(`Total violations: ${results.length}\n`);
    process.exit(1);
}

main();
