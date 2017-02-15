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

export default [
    '$window',
    'TrustedKeyStore',
    'StateService',
    function($window: ng.IWindowService,
             trustedKeyStore: threema.TrustedKeyStoreService,
             stateService: threema.StateService) {
        return {
            restrict: 'E',
            scope: {},
            bindToController: {
                active: '=',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                this.logout = () => {
                    trustedKeyStore.clearTrustedKey();
                    $window.location.reload();
                };
                this.stateService = stateService;
            }],
            template: `
                <div id="expanded-status-bar" ng-class="{'active': ctrl.active}">
                    <div>
                        <md-progress-circular class="md-accent" md-diameter="32"></md-progress-circular>
                    </div>
                    <div>
                        <h1 translate>connecting.CONNECTION_PROBLEMS</h1>
                        <p class="details" ng-if="ctrl.stateService.progress < 100">
                            <span ng-if="ctrl.stateService.connectionBuildupState === 'new'" translate>connecting.RECOVERING_CONNECTION</span>
                            <span ng-if="ctrl.stateService.connectionBuildupState === 'push'" translate>connecting.WAITING_FOR_APP</span>
                            <span ng-if="ctrl.stateService.connectionBuildupState === 'manual_start'" translate>connecting.WAITING_FOR_APP_MANUAL</span>
                            <span ng-if="ctrl.stateService.connectionBuildupState === 'connecting'" translate>connecting.CONNECTING_TO_SERVER</span>
                            <span ng-if="ctrl.stateService.connectionBuildupState === 'waiting'" translate>connecting.CONNECTING_TO_APP</span>
                            <span ng-if="ctrl.stateService.connectionBuildupState === 'peer_handshake'" translate>connecting.CONNECTING_TO_APP</span>
                        </p>
                        <p class="details" ng-if="ctrl.stateService.progress === 100" translate>connecting.RECOVERING_CONNECTION</p>
                    </div>
                    <div ng-show="ctrl.stateService.connectionBuildupState !== 'done'">
                        <span class="progress">{{ ctrl.stateService.progress }}%</span>
                    </div>
                </div>
            `,
        };
    },
];
