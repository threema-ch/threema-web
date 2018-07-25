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
            'dist/app.js',
            'dist/ts-tests.js',
            'tests/filters.js',
            'tests/service/message.js',
            'tests/service/mime.js',
            'tests/service/qrcode.js',
            'tests/service/uri.js',
            'tests/service/webclient.js',
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
