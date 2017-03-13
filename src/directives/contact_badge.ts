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

/**
 * Show a contact receiver with small avatar, name and verification level
 */
export default [
    'WebClientService',
    '$state',
    function(webClientService: WebClientService, $state: ng.ui.IStateService) {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                identity: '=?eeeIdentity',
                contactReceiver: '=?eeeContact',
                linked: '=?eeeLinked',
                onRemove: '=?eeeOnRemove',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                if (this.contactReceiver === undefined) {
                    this.contactReceiver = webClientService.contacts.get(this.identity);
                } else {
                    this.identity = this.contactReceiver.id;
                }

                this.click = () => {
                    if (this.linked !== undefined
                        && this.linked === true) {
                        $state.go('messenger.home.conversation', {type: 'contact', id: this.identity});
                    }
                };

                this.showActions = this.onRemove !== undefined;
            }],
            template: `
                <div class="contact-badge receiver-badge" ng-click="ctrl.click()">
                    <section class="avatar-box">
                        <eee-avatar eee-type="'contact'"
                                    eee-receiver="ctrl.contactReceiver"
                                    eee-resolution="'low'"></eee-avatar>
                    </section>
                    <div class="receiver-badge-name">
                        {{ctrl.contactReceiver.displayName}}
                    </div>
                    <div class="contact-badge-identity">
                        {{ctrl.contactReceiver.id}}
                    </div>
                    <div class="contact-badge-actions" ng-if="ctrl.showActions">
                        <md-button aria-label="Remove" class="md-icon-button" ng-click="ctrl.onRemove(ctrl.contactReceiver)">
                            <i class="material-icons md-dark md-24">delete</i>
                        </md-button>
                    </div>

                </div>
            `,
        };
    },
];
