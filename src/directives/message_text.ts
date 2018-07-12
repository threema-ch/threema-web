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

// tslint:disable:max-line-length

import {WebClientService} from '../services/webclient';

export default [
    function() {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                message: '=eeeMessage',
                multiLine: '=?eeeMultiLine',
            },
            controllerAs: 'ctrl',
            controller: ['WebClientService', function(webClientService: WebClientService) {
                // Get text depending on type
                function getText(message: threema.Message) {
                    switch (message.type) {
                        case 'text':
                            return message.body;
                        case 'location':
                            return message.location.description;
                        case 'file':
                            // Prefer caption for file messages, if available
                            if (message.caption && message.caption.length > 0) {
                                return message.caption;
                            }
                            return message.file.name;
                    }
                    return message.caption;
                }

                this.enlargeSingleEmoji = webClientService.appConfig.largeSingleEmoji;

                this.$onInit = function() {
                    // Escaping will be done in the HTML using filters
                    this.text = getText(this.message);
                    if (this.multiLine === undefined) {
                        this.multiLine = true;
                    }
                };
            }],
            template: `
                <span click-action
                    ng-bind-html="ctrl.text | escapeHtml | markify | emojify | enlargeSingleEmoji:ctrl.enlargeSingleEmoji | mentionify | linkify | nlToBr:ctrl.multiLine">
                </span>
            `,
        };
    },
];
