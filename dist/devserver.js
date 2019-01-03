/**
 * Run the devserver.
 *
 * IMPORTANT: Configuration should match `dist/browserify.js`!
 */

const budo = require('budo')
const babelify = require('babelify')
const babelifyConfig = require('./babelify-config.js');

budo(null, {
    dir: ['public', '.', 'src'],
    live: true,
    stream: process.stdout,
    port: 9966,
    debug: true,
    browserify: {
        transform: [babelify, babelifyConfig]
    },
});
