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
    function() {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                message: '=eeeMessage',
            },
            controllerAs: 'ctrl',
            controller: ['WebClientService', '$filter', function(webClientService: WebClientService, $filter: ng.IFilterService) {
                const idsToNames: (ids: string[], sort: boolean) => string = $filter('idsToNames');
                this.$onInit = function() {
                    const message = (this.message as threema.Message);
                    this.reactions = {
                        up: {
                            count: message.reactions?.ack?.length ?? 0,
                            names: '',
                            icon: (message.reactions?.ack ?? []).includes(webClientService.me.id) ? 'thumb_up' : 'thumb_up_off_alt',
                        },
                        down: {
                            count: message.reactions?.dec?.length ?? 0,
                            names: message.reactions?.dec?.sort()?.join(', ') ?? '',
                            icon: (message.reactions?.dec ?? []).includes(webClientService.me.id) ? 'thumb_down' : 'thumb_down_off_alt',
                        },
                    }
                    const upvoters = message.reactions?.ack ?? [];
                    const downvoters = message.reactions?.dec ?? [];
                    if (upvoters.length > 0) {
                        this.reactions.up.names = idsToNames(upvoters, true);
                    }
                    if (downvoters.length > 0) {
                        this.reactions.down.names = idsToNames(downvoters, true);
                    }
                }
            }],
            template: `
                <span class="reaction-ack" ng-if="ctrl.reactions.up.count > 0" title="{{ctrl.reactions.up.names}}">
                    <i class="material-icons md-14">{{ctrl.reactions.up.icon}}</i>
                    {{ctrl.reactions.up.count}}
                </span>
                <span class="reaction-dec" ng-if="ctrl.reactions.down.count > 0" title="{{ctrl.reactions.down.names}}">
                    <i class="material-icons md-14">{{ctrl.reactions.down.icon}}</i>
                    {{ctrl.reactions.down.count}}
                </span>
            `,
        };
    },
];
