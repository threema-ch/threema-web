/**
 * Copyright © 2016-2021 Threema GmbH (https://threema.ch/).
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

// tslint:disable:no-console

// A dependency graph that contains any wasm must all be imported asynchronously.
import('./app')
    .then(() => {
        console.info('Bundle loaded, bootstrapping application.');
        // register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(function (registration) {
                    console.info('Service worker registration successful, scope is:', registration.scope);
                })
                .catch(function (error) {
                    console.warn('Service worker registration failed, error:', error);
                });
        }
        angular.bootstrap(document, ['3ema']);
    })
    .catch((e) => console.error('Could not bootstrap application', e));
