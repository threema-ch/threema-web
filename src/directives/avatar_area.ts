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

import {bufferToUrl, logAdapter} from '../helpers';
import {WebClientService} from '../services/webclient';

/**
 * Support uploading and resizing avatar
 */
export default [
    '$rootScope',
    '$log',
    '$mdDialog',
    'WebClientService',
    function($rootScope: ng.IRootScopeService,
             $log: ng.ILogService,
             $mdDialog: ng.material.IDialogService,
             webClientService: WebClientService) {
        return {
            restrict: 'EA',
            scope: true,
            bindToController: {
                onChange: '=',
                loadAvatar: '=',
                enableClear: '=?',
                color: '=?',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                const logTag = '[AvatarAreaDirective]';

                this.isLoading = false;
                this.avatar = null; // String
                const avatarFormat = webClientService.appCapabilities.imageFormat.avatar;

                this.$onInit = function() {
                    this.setAvatar = (avatarBytes: ArrayBuffer) => {
                        this.avatar = (avatarBytes === null)
                            ? null
                            : bufferToUrl(avatarBytes, avatarFormat, logAdapter($log.warn, logTag));
                    };

                    this.imageChanged = (image: ArrayBuffer, notify = true) => {
                        this.isLoading = true;
                        if (notify === true && this.onChange !== undefined) {
                            this.onChange(image);
                        }
                        this.setAvatar(image);
                        this.isLoading = false;
                    };

                    if (this.loadAvatar !== undefined) {
                        this.isLoading = true;
                        (this.loadAvatar as Promise<ArrayBuffer>)
                            .then((image: ArrayBuffer) => {
                                $rootScope.$apply(() => {
                                    this.setAvatar(image);
                                    this.isLoading = false;
                                });
                            })
                            .catch(() => {
                                $rootScope.$apply(() => {
                                    this.isLoading = false;
                                });
                            });
                    }

                    this.delete = () => {
                        this.imageChanged(null, true);
                    };

                    // show editor in a dialog
                    this.modify = (ev) => {
                        $mdDialog.show({
                            controllerAs: 'ctrl',
                            controller: function() {
                                this.avatar = null;
                                this.apply = () => $mdDialog.hide(this.avatar);
                                this.cancel = () => $mdDialog.cancel();
                                this.changeAvatar = (image: ArrayBuffer) => this.avatar = image;
                            },
                            template: `
                                <md-dialog translate-attr="{'aria-label': 'messenger.UPLOAD_AVATAR'}">
                                    <form ng-cloak>
                                     <md-toolbar>
                                      <div class="md-toolbar-tools">
                                       <h2 translate>messenger.UPLOAD_AVATAR</h2>
                                       </div>
                                       </md-toolbar>
                                        <md-dialog-content>
                                            <div class="md-dialog-content avatar-area editor">
                                                <avatar-editor on-change="ctrl.changeAvatar"></avatar-editor>
                                            </div>
                                        </md-dialog-content>
                                        <md-dialog-actions layout="row" >
                                              <md-button ng-click="ctrl.cancel()">
                                               <span translate>common.CANCEL</span>
                                                </md-button>
                                          <md-button ng-click="ctrl.apply()">
                                             <span translate>common.OK</span>
                                          </md-button>
                                        </md-dialog-actions>
                                    </form>
                                </md-dialog>

                            `,
                            parent: angular.element(document.body),
                            targetEvent: ev,
                            clickOutsideToClose: true,
                        })
                            .then((newImage: ArrayBuffer) => {
                                // update image only if a image was set or if enable clear is true
                                if (this.enableClear === true || newImage !== null) {
                                    this.imageChanged(newImage, true);
                                }
                            }, () => null);
                    };
                };
            }],
            template: `
                <div class="avatar-area overview">
                    <div class="avatar-image" ng-style="{ 'background-color': ctrl.color }">
                        <div class="loading-element" ng-class="{'active': ctrl.isLoading}">
                            <md-progress-circular
                                    class="md-primary"
                                    md-diameter="96"></md-progress-circular>

                        </div>
                        <img ng-src="{{ ctrl.avatar }}" ng-if="ctrl.avatar !== null">
                    </div>
                    <div class="avatar-area-navigation"  layout="row" layout-wrap layout-margin layout-align="center">

                        <md-button type="submit" class="md-raised" ng-click="ctrl.delete()" ng-if="ctrl.enableClear === true">
                            <span translate>common.DELETE</span>
                        </md-button>
                        <md-button type="submit" class="md-raised md-primary" ng-click="ctrl.modify()">
                            <span translate>messenger.UPLOAD_AVATAR</span>
                        </md-button>
                    </div>
                    </div>
                </div>
            `,
        };
    },
];
