/**
 * pattern-config-checker.js
 * Validates production patterns.json and verifies malformed fixture is rejected.
 */

import fs from 'fs';
import path from 'path';

function readJson(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
}

function validatePatterns(patterns, sourceLabel) {
    const errors = [];

    if (!patterns || typeof patterns !== 'object' || Array.isArray(patterns)) {
        errors.push(`${sourceLabel}: root patterns must be an object`);
        return errors;
    }

    Object.entries(patterns).forEach(([patternName, pattern]) => {
        const prefix = `${sourceLabel}:${patternName}`;

        if (!pattern || typeof pattern !== 'object' || Array.isArray(pattern)) {
            errors.push(`${prefix} must be an object`);
            return;
        }

        if (!Array.isArray(pattern.entities) || pattern.entities.length === 0) {
            errors.push(`${prefix} must include a non-empty entities array`);
            return;
        }

        if (
            'durationOffset' in pattern &&
            (!Number.isFinite(pattern.durationOffset) || pattern.durationOffset <= 0)
        ) {
            errors.push(`${prefix} durationOffset must be a positive number when present`);
        }

        pattern.entities.forEach((entity, index) => {
            const entityPath = `${prefix}.entities[${index}]`;

            if (!entity || typeof entity !== 'object' || Array.isArray(entity)) {
                errors.push(`${entityPath} must be an object`);
                return;
            }

            const allowedTypes = [
                'hazard', 'platform', 'crumbling_platform', 'jump_pad', 'item',
                'obstacle', 'ice_spike', 'lava_geyser', 'neon_barrier'
            ];
            if (!allowedTypes.includes(entity.type)) {
                errors.push(`${entityPath}.type must be one of: ${allowedTypes.join(', ')}`);
            }

            if (!Number.isFinite(entity.dx)) {
                errors.push(`${entityPath}.dx must be a finite number`);
            }

            if ('dy' in entity && !Number.isFinite(entity.dy)) {
                errors.push(`${entityPath}.dy must be a finite number when present`);
            }

            if (entity.type === 'platform' || entity.type === 'crumbling_platform') {
                if ('width' in entity && (!Number.isFinite(entity.width) || entity.width <= 0)) {
                    errors.push(`${entityPath}.width must be a positive number when present`);
                }

                if ('height' in entity && (!Number.isFinite(entity.height) || entity.height <= 0)) {
                    errors.push(`${entityPath}.height must be a positive number when present`);
                }
            }
        });

        // Jump Playability Verification
        if (pattern.entities) {
            const platforms = pattern.entities
                .filter(ent => ent && (ent.type === 'platform' || ent.type === 'crumbling_platform'))
                .sort((a, b) => a.dx - b.dx);

            for (let i = 0; i < platforms.length - 1; i++) {
                const p1 = platforms[i];
                const p2 = platforms[i + 1];
                const w1 = ('width' in p1) ? p1.width : 100;
                const jumpDistance = p2.dx - (p1.dx + w1);
                
                if (jumpDistance > 450) {
                    console.warn(`[WARNING] Pattern "${patternName}" in ${sourceLabel}: jump distance between consecutive platforms is ${jumpDistance}px (exceeds playability threshold of 450px)`);
                }
            }
        }
    });

    return errors;
}

function failWithErrors(message, errors) {
    console.error(`\n❌ ${message}`);
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
}

console.log('\n=== Pattern Config Validation ===');

const workspaceRoot = process.cwd();
const productionPatternsPath = path.join(workspaceRoot, 'js', 'config', 'patterns.json');
const malformedFixturePath = path.join(workspaceRoot, 'tests', 'fixtures', 'patterns-malformed.fixture.json');

const productionData = readJson(productionPatternsPath);
const productionErrors = validatePatterns(productionData.patterns, 'production-patterns');

if (productionErrors.length > 0) {
    failWithErrors('Production patterns.json failed validation', productionErrors);
}

const malformedData = readJson(malformedFixturePath);
const malformedErrors = validatePatterns(malformedData.patterns, 'malformed-fixture');

if (malformedErrors.length === 0) {
    failWithErrors('Malformed fixture unexpectedly passed validation', [
        'Expected at least one validation error from tests/fixtures/patterns-malformed.fixture.json'
    ]);
}

console.log(`✓ Production patterns valid (${Object.keys(productionData.patterns).length} patterns checked)`);
console.log(`✓ Malformed fixture rejected as expected (${malformedErrors.length} validation errors)`);
