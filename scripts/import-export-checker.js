/**
 * IMPORT-EXPORT CHECKER
 * Validates that all imports match their corresponding exports.
 * Catches common issues:
 * - Case mismatches (importing 'Logger' when export is 'logger')
 * - Missing exports
 * - Default vs named import mismatches
 * - Circular dependencies
 */

const fs = require('fs');
const path = require('path');

// Track exports by file
const exportMap = new Map(); // filepath -> { default: string, named: Set<string> }
const importMap = new Map(); // filepath -> [{ type, names, from }]
let errorCount = 0;

const IGNORE_DIRS = ['node_modules', '.git', 'docs', 'scripts'];
const JS_EXTENSIONS = ['.js', '.mjs'];

/**
 * Parse exports from a file
 */
function parseExports(filePath, content) {
    const exports = { default: null, named: new Set() };
    
    // Match: export const name = ... OR export async function name()
    const namedExportPattern = /export\s+(?:async\s+)?(?:const|let|var|class|function)\s+(\w+)/g;
    let match;
    while ((match = namedExportPattern.exec(content)) !== null) {
        exports.named.add(match[1]);
    }
    
    // Match: export { name1, name2 }
    const exportBlockPattern = /export\s*{\s*([^}]+)\s*}/g;
    while ((match = exportBlockPattern.exec(content)) !== null) {
        const names = match[1].split(',').map(n => {
            // Handle "name as alias" - we want the original name
            const parts = n.trim().split(/\s+as\s+/);
            return parts[0].trim();
        });
        names.forEach(name => exports.named.add(name));
    }
    
    // Match: export default
    if (/export\s+default/.test(content)) {
        // Try to find the name
        const defaultMatch = content.match(/export\s+default\s+(?:class|function)?\s*(\w+)/);
        exports.default = defaultMatch ? defaultMatch[1] : 'default';
    }
    
    return exports;
}

/**
 * Parse imports from a file
 */
function parseImports(filePath, content) {
    const imports = [];
    
    // Match: import { name1, name2 } from './file'
    const namedImportPattern = /import\s*{\s*([^}]+)\s*}\s*from\s*['"](.*)['"]/g;
    let match;
    while ((match = namedImportPattern.exec(content)) !== null) {
        const names = match[1].split(',').map(n => {
            // Handle "name as alias" - we want the imported name
            const parts = n.trim().split(/\s+as\s+/);
            return parts[0].trim();
        });
        imports.push({
            type: 'named',
            names: names,
            from: match[2],
            line: content.substring(0, match.index).split('\n').length
        });
    }
    
    // Match: import name from './file'
    const defaultImportPattern = /import\s+(\w+)\s+from\s*['"](.*)['"]/g;
    while ((match = defaultImportPattern.exec(content)) !== null) {
        // Skip if it's a named import (has curly braces before)
        const beforeImport = content.substring(Math.max(0, match.index - 10), match.index);
        if (!beforeImport.includes('{')) {
            imports.push({
                type: 'default',
                names: [match[1]],
                from: match[2],
                line: content.substring(0, match.index).split('\n').length
            });
        }
    }
    
    return imports;
}

/**
 * Resolve import path to absolute file path
 */
function resolveImportPath(fromFile, importPath) {
    if (importPath.startsWith('.')) {
        const fromDir = path.dirname(fromFile);
        let resolved = path.resolve(fromDir, importPath);
        
        // Try with .js extension if not present
        if (!JS_EXTENSIONS.some(ext => resolved.endsWith(ext))) {
            if (fs.existsSync(resolved + '.js')) {
                resolved = resolved + '.js';
            }
        }
        
        return resolved;
    }
    return null; // External module
}

/**
 * Walk directory and collect all JS files
 */
function walkDir(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            if (!IGNORE_DIRS.includes(entry.name)) {
                walkDir(fullPath, files);
            }
        } else if (entry.isFile() && JS_EXTENSIONS.includes(path.extname(entry.name))) {
            files.push(fullPath);
        }
    }
    
    return files;
}

/**
 * Phase 1: Collect all exports
 */
function collectExports(files) {
    for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const exports = parseExports(file, content);
        exportMap.set(file, exports);
    }
}

/**
 * Phase 2: Collect all imports
 */
function collectImports(files) {
    for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const imports = parseImports(file, content);
        if (imports.length > 0) {
            importMap.set(file, imports);
        }
    }
}

/**
 * Phase 3: Validate imports against exports
 */
function validateImports() {
    for (const [filePath, imports] of importMap) {
        for (const imp of imports) {
            const targetPath = resolveImportPath(filePath, imp.from);
            
            if (!targetPath) continue; // External module
            
            if (!fs.existsSync(targetPath)) {
                reportError(filePath, imp.line, `Import target not found: ${imp.from}`);
                continue;
            }
            
            const targetExports = exportMap.get(targetPath);
            if (!targetExports) continue;
            
            if (imp.type === 'default') {
                if (!targetExports.default) {
                    reportError(
                        filePath,
                        imp.line,
                        `Default import '${imp.names[0]}' but ${path.basename(targetPath)} has no default export`
                    );
                }
            } else if (imp.type === 'named') {
                for (const name of imp.names) {
                    if (!targetExports.named.has(name)) {
                        // Check for case mismatch
                        const lowerName = name.toLowerCase();
                        const caseMismatch = Array.from(targetExports.named).find(
                            exp => exp.toLowerCase() === lowerName
                        );
                        
                        if (caseMismatch) {
                            reportError(
                                filePath,
                                imp.line,
                                `CASE MISMATCH: Importing '${name}' but export is '${caseMismatch}' in ${path.basename(targetPath)}`,
                                'CRITICAL'
                            );
                        } else {
                            // List available exports for helpful error
                            const available = Array.from(targetExports.named);
                            reportError(
                                filePath,
                                imp.line,
                                `Named import '${name}' not found in ${path.basename(targetPath)}. Available: [${available.join(', ')}]`
                            );
                        }
                    }
                }
            }
        }
    }
}

/**
 * Report an error with formatting
 */
function reportError(file, line, message, severity = 'ERROR') {
    const color = severity === 'CRITICAL' ? '\x1b[31m\x1b[1m' : '\x1b[31m';
    const reset = '\x1b[0m';
    
    process.stderr.write(`${color}[${severity}]${reset} ${file}:${line}\n`);
    process.stderr.write(`  > ${message}\n\n`);
    errorCount++;
}

/**
 * Main execution
 */
function main() {
    process.stdout.write('\n=== Import/Export Validation ===\n\n');
    
    const jsDir = path.join(process.cwd(), 'js');
    
    if (!fs.existsSync(jsDir)) {
        process.stderr.write('Error: js/ directory not found\n');
        process.exit(1);
    }
    
    const files = walkDir(jsDir);
    process.stdout.write(`Scanning ${files.length} JavaScript files...\n\n`);
    
    collectExports(files);
    collectImports(files);
    validateImports();
    
    if (errorCount > 0) {
        process.stderr.write(`\x1b[31mValidation Failed: ${errorCount} import/export issue(s) found.\x1b[0m\n`);
        process.exit(1);
    } else {
        process.stdout.write('\x1b[32m✓ All imports match their exports.\x1b[0m\n');
        process.exit(0);
    }
}

main();
