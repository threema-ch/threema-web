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
    function() {
        return {
            restrict: 'E',
            scope: {},
            bindToController: {
                location: '=',
            },
            controllerAs: 'ctrl',
            controller: [function() { /* nothing */ }],
            template: `
                <div class="location-message">
                    <div class="circle">
                        <i class="material-icons md-24">location_on</i>
                    </div>
                    <div class="location-details">
                        <div class="description">{{ ctrl.location.description }}</div>
                        <div class="details" ng-if="ctrl.location.address">{{ ctrl.location.address }}</div>
                        <div class="details" ng-if="!ctrl.location.address">{{ ctrl.location.lat }}, {{ ctrl.location.lon }}</div>
                    </div>
                </div>
            `,
        };
    },
];
