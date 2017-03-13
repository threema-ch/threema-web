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

import {WebClientService} from '../services/webclient';

// tslint:disable:max-line-length

export default [
    'WebClientService',
    function(webClientService: WebClientService) {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                quote: '=eeeQuote',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                this.contact = webClientService.contacts.get(this.quote.identity);
                this.text = this.quote.text;
            }],
            template: `
                <div class="message-quote-content" ng-style="{'border-color': ctrl.contact.color}">
                    <span class="message-name" ng-style="{'color': ctrl.contact.color}">{{ ctrl.contact.displayName }}</span>
                    <span class="message-quote" ng-bind-html="ctrl.text | escapeHtml | nlToBr | emojify | linkify | markify"></span>
                </div>
            `,
        };
    },
];
