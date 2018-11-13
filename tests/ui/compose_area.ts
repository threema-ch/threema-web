/**
 * Copyright © 2016-2018 Threema GmbH (https://threema.ch/).
 *
 * This file is part of Threema Web.
 */

// tslint:disable:no-console
// tslint:disable:no-reference

// Import AngularJS
import * as angular from 'angular';
import 'angular-material';
import 'angular-translate';

// Import types
import '../../src/threema.d';

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
                    } else if (conf.url.indexOf('css/') !== -1 ||
                        conf.url.indexOf('fonts/') !== -1 ||
                        conf.url.indexOf('i18n/') !== -1 ||
                        conf.url.indexOf('img/') !== -1 ||
                        conf.url.indexOf('libs/') !== -1 ||
                        conf.url.indexOf('sounds/') !== -1) {
                        conf.url = '../../public/' + conf.url;
                    }
                    return conf;
                },
            };
        }]);
    }]);
}

export class ComposeAreaController {
    public static $inject = [];

    public initialData: threema.InitialConversationData;

    constructor() {
        this.initialData = {
            draft: '',
            initialText: '',
        };
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
