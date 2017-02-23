module.exports = function(config) {

    var configuration = {
        frameworks: ['jasmine'],
        files: [
            'node_modules/angular/angular.js',
            'node_modules/angular-mocks/angular-mocks.js',
            'dist/app.js',
            'tests/filters.js',
            'tests/service/qrcode.js',
            'tests/service/message.js',
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
