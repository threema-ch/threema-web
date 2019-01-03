/**
 * Bundle the application.
 */

// Parse argument
const requiredTargets = 'Must be one of "app", "tests:unit" or "tests:ui".';
const target = process.argv[2];
if (target === undefined) {
    console.error('Missing target. ' + requiredTargets);
    process.exit(1);
}

// Import libs
const fs = require('fs');
const browserify = require('browserify');
const babelifyConfig = require('./babelify-config.js');

// Choose target entry point
let b;
switch (target) {
    case 'app':
        b = browserify('./src/app.ts');
        break;
    case 'test:unit':
        b = browserify('./tests/ts/main.ts');
        break;
    case 'test:ui':
        b = browserify('./tests/ui/main.ts');
        break;
    default:
        console.error(`Invalid target: ${target}. ${requiredTargets}`);
        process.exit(2);
        return;
}

// Convert TypeScript
b.plugin('tsify');

// Babelify
b.transform('babelify', babelifyConfig);

// Add header comment
if (target === 'app') {
    b.plugin('browserify-header', {
        'file': 'header.js',
    })
}

// Generate bundle
switch (target) {
    case 'app':
        b.bundle().pipe(fs.createWriteStream('dist/app.js'));
        break;
    case 'test:unit':
        b.bundle().pipe(fs.createWriteStream('dist/ts-tests.js'));
        break;
    case 'test:ui':
        b.bundle().pipe(fs.createWriteStream('dist/ui-tests.js'));
        break;
}
