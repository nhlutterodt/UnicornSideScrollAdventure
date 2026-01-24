'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Console Checker
 * Finds all instances of direct console usage (log/warn/error/etc.) instead of Logger.
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
    process.stdout.write('=== Console Usage Checker ===\n\n');
    process.stdout.write('Scanning for direct console usage instead of Logger...\n\n');

    const jsDir = path.join(process.cwd(), 'js');
    const results = findConsoleUsage(jsDir);

    if (results.length === 0) {
        process.stdout.write('✓ No console usage found! All files use Logger correctly.\n\n');
        process.exit(0);
    }

    process.stdout.write(`Found ${results.length} console usage violation(s):\n\n`);

    results.forEach(result => {
        process.stdout.write(`  ${result.file}:${result.line}\n`);
        process.stdout.write(`    ${result.code}\n`);
        process.stdout.write('\n');
    });

    process.stdout.write(`Total violations: ${results.length}\n\n`);
    process.exit(1);
}

main();
