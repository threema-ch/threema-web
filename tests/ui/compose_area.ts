/**
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

// tslint:disable:no-console
// tslint:disable:no-reference

// Import AngularJS
import * as angular from 'angular';
import 'angular-material';
import 'angular-translate';

// Import dependencies
import config from '../../src/config';
import '../../src/directives';
import '../../src/filters';
import '../../src/services';

export function init() {
    console.info('Init UI Test: compose_area');

    const app = angular.module('uitest', [
        '3ema.directives',
        '3ema.filters',
        '3ema.services',
        'ngMaterial',
        'pascalprecht.translate',
    ]);
    app.constant('CONFIG', config);
    app.controller('ComposeAreaController', ComposeAreaController);

    // Provide mock translations
    app.config(function($translateProvider) {
        $translateProvider.translations('en', {
            messenger: {
                COMPOSE_MESSAGE: 'compose_message',
                COMPOSE_MESSAGE_DRAGOVER: 'compose_message_dragover',
            },
        });
        $translateProvider.preferredLanguage('en');
    });

    // Fix paths
    app.config(['$httpProvider', ($httpProvider: ng.IHttpProvider) => {
        $httpProvider.interceptors.push([() => {
            return {
                request: (conf) => {
                    if (conf.url.indexOf('partials/') !== -1 ||
                        conf.url.indexOf('directives/') !== -1 ||
                        conf.url.indexOf('components/') !== -1) {
                        conf.url = '../../src/' + conf.url;
                    }
                    return conf;
                },
            };
        }]);
    }]);

    // Bootstrap application
    angular.bootstrap(document, ['uitest']);
}

class ComposeAreaController {
    public static $inject = [];

    public initialData: threema.InitialConversationData;

    constructor() {
        this.initialData = {
            draft: '',
            initialText: '',
        };
    }

    public onInit(composeArea) {
        // tslint:disable-next-line:no-string-literal
        window['composeArea'] = composeArea;
    }

    public startTyping() {
        // ignore
    }

    public onTyping() {
        // ignore
    }

    public stopTyping() {
        // ignore
    }

    public onComposeKeyDown() {
        return true;
    }

    public submit(msgtype, data) {
        // ignore
    }
}
