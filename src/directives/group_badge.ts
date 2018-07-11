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

/**
 * Show a contact receiver with small avatar, name and verification level
 */
export default [
    '$translate',
    '$state',
    function($translate, $state: UiStateService) {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                groupReceiver: '=eeeGroupReceiver',
                contactReceiver: '=?eeeContactReceiver',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                this.click = () => {
                    $state.go('messenger.home.conversation', {
                        type: 'group',
                        id: this.groupReceiver.id,
                        initParams: null,
                    });
                };

                this.$onInit = function() {
                    this.showRoleIcon = this.contactReceiver !== undefined;
                    if (this.showRoleIcon) {
                        if (this.contactReceiver.id === this.groupReceiver.administrator) {
                            this.roleIcon = 'people';
                            $translate('messenger.GROUP_ROLE_CREATOR')
                                .then((label) => this.roleName = label);
                        } else {
                            this.roleIcon = 'people_outline';
                            $translate('messenger.GROUP_ROLE_NORMAL')
                                .then((label) => this.roleName = label);
                        }
                    }
                };
            }],
            template: `
                <div class="group-badge receiver-badge" ng-click="ctrl.click()">
                    <section class="avatar-box">
                        <eee-avatar eee-receiver="ctrl.groupReceiver"
                                    eee-resolution="'low'"></eee-avatar>
                    </section>
                    <div class="receiver-badge-name"
                        ng-bind-html="ctrl.groupReceiver.displayName | escapeHtml | emojify">
                    </div>
                    <div class="receiver-role" ng-if="ctrl.showRoleIcon" title="{{ctrl.roleLabel}}">
                        <md-icon aria-label="{{ctrl.roleLabel}}"  class="material-icons md-24">
                            {{ctrl.roleIcon}}
                        </md-icon>
                    </div>

                </div>
            `,
        };
    },
];
