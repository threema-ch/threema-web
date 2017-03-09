/**
 * Copyright © 2016-2017 Threema GmbH (https://threema.ch/).
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

import config from './config';
import './controllers';
import './directives';
import './filters';
import './partials/messenger';
import './partials/welcome';
import './services';
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

    // 3rd party
    'ui.router',
    'angular-inview',
    'monospaced.qrcode',
    'luegg.directives',
    'pascalprecht.translate',
    'ngMaterial',

    // Own
    '3ema.filters',
    '3ema.directives',
    '3ema.container',
    '3ema.services',
    '3ema.controllers',
    '3ema.welcome',
    '3ema.messenger',
])

// Set versions
.value('VERSION', '0.0.1')
.value('PROTOCOL_VERSION', 1)

// Configuration object
.constant('CONFIG', config)

// Set cache bust parameter
.constant('CACHE_BUST', 'v=[[VERSION]]')

// Constants to be used by controllers
.constant('BROWSER_MIN_VERSIONS', {
    FF: 47,
    CHROME: 45,
    OPERA: 32,
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
            request: (config) => {
                if (config.url.indexOf('partials/') !== -1 ||
                    config.url.indexOf('directives/') !== -1 ||
                    config.url.indexOf('i18n/') !== -1) {
                    const separator = config.url.indexOf('?') === -1 ? '?' : '&';
                    config.url = config.url + separator + CACHE_BUST;
                }
                return config;
            },
        };
    }]);
}])

;
