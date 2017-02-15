module.exports = function(config) {

    var configuration = {
        frameworks: ['jasmine'],
        files: [
            'node_modules/angular/angular.js',
            'node_modules/angular-mocks/angular-mocks.js',
            'dist/app.js',
            'tests/filters.js',
            'tests/qrcode.js',
        ],
        customLaunchers: {
            Chromium_ci: {
                base: 'Chromium',
                flags: ['--no-sandbox'],
            },
        }
    };

    if (process.env.GITLAB_CI) {
        configuration.browsers = ['Chromium_ci', 'Firefox'];
    } else {
        configuration.browsers = ['Chromium', 'Firefox'];
    }

    config.set(configuration);

}
