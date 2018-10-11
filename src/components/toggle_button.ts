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

/**
 * A generic toggle button.
 *
 * The toggle button has a boolean flag, which sets it to enabled/disabled. The
 * caller needs to provide labels and icons for both states, as well as
 * transition functions (onEnable and onDisable).
 */
export default {
    bindings: {
        flag: '<',
        onEnable: '&',
        onDisable: '&',
        labelEnabled: '@',
        labelDisabled: '@',
        iconEnabled: '@',
        iconDisabled: '@',
    },
    template: `
        <md-button
            class="md-icon-button"
            translate-attr="{'aria-label': $ctrl.labelEnabled, 'title': $ctrl.labelEnabled}"
            ng-if="$ctrl.flag"
            ng-click="$ctrl.onDisable()">
            <md-icon><img ng-src="{{ $ctrl.iconEnabled }}"></md-icon>
        </md-button>
        <md-button
            class="md-icon-button"
            translate-attr="{'aria-label': $ctrl.labelDisabled, 'title': $ctrl.labelDisabled}"
            ng-if="!$ctrl.flag"
            ng-click="$ctrl.onEnable()">
            <md-icon><img ng-src="{{ $ctrl.iconDisabled }}"></md-icon>
        </md-button>
    `,
};
