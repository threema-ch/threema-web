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

import {WebClientService} from "../services/webclient";

export default [
    '$rootScope',
    '$timeout',
    'WebClientService',
    function($rootScope: ng.IRootScopeService,
             $timeout: ng.ITimeoutService,
             webClientService: WebClientService) {
        return {
            restrict: 'E',
            scope: {},
            bindToController: {
                type: '=eeeType',
                receiver: '=eeeReceiver',
                resolution: '=eeeResolution',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                this.highResolution = this.resolution === 'high';
                this.isLoading = this.highResolution;
                this.backgroundColor = this.receiver.color;
                let loadingPromise: ng.IPromise<any> = null;
                this.avatarClass = () => {
                    return 'avatar-' + this.resolution + (this.isLoading ? ' is-loading' : '');
                };

                this.avatarExists = () => {
                    if (this.receiver.avatar === undefined
                        || this.receiver.avatar[this.resolution] === undefined) {
                        return false;
                    }
                    this.isLoading = false;
                    // Reset background color
                    this.backgroundColor = null;
                    return true;
                };

                this.getAvatar = () => {
                    if (this.avatarExists()) {
                        return this.receiver.avatar[this.resolution];
                    } else if (this.highResolution && this.receiver.avatar.low !== undefined) {
                        return this.receiver.avatar.low;
                    }
                    return webClientService.defaults.getAvatar(this.type, this.highResolution);
                };

                this.requestAvatar = (inView: boolean) => {
                    if (this.avatarExists()) {
                        // do not request
                        return;
                    }

                    if (inView) {
                        if (loadingPromise === null) {
                            // Do not wait on high resolution avatar
                            let loadingTimeout = this.highResolution ? 0 : 500;
                            loadingPromise = $timeout(() => {
                                // show loading only on high res images!
                                webClientService.requestAvatar({
                                    type: this.type,
                                    id: this.receiver.id,
                                } as threema.Receiver, this.highResolution).then((avatar) => {
                                    $rootScope.$apply(() => {
                                        this.isLoading = false;
                                    });
                                }).catch(() => {
                                    $rootScope.$apply(() => {
                                        this.isLoading = false;
                                    });
                                });
                            }, loadingTimeout);
                        }
                    } else if (loadingPromise !== null) {
                        // Cancel pending avatar loading
                        $timeout.cancel(loadingPromise);
                        loadingPromise = null;
                    }
                };
            }],
            template: `
                <div class="avatar" ng-class="ctrl.avatarClass()">
                    <div class="avatar-loading" ng-if="ctrl.isLoading">
                        <span></span>
                    </div>
                    <img
                         ng-class="ctrl.avatarClass()"
                         ng-style="{ 'background-color': ctrl.backgroundColor }"
                         ng-src="{{ ctrl.getAvatar() }}"
                         in-view="ctrl.requestAvatar($inview)"/>
               </div>
            `,
        };
    },
];
