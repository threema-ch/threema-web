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

export default [
    '$rootScope',
    'WebClientService',
    function($rootScope: ng.IRootScopeService, webClientService: threema.WebClientService) {
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

                this.avatarClass = () => {
                    return 'avatar-' + this.resolution + (this.isLoading ? ' is-loading' : '');
                };

                this.avatarExists = () => {
                    if (this.receiver.avatar === undefined) {
                        return false;
                    }
                    if (this.receiver.avatar[this.resolution] === undefined) {
                        return false;
                    }
                    this.isLoading = false;
                    return true;
                };

                this.getAvatar = () => this.receiver.avatar[this.resolution];
                this.getDefaultAvatar = () => {
                    if (this.highResolution && this.receiver.avatar.low !== undefined) {
                        // return low resolution image first
                        return this.receiver.avatar.low;
                    }
                    return webClientService.defaults.getAvatar(this.type, this.highResolution);
                };

                this.requestAvatar = () => {
                    if (this.avatarExists()) {
                        // do not request
                        return;
                    }

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
                };
            }],
            template: `
                <div class="avatar" ng-class="ctrl.avatarClass()">
                    <div class="avatar-loading" ng-if="ctrl.isLoading">
                        <md-progress-circular class="md-accent" md-diameter="100">
                        </md-progress-circular>
                    </div>
                    <img class="avatar-default" ng-if="!ctrl.avatarExists()"
                         ng-class="ctrl.avatarClass()"
                         ng-style="{ 'background-color': ctrl.receiver.color }"
                         ng-src="{{ ctrl.getDefaultAvatar() }}"
                         in-view="$inview && ctrl.requestAvatar()">
                    <img class="avatar-image" ng-if="ctrl.avatarExists()"
                         ng-src="{{ ctrl.getAvatar()}}">
               </div>
            `,
        };
    },
];
