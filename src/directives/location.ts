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
            controller: [function() {
                this.label = this.location.address ? this.location.address
                        : this.location.lat  + ', ' + this.location.lon;
            }],
            template: `
                <div class="file-message">
                    <div class="circle">
                        <i class="material-icons md-24">location_on</i>
                    </div>
                    <div class="info">
                        <a ng-href="{{ctrl.location | mapLink}}" class="location-address" target="_blank" rel="noopener noreferrer">
                            {{ctrl.label}}
                        </a>
                    </div>
                </div>
            `,
        };
    },
];
