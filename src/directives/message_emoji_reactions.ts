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

import {emojify} from '../helpers/emoji';
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
                const idsToNames: (ids: readonly string[], sort: boolean) => string = $filter('idsToNames');
                this.$onInit = function() {
                    const message = (this.message as threema.Message);
                    this.reactions = (message.emojiReactions ?? []).map(({emoji, identities}) => {
                        return {
                            emoji,
                            length: identities.length,
                            names: idsToNames(identities, false),
                            includesMe: identities.includes(webClientService.me.id),
                        };
                    });
                }
            }],
            template: `
                <div ng-if="ctrl.reactions.length > 0" class="bucket" ng-class="{'active': bucket.includesMe}" title="{{bucket.names}}" ng-repeat="bucket in ctrl.reactions">
                    <span class="emoji" ng-bind-html="bucket.emoji | escapeHtml | emojify"></span>
                    <span ng-if="bucket.length > 1" class="count">{{bucket.length}}</span>
                </div>
            `,
        };
    },
];
