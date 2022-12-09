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

import {WebClientService} from '../services/webclient';

/*
 * Create the appropriate icon for the state of the specified message.
 */
export default [
    'WebClientService',
    function(webClientService: WebClientService) {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                message: '=eeeMessage',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                this.$onInit = function() {
                    const message = (this.message as threema.Message);
                    this.reactions = {
                        up: message.reactions?.ack?.length ?? 0,
                        down: message.reactions?.dec?.length ?? 0,
                    }
                    this.iconUp = (message.reactions?.ack ?? []).includes(webClientService.me.id) ? 'thumb_up' : 'thumb_up_off_alt';
                    this.iconDown = (message.reactions?.dec ?? []).includes(webClientService.me.id) ? 'thumb_down' : 'thumb_down_off_alt';
                }
            }],
            template: `
                <span class="reaction-ack" ng-if="ctrl.reactions.up > 0">
                    <i class="material-icons md-14">{{ctrl.iconUp}}</i>
                    {{ctrl.reactions.up}}
                </span>
                <span class="reaction-dec" ng-if="ctrl.reactions.down > 0">
                    <i class="material-icons md-14">{{ctrl.iconDown}}</i>
                    {{ctrl.reactions.down}}
                </span>
            `,
        };
    },
];
