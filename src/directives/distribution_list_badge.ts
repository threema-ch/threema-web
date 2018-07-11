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
 * Show a distribution list receiver with small avatar, name and verification level
 */
export default [
    '$state',
    function($state: UiStateService) {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                distributionListReceiver: '=eeeDistributionListReceiver',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                this.click = () => {
                    $state.go('messenger.home.conversation', {
                        type: 'distributionList',
                        id: this.distributionListReceiver.id,
                        initParams: null,
                    });
                };
            }],
            template: `
                <div class="distribution-list-badge receiver-badge" ng-click="ctrl.click()">
                    <section class="avatar-box">
                        <eee-avatar eee-receiver="ctrl.distributionListReceiver"
                                    eee-resolution="'low'"></eee-avatar>
                    </section>
                    <div class="receiver-badge-name"
                        ng-bind-html="ctrl.distributionListReceiver.displayName | escapeHtml | emojify">
                    </div>

                </div>
            `,
        };
    },
];
