/**
 * Identifier Usage Checker
 * 
 * Validates that identifiers used in code match what was actually imported.
 * Catches issues like: importing 'logger' but using 'Logger' (case mismatch).
 * 
 * This complements import-export-checker.js by validating USAGE, not just imports.
 */

const fs = require('fs');
const path = require('path');

const JS_DIR = path.join(__dirname, '../js');
const IGNORE_DIRS = ['node_modules', '.git', 'libs'];
const IGNORE_FILES = ['Logger.js', 'ErrorHandler.js']; // These files define the classes

let exitCode = 0;

/**
 * Parse import statements from file content
 * @param {string} content - File content
 * @returns {Object} Map of imported names and their sources
 */
function parseImports(content) {
    const imports = new Map();
    
    // Match: import { name1, name2 as alias } from './file'
    const namedImportRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = namedImportRegex.exec(content)) !== null) {
        const importList = match[1];
        const source = match[2];
        
        // Parse individual imports
        const names = importList.split(',').map(n => n.trim());
        names.forEach(name => {
            // Handle aliases: "original as alias"
            const aliasMatch = name.match(/(\w+)\s+as\s+(\w+)/);
            if (aliasMatch) {
                const actualImport = aliasMatch[2]; // The alias
                imports.set(actualImport, { source, original: aliasMatch[1] });
            } else {
                imports.set(name, { source, original: name });
            }
        });
    }
    
    // Match: import DefaultName from './file'
    const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = defaultImportRegex.exec(content)) !== null) {
        const name = match[1];
        const source = match[2];
        imports.set(name, { source, original: name, isDefault: true });
    }
    
    return imports;
}

/**
 * Find all identifier usages in code (excluding comments/strings)
 * @param {string} content - File content
 * @param {string} filePath - For error reporting
 * @returns {Array} Array of { name, line, context }
 */
function findIdentifierUsages(content, filePath) {
    const usages = [];
    const lines = content.split('\n');
    
    // Pattern: word followed by . or ( or whitespace (method call or property access)
    // This catches: Logger.info, Logger.warn, myVar.method(), etc.
    const identifierPattern = /\b([A-Z][a-zA-Z0-9_]*)\s*[.(]/g;
    
    lines.forEach((line, index) => {
        const lineNum = index + 1;
        
        // Skip comments and strings (simple heuristic)
        if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
            return;
        }
        
        // Remove string contents to avoid false positives
        const cleanedLine = line.replace(/['"`].*?['"`]/g, '""');
        
        let match;
        const regex = new RegExp(identifierPattern.source, 'g');
        while ((match = regex.exec(cleanedLine)) !== null) {
            const identifier = match[1];
            usages.push({
                name: identifier,
                line: lineNum,
                context: line.trim()
            });
        }
    });
    
    return usages;
}

/**
 * Check if an identifier usage might be a case mismatch of an import
 * @param {string} usage - The identifier used in code
 * @param {Map} imports - Map of imported names
 * @returns {Object|null} Mismatch info or null
 */
function checkForCaseMismatch(usage, imports) {
    // Check if this usage matches any import with different case
    for (const [importedName, info] of imports.entries()) {
        if (usage.toLowerCase() === importedName.toLowerCase() && usage !== importedName) {
            return {
                usage: usage,
                correct: importedName,
                source: info.source
            };
        }
    }
    return null;
}

/**
 * Validate a single JavaScript file
 * @param {string} filePath - Absolute path to file
 */
function validateFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Parse imports
    const imports = parseImports(content);
    
    if (imports.size === 0) {
        return; // No imports to validate
    }
    
    // Find identifier usages
    const usages = findIdentifierUsages(content, filePath);
    
    // Check each usage for case mismatches
    const errors = [];
    usages.forEach(usage => {
        const mismatch = checkForCaseMismatch(usage.name, imports);
        if (mismatch) {
            errors.push({
                line: usage.line,
                context: usage.context,
                ...mismatch
            });
        }
    });
    
    // Report errors
    if (errors.length > 0) {
        console.error(`\n[IDENTIFIER MISMATCH] ${relativePath}`);
        errors.forEach(err => {
            console.error(`  Line ${err.line}: Using '${err.usage}' but imported '${err.correct}' from ${err.source}`);
            console.error(`    > ${err.context}`);
        });
        exitCode = 1;
    }
}

/**
 * Recursively scan directory for JS files
 * @param {string} dir - Directory path
 * @returns {Array} Array of file paths
 */
function scanDirectory(dir) {
    const files = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            if (!IGNORE_DIRS.includes(entry.name)) {
                files.push(...scanDirectory(fullPath));
            }
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            if (!IGNORE_FILES.includes(entry.name)) {
                files.push(fullPath);
            }
        }
    }
    
    return files;
}

/**
 * Main execution
 */
function main() {
    process.stdout.write('\n=== Identifier Usage Validation ===\n\n');
    
    const jsFiles = scanDirectory(JS_DIR);
    process.stdout.write(`Scanning ${jsFiles.length} JavaScript files for identifier mismatches...\n`);
    
    jsFiles.forEach(validateFile);
    
    if (exitCode === 0) {
        process.stdout.write('\n✓ All identifier usages match their imports.\n\n');
    } else {
        process.stdout.write('\n✗ Found identifier case mismatches. Fix the issues above.\n\n');
    }
    
    process.exit(exitCode);
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = { parseImports, findIdentifierUsages, checkForCaseMismatch };
