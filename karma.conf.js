module.exports = function(config) {

    var configuration = {
        frameworks: ['jasmine'],
        mime: {
            'application/wasm': ['wasm'],
        },
        files: [
            // Angular core
            'node_modules/angular/angular.js',
            'node_modules/angular-aria/angular-aria.min.js',
            'node_modules/angular-animate/angular-animate.min.js',
            'node_modules/angular-sanitize/angular-sanitize.min.js',
            'node_modules/angular-route/angular-route.min.js',
            'node_modules/angular-material/angular-material.min.js',
            'node_modules/angular-translate/dist/angular-translate.min.js',

            // Angular mocking
            'node_modules/angular-mocks/angular-mocks.js',

            // SaltyRTC
            'node_modules/@saltyrtc/chunked-dc/dist/chunked-dc.es5.js',

            // App bundles
            'dist/generated/app_noinit.bundle.js',
            'dist/generated/unittest_karma.bundle.js',
            {pattern: 'dist/generated/[0-9].*.bundle.js', included: false, serve: true},
            {pattern: 'dist/generated/*.module.wasm', included: false, serve: true, type: 'wasm'},

            // Tests
            'tests/init.js',
            'tests/filters.js',
            'tests/service/message.js',
            'tests/service/mime.js',
            'tests/service/qrcode.js',
            'tests/service/uri.js',
            'tests/service/string.js',
            'tests/service/browser.js',
            'tests/service/keystore.js',
            'tests/service/log.js',
            'tests/service/notification.js',
            'tests/service/receiver.js',
        ],
        proxies: {
            // Also serve all generated files on the root.
            // This is required for the .wasm modules.
            '/dist/generated/': '/base/dist/generated/',
        },
        customLaunchers: {
            Chromium_ci_gitlab: {
                base: 'Chromium',
                flags: ['--no-sandbox'],
            },
            Chrome_ci_circle: {
                base: 'Chrome',
                flags: ['--no-sandbox'],
            },
        }
    };

    if (process.env.GITLAB_CI) {
        configuration.browsers = ['Chromium_ci_gitlab', 'Firefox'];
    } else if (process.env.CIRCLECI) {
        configuration.browsers = ['Chrome_ci_circle', 'Firefox'];
    } else {
        configuration.browsers = ['Chromium', 'Firefox'];
    }

    config.set(configuration);

};
