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
import {UriService} from '../services/uri';

export default [
    '$timeout',
    '$state',
    'UriService',
    function($timeout, $state: ng.ui.IStateService, uriService: UriService) {

        const validateThreemaId = (id: string): boolean => {
            return id !== undefined && id !== null && /^[0-9A-Z]{8}/.test(id);
        };

        const addAction = (params) => {
            return function(e: Event) {
                if (!validateThreemaId(params.id)) {
                    return false;
                }
                $state.go('messenger.home.create', {
                    type: 'contact',
                    initParams: {
                        identity: params.id,
                    },
                });
            };
        };

        const composeAction = (params) => {
            return function(e: Event) {
                if (!validateThreemaId(params.id)) {
                    return false;
                }
                const text = params.text || '';
                $state.go('messenger.home.conversation', {
                    type: 'contact',
                    id: params.id,
                    initParams: {
                        text: text,
                    },
                });
            };
        };

        const getThreemaActionHandler = (name: string) => {
            switch (name.toLowerCase()) {
                case 'add':
                    return addAction;
                case 'compose':
                    return composeAction;
                default:
                    return null;
            }
        };

        return {
            restrict: 'A',
            scope: {},
            link(scope, el, attrs) {
                $timeout(() => {
                    // tslint:disable-next-line: prefer-for-of (see #98)
                    for (let i = 0; i < el[0].childNodes.length; i++) {
                        const node: HTMLElement = el[0].childNodes[i];

                        if (node.nodeType === Node.ELEMENT_NODE
                            && node.tagName.toLowerCase() === 'a') {

                            const link = (node as HTMLElement).innerText;
                            if (link !== undefined && link.toLowerCase().startsWith('threema://')) {
                                const matches = (/\bthreema:\/\/([a-z]+)\?([^\s]+)\b/gi).exec(link);
                                if (matches !== null) {
                                    const handler = getThreemaActionHandler(matches[1]);
                                    const params = uriService.parseQueryParams(matches[2]);
                                    if (handler !== null && params !== null) {
                                        node.addEventListener('click', handler(params));
                                    }
                                }
                            }
                        }
                    }
                }, 0);
            },
        };
    },
];
