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

import {StateService as UiStateService} from '@uirouter/angularjs';

import {WebClientService} from '../services/webclient';

export default [
    '$timeout',
    '$state',
    'WebClientService',
    function(
        $timeout: ng.ITimeoutService,
        $state: UiStateService,
        webClientService: WebClientService,
    ) {

        const validateThreemaId = (id: string | null): boolean => {
            return id !== undefined && id !== null && /^([a-zA-Z0-9\*][a-zA-Z0-9]{7})$/.test(id);
        };
        const viewReceiver = (receiver: threema.Receiver) => {
            return function(e: Event) {
                if (!receiver) {
                    return false;
                }
                $state.go('messenger.home.detail', receiver);
            };
        };
        const addAction = (params: URLSearchParams) => {
            return function(e: Event) {
                const id = params.get('id');
                if (!validateThreemaId(id)) {
                    return false;
                }

                e.preventDefault();

                // Verify the receiver already exists
                const contactReceiver = webClientService.contacts.get(id);
                if (contactReceiver) {
                    return viewReceiver(contactReceiver)(e);
                }

                $state.go('messenger.home.create', {
                    type: 'contact',
                    initParams: {
                        identity: id,
                    },
                });
            };
        };

        const composeAction = (params: URLSearchParams) => {
            return function(e: Event) {
                const id = params.get('id');
                if (!validateThreemaId(id)) {
                    return false;
                }
                const text = params.get('text') || '';
                $state.go('messenger.home.conversation', {
                    type: 'contact',
                    id: id,
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

                        if (node.nodeType === Node.ELEMENT_NODE) {
                            switch ( node.tagName.toLowerCase()) {
                                case 'a':
                                    const link = (node as HTMLElement).innerText;
                                    if (link !== undefined) {
                                        if (link.toLowerCase().startsWith('threema://')) {
                                            const matches = (/\bthreema:\/\/([a-z]+)\?([^\s]+)\b/gi).exec(link);
                                            if (matches !== null) {
                                                const handler = getThreemaActionHandler(matches[1]);
                                                const params = new URLSearchParams(matches[2]);
                                                if (handler !== null) {
                                                    node.addEventListener('click', handler(params));
                                                }
                                            }
                                        } else if (link.toLowerCase().startsWith('https://threema.id/')) {
                                            // tslint:disable-next-line:max-line-length
                                            const matches = (/\bhttps:\/\/threema\.id\/([a-zA-Z0-9\*][a-zA-Z0-9]{7})\b/gi).exec(link);
                                            if (matches !== null) {
                                                node.addEventListener('click',  addAction(new URLSearchParams({id: matches[1]})));
                                            }
                                        }
                                    }
                                    break;
                                case 'span':
                                    // Support only id mentions (not all or me)
                                    const mentionCssClass = 'mention id';
                                    const cls = node.getAttribute('class');
                                    // Solved with the css classes, because angularJS removes
                                    // all other attributes from the DOMElement
                                    if (cls.substr(0, mentionCssClass.length) === mentionCssClass) {
                                        // Hack to extract the identity from class name
                                        const identity = cls.substring(mentionCssClass.length).trim();
                                        if (validateThreemaId(identity)) {
                                            const contactReceiver = webClientService.contacts.get(identity);
                                            node.addEventListener('click', viewReceiver(contactReceiver));
                                            node.setAttribute('class', cls + ' link');
                                            node.setAttribute('title', contactReceiver.displayName);
                                        }
                                    }

                                default:
                                    // ignore
                            }
                        }
                    }
                }, 0);
            },
        };
    },
];
