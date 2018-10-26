/**
 * Copyright © 2016-2018 Threema GmbH (https://threema.ch/).
 *
 * This file is part of Threema Web.
 *
 * Threema Web is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
 * General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Threema Web. If not, see <http://www.gnu.org/licenses/>.
 */

import {AsyncEvent} from 'ts-events';

import './components';
import config from './config';
import './controllers';
import './directives';
import './filters';
import './partials/messenger';
import './partials/welcome';
import './services';
import {BrowserService} from './services/browser';
import './threema/container';

// Configure asynchronous events
AsyncEvent.setScheduler(function(callback) {
    // Replace the default setImmediate() call by a setTimeout(, 0) call
    setTimeout(callback, 0);
});

// Create app module and set dependencies
angular.module('3ema', [
    // Angular
    'ngAnimate',
    'ngSanitize',
    'ngAria',

    // 3rd party
    'ui.router',
    'angular-inview',
    'monospaced.qrcode',
    'luegg.directives',
    'pascalprecht.translate',
    'ngMaterial',

    // Own
    '3ema.filters',
    '3ema.components',
    '3ema.directives',
    '3ema.container',
    '3ema.services',
    '3ema.controllers',
    '3ema.welcome',
    '3ema.messenger',
])

// Set versions
.value('VERSION', '[[VERSION]]')
.value('PROTOCOL_VERSION', 2)

// Configuration object
.constant('CONFIG', config)

// Set cache bust parameter
.constant('CACHE_BUST', 'v=[[VERSION]]')

// Constants to be used by controllers
.constant('BROWSER_MIN_VERSIONS', {
    FF: 50,
    CHROME: 45,
    OPERA: 32,
    SAFARI: 10,
})

// Set default route
.config(['$urlRouterProvider', ($urlRouterProvider) => {
    $urlRouterProvider.otherwise('/welcome');
}])

// Configure i18n / l10n
.config(['$translateProvider', ($translateProvider: ng.translate.ITranslateProvider) => {
    $translateProvider.useSanitizeValueStrategy('sanitizeParameters');
    $translateProvider.useMessageFormatInterpolation();
    $translateProvider
        .useStaticFilesLoader({
            prefix: 'i18n/',
            suffix: '.json',
        })
        .uniformLanguageTag('java')
        .registerAvailableLanguageKeys(['en', 'de'], {
            'en_*': 'en',
            'de_*': 'de',
        })
        .determinePreferredLanguage()
        .fallbackLanguage('en');
}])

// Configure theme
.config(['$mdThemingProvider', ($mdThemingProvider) => {
    $mdThemingProvider.theme('default')
        .primaryPalette('grey', {
             default: '800',
        })
        .accentPalette('teal', {
            default: '500',
        });
}])

// Optimizations: https://docs.angularjs.org/guide/production
.config(['$compileProvider', ($compileProvider) => {
    // Disable debug info for improved performance
    // TODO: Somehow breaks overflow: scroll on chat window.
    // Comment for now.
    // $compileProvider.debugInfoEnabled(false);
}])

// Add cache busting parameter to some HTTP requests
.config(['$httpProvider', ($httpProvider: ng.IHttpProvider) => {
    $httpProvider.interceptors.push(['CACHE_BUST', (CACHE_BUST: string) => {
        return {
            request: (conf) => {
                if (conf.url.indexOf('partials/') !== -1 ||
                    conf.url.indexOf('directives/') !== -1 ||
                    conf.url.indexOf('components/') !== -1 ||
                    conf.url.indexOf('i18n/') !== -1) {
                    const separator = conf.url.indexOf('?') === -1 ? '?' : '&';
                    conf.url = conf.url + separator + CACHE_BUST;
                }
                return conf;
            },
        };
    }]);
}])

.run([
    '$log', 'CONFIG', 'BrowserService',
    function($log: ng.ILogService, CONFIG: threema.Config, browserService: BrowserService) {
        // For Safari (when in DEBUG mode), monkey-patch $log to show timestamps.

        if (!(CONFIG.DEBUG && browserService.getBrowser().isSafari(false))) {
            return;
        }

        const oldLog = $log.log;
        const oldInfo = $log.info;
        const oldWarn = $log.warn;
        const oldDebug = $log.debug;
        const oldError = $log.error;

        function enhanceLogging(wrapped) {
            return function(data) {
                const now = new Date();
                const currentDate = `[${now.toISOString()}.${now.getMilliseconds()}]`;
                wrapped.apply(this, [currentDate, ...arguments]);
            };
        }

        $log.log = enhanceLogging(oldLog);
        $log.info = enhanceLogging(oldInfo);
        $log.warn = enhanceLogging(oldWarn);
        $log.debug = enhanceLogging(oldDebug);
        $log.error = enhanceLogging(oldError);
    },
])

;
