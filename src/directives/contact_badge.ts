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

import {StateService as UiStateService} from '@uirouter/angularjs';

import {hasValue} from '../helpers';
import {WebClientService} from '../services/webclient';

/**
 * Show a contact receiver with small avatar, name and verification level
 */
export default [
    'WebClientService',
    '$state',
    function(webClientService: WebClientService, $state: UiStateService) {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                identity: '=?eeeIdentity',
                contactReceiver: '=?eeeContact',
                linked: '=?eeeLinked',
                onRemove: '=?eeeOnRemove',
            },
            link: function(scope, elem, attrs) {
                // Manual change detection: Identity
                scope.$watch(
                    () => scope.ctrl.identity,
                    (newIdentity, oldIdentity) => {
                        if (hasValue(newIdentity) && newIdentity !== oldIdentity) {
                            scope.ctrl.updateReceiverData();
                        }
                    },
                );
                // Manual change detection: Contact receiver
                scope.$watch(
                    () => scope.ctrl.contactReceiver,
                    (newReceiver, oldReceiver) => {
                        if (hasValue(newReceiver)) {
                            if (!hasValue(oldReceiver) || newReceiver.id !== oldReceiver.id) {
                                scope.ctrl.updateReceiverData();
                            }
                        }
                    },
                );
            },
            controllerAs: 'ctrl',
            controller: [function() {
                this.click = () => {
                    if (this.linked !== undefined
                        && this.linked === true) {
                        $state.go('messenger.home.conversation', {type: 'contact', id: this.identity, initParams: null});
                    }
                };

                this.showActions = this.onRemove !== undefined;

                this.updateReceiverData = () => {
                    // Either a receiver or an identity is set
                    if (this.contactReceiver === undefined) {
                        this.contactReceiver = webClientService.contacts.get(this.identity);
                    } else {
                        this.identity = this.contactReceiver.id;
                    }
                };

                this.$onInit = function() {
                    this.updateReceiverData();
                };
            }],
            template: `
                <div class="contact-badge receiver-badge" ng-click="ctrl.click()">
                    <section class="avatar-box">
                        <eee-avatar eee-receiver="ctrl.contactReceiver"
                                    eee-resolution="'low'"></eee-avatar>
                    </section>
                    <div class="receiver-badge-name"
                        ng-bind-html="ctrl.contactReceiver.displayName | escapeHtml | emojify">
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
