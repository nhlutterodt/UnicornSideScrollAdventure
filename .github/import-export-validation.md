# Import/Export Validation System

## Overview
The import-export checker validates that all ES6 module imports match their corresponding exports, catching issues like:
- **Case mismatches** (importing `Logger` when export is `logger`)
- **Missing exports** (importing something that doesn't exist)
- **Default vs named import mismatches**
- **Broken import paths**

## Usage

### Run All Quality Checks
```bash
npm test
# Runs: standard-checker.js && import-export-checker.js
```

### Run Import/Export Check Only
```bash
npm run test:imports
# or
node scripts/import-export-checker.js
```

### Other Test Commands
```bash
npm run test:standards  # Style/standards check only
npm run test:console    # Console usage check only
```

## How It Works

The checker operates in three phases:

### Phase 1: Collect Exports
Scans all `.js` files and parses:
```javascript
export const myVar = ...        // Named export: "myVar"
export class MyClass { }        // Named export: "MyClass"
export { name1, name2 }         // Named exports: "name1", "name2"
export default MyClass          // Default export
```

### Phase 2: Collect Imports
Scans all import statements:
```javascript
import { name1, name2 } from './file'  // Named imports
import MyDefault from './file'         // Default import
import { old as new } from './file'    // Aliased import (checks "old")
```

### Phase 3: Validate
For each import:
1. Resolve import path to absolute file path
2. Check if target file exists
3. Verify exported names match imported names
4. **Special check**: Case-insensitive matching to catch case mismatches

## Example Errors

### Case Mismatch (CRITICAL)
```
[CRITICAL] D:\project\js\Dom.js:2
  > CASE MISMATCH: Importing 'Logger' but export is 'logger' in Logger.js
```

**Fix**:
```javascript
// Before (wrong)
import { Logger } from './Logger.js';

// After (correct)
import { logger } from './Logger.js';
```

### Missing Export
```
[ERROR] D:\project\js\Game.js:5
  > Named import 'ParticleEngine' not found in ParticleSystem.js. 
    Available: [ParticleSystem, createParticle]
```

**Fix**: Use one of the available exports or add the missing export.

### Default Import Mismatch
```
[ERROR] D:\project\js\main.js:1
  > Default import 'Config' but Config.js has no default export
```

**Fix**: Use named import instead:
```javascript
// Before (wrong)
import Config from './Config.js';

// After (correct)
import { Config } from './Config.js';
```

## Naming Convention Enforcement

The checker enforces consistent naming patterns:

### ✅ Correct Patterns
```javascript
// File: Logger.js
class Logger { }
export const logger = new Logger();  // Singleton instance

// Usage:
import { logger } from './Logger.js';
logger.info('message');
```

```javascript
// File: Config.js
export const Config = { ... };  // Named export matches filename

// Usage:
import { Config } from './Config.js';
```

### ❌ Common Mistakes

**Mistake 1: Uppercase/lowercase confusion**
```javascript
// Export (lowercase)
export const logger = new Logger();

// Import (uppercase - WRONG!)
import { Logger } from './Logger.js';  // ❌
```

**Mistake 2: Wrong export type**
```javascript
// File exports named
export class MyClass { }

// Import expects default
import MyClass from './MyClass.js';  // ❌
```

**Mistake 3: Typos**
```javascript
// Export
export const ParticleSystem = ...;

// Import (typo)
import { ParticleSytem } from './ParticleSystem.js';  // ❌
```

## Integration with CI/CD

### Pre-commit Hook
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/sh
npm test
if [ $? -ne 0 ]; then
    echo "Quality checks failed. Commit aborted."
    exit 1
fi
```

### GitHub Actions
```yaml
name: Quality Check
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run quality checks
        run: npm test
```

## Configuration

### Ignored Directories
Edit `scripts/import-export-checker.js`:
```javascript
const IGNORE_DIRS = ['node_modules', '.git', 'docs', 'scripts'];
```

### File Extensions
```javascript
const JS_EXTENSIONS = ['.js', '.mjs'];
```

## Troubleshooting

### False Positives

**Issue**: Checker reports error for external modules
```
[ERROR] Cannot find module 'react'
```
**Solution**: Checker should skip external imports (non-relative paths). This is a bug if you see this.

**Issue**: Dynamic imports not detected
```javascript
const module = await import('./dynamic.js');  // Not checked
```
**Solution**: This is expected - only static imports are validated.

### Performance

For large codebases:
- **Typical run time**: <1 second for 50 files
- **Memory usage**: ~50MB
- **Parallelization**: Not implemented (single-threaded)

## Best Practices

### 1. Consistent Export Style
```javascript
// ✅ GOOD - One style per file
export const Config = { ... };
export const logger = new Logger();

// ❌ BAD - Mixed styles
export default Config;
export const logger = ...;
```

### 2. Explicit Named Exports
```javascript
// ✅ GOOD - Clear what's exported
export class MyClass { }
export const helper = () => {};

// ❌ BAD - Hidden exports
class MyClass { }
const helper = () => {};
export { MyClass, helper };  // Hard to find
```

### 3. Match Filename to Export
```javascript
// File: ParticleSystem.js
export class ParticleSystem { }  // ✅ Matches filename

// File: particle.js
export class ParticleEngine { }  // ⚠️ Confusing
```

### 4. Singleton Pattern
```javascript
// Logger.js
class Logger {
    constructor() { this.enabled = true; }
    info(msg) { console.log(msg); }
}

export const logger = new Logger();  // ✅ Lowercase singleton
```

## Comparison with Other Tools

| Feature | import-export-checker | ESLint | TypeScript |
|---------|----------------------|--------|------------|
| Case mismatch detection | ✅ Yes (CRITICAL flag) | ❌ No | ⚠️ Maybe |
| Import path validation | ✅ Yes | ⚠️ Partial | ✅ Yes |
| Export existence check | ✅ Yes | ❌ No | ✅ Yes |
| Setup complexity | ✅ Zero config | ⚠️ Config needed | ⚠️ tsconfig needed |
| Runtime | < 1s | 2-5s | 5-10s |
| Vanilla JS support | ✅ Perfect | ✅ Yes | ❌ Needs types |

## Future Enhancements

### Planned Features
- [ ] Circular dependency detection
- [ ] Unused export warnings
- [ ] Import order validation
- [ ] Namespace collision detection
- [ ] Performance: Parallel file processing

### Won't Implement
- Dynamic import validation (too complex)
- Type checking (use TypeScript)
- Bundle size analysis (use webpack-bundle-analyzer)

## Related Documentation
- [Coding Standards](../docs/coding_standards.md) - Export style guidelines
- [Quality Protocol](../docs/ai_quality_protocol.md) - Overall quality standards
- [Standard Checker](./standard-checker.js) - Inline CSS/JS validation

---

**Version**: 1.0.0  
**Last Updated**: January 23, 2026  
**Maintainer**: Project quality automation
