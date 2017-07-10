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

import {BatteryStatusService} from '../services/battery';

export default [
    '$rootScope',
    'BatteryStatusService',
    function($rootScope: ng.IRootScopeService,
             batteryStatusService: BatteryStatusService) {
        return {
            restrict: 'E',
            scope: {},
            bindToController: {},
            controllerAs: 'ctrl',
            controller: [function() {
                this.available = () => batteryStatusService.dataAvailable;
                this.percent = () => batteryStatusService.percent;
                this.isCharging = () => batteryStatusService.isCharging;
                this.alert = () => batteryStatusService.percent < 20;
                this.showPercent = () => !this.alert() && !this.isCharging();
            }],
            template: `
                <div class="battery-status" ng-if="ctrl.available()" ng-class="{'with-percent': ctrl.showPercent()}">
                    <md-icon ng-if="ctrl.isCharging()"
                             aria-label="Battery status: Charging"
                             title="Charging: {{ ctrl.percent() }}%"
                             class="material-icons md-light md-24">battery_charging_full</md-icon>
                    <md-icon ng-if="!ctrl.isCharging() && !ctrl.alert()"
                             aria-label="Battery status: Discharging"
                             title="Discharging: {{ ctrl.percent() }}%"
                             class="material-icons md-light md-24">battery_std</md-icon>
                    <span ng-if="ctrl.showPercent()" class="battery-percent">{{ ctrl.percent() }}%</span>
                    <md-icon ng-if="!ctrl.isCharging() && ctrl.alert()"
                             aria-label="Battery status: Alert"
                             title="Discharging: {{ ctrl.percent() }}%"
                             class="material-icons md-light md-24">battery_alert</md-icon>
                </div>
            `,
        };
    },
];
