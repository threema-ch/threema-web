module.exports = function(config) {

    var configuration = {
        frameworks: ['jasmine'],
        files: [
            'node_modules/angular/angular.js',
            'node_modules/angular-mocks/angular-mocks.js',
            'node_modules/angular-translate/dist/angular-translate.min.js',
            'node_modules/angular-aria/angular-aria.min.js',
            'node_modules/angular-animate/angular-animate.min.js',
            'node_modules/angular-material/angular-material.min.js',
            'node_modules/@saltyrtc/chunked-dc/dist/chunked-dc.es5.js',
            'node_modules/autolinker/dist/Autolinker.min.js',
            'node_modules/regenerator-runtime/runtime.js',
            'dist/app.js',
            'dist/ts-tests.js',
            'tests/filters.js',
            'tests/service/message.js',
            'tests/service/mime.js',
            'tests/service/qrcode.js',
            'tests/service/uri.js',
            'tests/service/webclient.js',
            'tests/service/string.js',
            'tests/service/browser.js',
            'tests/service/keystore.js',
            'tests/service/notification.js',
            'tests/helpers.js',
        ],
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

}
