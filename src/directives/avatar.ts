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

import {bufferToUrl, logAdapter} from '../helpers';
import {isEchoContact, isGatewayContact} from '../receiver_helpers';
import {WebClientService} from '../services/webclient';
import {isContactReceiver} from '../typeguards';

export default [
    '$rootScope',
    '$timeout',
    '$log',
    'WebClientService',
    function($rootScope: ng.IRootScopeService,
             $timeout: ng.ITimeoutService,
             $log: ng.ILogService,
             webClientService: WebClientService) {
        return {
            restrict: 'E',
            scope: {},
            bindToController: {
                receiver: '=eeeReceiver',
                resolution: '=eeeResolution',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                this.logTag = '[Directives.Avatar]';

                let loadingPromise: ng.IPromise<any> = null;

                /**
                 * Convert avatar bytes to an URI.
                 */
                const avatarUri = {
                    high: null,
                    low: null,
                };
                this.avatarToUri = (data: ArrayBuffer, res: 'high' | 'low') => {
                    if (data === null || data === undefined) {
                        return '';
                    }
                    if (avatarUri[res] === null) {
                        // Cache avatar image URI
                        avatarUri[res] = bufferToUrl(
                            data,
                            webClientService.appCapabilities.imageFormat.avatar,
                            logAdapter($log.warn, this.logTag),
                        );
                    }
                    return avatarUri[res];
                };

                this.$onInit = function() {

                    this.highResolution = this.resolution === 'high';
                    this.isLoading = this.highResolution;
                    this.backgroundColor = (this.receiver as threema.Receiver).color;
                    this.receiverName = (this.receiver as threema.Receiver).displayName;
                    this.avatarClass = () => {
                        return 'avatar-' + this.resolution + (this.isLoading ? ' is-loading' : '');
                    };

                    this.avatarExists = () => {
                        if (this.receiver.avatar === undefined
                            || this.receiver.avatar[this.resolution] === undefined
                            || this.receiver.avatar[this.resolution] === null) {
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
                                return highResolution
                                    ? 'img/ic_group_picture_big.png'
                                    : 'img/ic_group_t.png';
                            case 'distributionList':
                                return highResolution
                                    ? 'img/ic_distribution_list_t.png'
                                    : 'img/ic_distribution_list_t.png';
                            case 'contact':
                            case 'me':
                            default:
                                return highResolution
                                    ? 'img/ic_contact_picture_big.png'
                                    : 'img/ic_contact_picture_t.png';
                        }
                    };

                    /**
                     * Return an avatar URI.
                     *
                     * This will fall back to a low resolution version or to the
                     * default avatar if no avatar for the desired resolution could
                     * be found.
                     */
                    this.getAvatarUri = () => {
                        /// If an avatar for the chosen resolution exists, convert it to an URI and return
                        if (this.avatarExists()) {
                            return this.avatarToUri(this.receiver.avatar[this.resolution], this.resolution);
                        }

                        // Otherwise, if we requested a high res avatar but
                        // there is only a low-res version, show that.
                        if (this.highResolution
                            && this.receiver.avatar !== undefined
                            && this.receiver.avatar.low !== undefined
                            && this.receiver.avatar.low !== null) {
                            return this.avatarToUri(this.receiver.avatar.low, 'low');
                        }

                        // As a fallback, get the default avatar.
                        return this.getDefaultAvatarUri(this.receiver.type, this.highResolution);
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
                                        type: this.receiver.type,
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

                    const isWork = webClientService.clientInfo.isWork;
                    this.showWorkIndicator = () => {
                        if (!isContactReceiver(this.receiver)) { return false; }
                        const contact: threema.ContactReceiver = this.receiver;
                        return isWork === false
                            && !this.highResolution
                            && contact.identityType === threema.IdentityType.Work;
                    };
                    this.showHomeIndicator = () => {
                        if (!isContactReceiver(this.receiver)) { return false; }
                        const contact: threema.ContactReceiver = this.receiver;
                        return isWork === true
                            && !isGatewayContact(contact)
                            && !isEchoContact(contact)
                            && contact.identityType === threema.IdentityType.Regular
                            && !this.highResolution;
                    };
                    this.showBlocked = () => {
                        if (!isContactReceiver(this.receiver)) { return false; }
                        const contact: threema.ContactReceiver = this.receiver;
                        return !this.highResolution && contact.isBlocked;
                    };

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
                    <div class="home-indicator" ng-if="ctrl.showHomeIndicator()"
                        translate-attr="{'aria-label': 'messenger.THREEMA_HOME_CONTACT',
                            'title': 'messenger.THREEMA_HOME_CONTACT'}">
                        <img src="img/ic_home_round.svg" alt="Private Threema contact">
                    </div>
                    <div class="blocked-indicator"  ng-if="ctrl.showBlocked()"
                        translate-attr="{'aria-label': 'messenger.THREEMA_BLOCKED_RECEIVER',
                            'title': 'messenger.THREEMA_BLOCKED_RECEIVER'}">
                        <img src="img/ic_blocked_24px.svg" alt="blocked icon">
                    </div>
                    <img
                         ng-class="ctrl.avatarClass()"
                         ng-style="{ 'background-color': ctrl.backgroundColor }"
                         ng-src="{{ ctrl.getAvatarUri() }}"
                         in-view="ctrl.requestAvatar($inview)"
                         aria-label="avatar {{ ctrl.receiverName }}">
               </div>
            `,
        };
    },
];
