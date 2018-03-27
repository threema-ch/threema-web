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

export default [
    '$rootScope',
    '$timeout',
    '$filter',
    'WebClientService',
    function($rootScope: ng.IRootScopeService,
             $timeout: ng.ITimeoutService,
             $filter: ng.IFilterService,
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

                /**
                 * Return path to the default avatar.
                 */
                this.getDefaultAvatarUri = (type: threema.ReceiverType, highResolution: boolean) => {
                    switch (type) {
                        case 'group':
                            return highResolution ? 'img/ic_group_picture_big.png' : 'img/ic_group_t.png';
                        case 'contact':
                        case 'me':
                            return highResolution ? 'img/ic_contact_picture_big.png' : 'img/ic_contact_picture_t.png';
                        case 'distributionList':
                            return highResolution ? 'img/ic_distribution_list_t.png' : 'img/ic_distribution_list_t.png';
                    }
                    return null;
                };

                this.avatarToUri = (data: ArrayBuffer) => {
                    if (data === null || data === undefined) {
                        return '';
                    }
                    return ($filter('bufferToUrl') as (data: ArrayBuffer, mime: string) => string)(data, 'image/png');
                };

                this.getAvatarUri = () => {
                    if (this.avatarExists()) {
                        return this.avatarToUri(this.receiver.avatar[this.resolution]);
                    } else if (this.highResolution
                        && this.receiver.avatar !== undefined
                        && this.receiver.avatar.low !== undefined) {
                        return this.avatarToUri(this.receiver.avatar.low);
                    }
                    return this.getDefaultAvatarUri(this.type, this.highResolution);
                };

                this.requestAvatar = (inView: boolean) => {
                    if (this.avatarExists()) {
                        // do not request
                        return;
                    }

                    if (inView) {
                        if (loadingPromise === null) {
                            // Do not wait on high resolution avatar
                            const loadingTimeout = this.highResolution ? 0 : 500;
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

                this.showWorkIndicator = () => {
                    return this.type === 'contact'
                        && !this.highResolution
                        && (this.receiver as threema.ContactReceiver).identityType === threema.IdentityType.Work;
                };
                this.showBlocked = () => {
                    return this.type === 'contact'
                        && !this.highResolution
                        && (this.receiver as threema.ContactReceiver).isBlocked;
                };
            }],
            template: `
                <div class="avatar" ng-class="ctrl.avatarClass()">
                    <div class="avatar-loading" ng-if="ctrl.isLoading">
                        <span></span>
                    </div>
                    <div class="work-indicator" ng-if="ctrl.showWorkIndicator()"
                        translate-attr="{'aria-label': 'messenger.THREEMA_WORK_CONTACT',
                            'title': 'messenger.THREEMA_WORK_CONTACT'}">
                        <img src="img/ic_work_round.svg" alt="Threema Work user">
                    </div>
                    <div class="blocked-indicator"  ng-if="ctrl.showBlocked()"
                        translate-attr="{'aria-label': 'messenger.THREEMA_BLOCKED_RECEIVER',
                            'title': 'messenger.THREEMA_BLOCKED_RECEIVER'}">
                        <img src="img/ic_blocked_24px.svg" alt="blocked icon"/>
                    </div>
                    <img
                         ng-class="ctrl.avatarClass()"
                         ng-style="{ 'background-color': ctrl.backgroundColor }"
                         ng-src="{{ ctrl.getAvatarUri() }}"
                         in-view="ctrl.requestAvatar($inview)"/>
               </div>
            `,
        };
    },
];
