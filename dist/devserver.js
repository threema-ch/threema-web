/**
 * Run the devserver.
 *
 * IMPORTANT: Configuration should match `dist/browserify.js`!
 */

const budo = require('budo')
const babelify = require('babelify')
const babelifyConfig = require('./babelify-config.js');
const tsify = require('tsify');

budo('src/app.ts:dist/app.js', {
    dir: ['public', '.', 'src'],
    live: true,
    stream: process.stdout,
    port: 9966,
    debug: true,
    //browserify: {  // TODO: See #705
    //    plugin: tsify,
    //    transform: [babelify.configure(babelifyConfig)],
    //},
    browserifyArgs: ['-d', '-p', 'tsify', '-t', '[', 'babelify', '--presets', '[', '@babel/env', ']', '--extensions', '.ts', ']'],
}).on('connect', (ev) => {
    console.log('Server running on %s', ev.uri);
}).on('update', (buffer) => {
    console.log('Bundle update, %d bytes', buffer.length);
});
