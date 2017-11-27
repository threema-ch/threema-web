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
    '$translate',
    'BatteryStatusService',
    function($rootScope: ng.IRootScopeService, $translate: ng.translate.ITranslateService,
             batteryStatusService: BatteryStatusService) {
        return {
            restrict: 'E',
            scope: {},
            bindToController: {},
            controllerAs: 'ctrl',
            controller: [function() {
                this.available = () => batteryStatusService.dataAvailable;
                this.alert = () => batteryStatusService.isLow && !batteryStatusService.isCharging;
                this.percent = () => batteryStatusService.percent;

                this.description = (): string => {
                    if (batteryStatusService.isCharging) {
                        return $translate.instant('battery.CHARGING', {
                            percent: this.percent(),
                        });
                    } else if (this.alert()) {
                        return $translate.instant('battery.ALERT', {
                            percent: this.percent(),
                        });
                    }
                    return $translate.instant('battery.DISCHARGING', {
                        percent: this.percent(),
                    });
                };

                this.icon = (): string => {
                    if (batteryStatusService.isCharging) {
                        return 'battery_charging_full';
                    } else if (this.alert()) {
                        return 'battery_alert';
                    }
                    return 'battery_std';
                };
            }],
            template: `
                <div class="battery-status" ng-if="ctrl.available()"" ng-class="{'alert': ctrl.alert()}">
                    <md-icon
                        aria-label="{{ ctrl.description() }}"
                        title="{{ ctrl.description() }}"
                        class="material-icons md-light md-24">{{ ctrl.icon() }}</md-icon>
                       <span class="battery-percent">{{ ctrl.percent() }}%</span>
                </div>
            `,
        };
    },
];
