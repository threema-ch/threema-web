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

import {u8aToHex} from '../helpers';

export default [
    '$mdDialog',
    function($mdDialog) {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                identity: '=eeeIdentity',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                this.showQRCode = () => {
                    let identity = this.identity;
                    $mdDialog.show({
                        controllerAs: 'ctrl',
                        controller: [function() {
                           this.cancel = () =>  {
                               $mdDialog.cancel();
                           };
                           this.identity = identity;
                           this.qrCode = {
                                errorCorrectionLevel: 'L',
                                size: '400px',
                                data: '3mid:'
                                + identity.threemaId
                                + ','
                                + u8aToHex(new Uint8Array(identity.publicKey)),
                            };
                        }],
                        templateUrl: 'partials/dialog.myidentity.html',
                        parent: angular.element(document.body),
                        clickOutsideToClose: true,
                        fullscreen: true,
                    });
                };
            }],
            template: `
                <div class="my-threema-information" ng-click="ctrl.showQRCode()">
                    <div class="nickname" ng-cloak
                        ng-bind-html="ctrl.identity.publicNickname | emojify | emptyToPlaceholder: '-'">
                    </div>
                </div>
            `,
        };
    },
];
