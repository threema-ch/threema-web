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

import {NotificationService} from './notification';

export class BatteryStatusService {
    // Attributes
    private batteryStatus: threema.BatteryStatus = null;
    private alertedLow = false;
    private alertedCritical = false;

    // Constants
    private static readonly PERCENT_LOW = 20;
    private static readonly PERCENT_CRITICAL = 5;

    // Services
    private $translate: ng.translate.ITranslateService;
    private notificationService: NotificationService;

    public static $inject = ['$translate', 'NotificationService'];

    constructor($translate: ng.translate.ITranslateService, notificationService: NotificationService) {
        this.$translate = $translate;
        this.notificationService = notificationService;
    }

    /**
     * Update the battery status.
     */
    public setStatus(batteryStatus: threema.BatteryStatus): void {
        // Handle null percent value. This can happen if the battery status could not be determined.
        if (batteryStatus.percent === null) {
            this.clearStatus();
            return;
        }

        this.batteryStatus = batteryStatus;

        // Alert if percent drops below a certain threshold
        if (!batteryStatus.isCharging) {
            if (!this.alertedCritical && batteryStatus.percent < BatteryStatusService.PERCENT_CRITICAL) {
                this.notifyLevel('critical');
                this.alertedCritical = true;
            } else if (!this.alertedLow && batteryStatus.percent < BatteryStatusService.PERCENT_LOW) {
                this.notifyLevel('low');
                this.alertedLow = true;
            }
        }

        // Reset alert flag if device is plugged in
        if (this.alertedLow && batteryStatus.isCharging) {
            this.alertedLow = false;
            this.notificationService.hideNotification('battery-low');
        }
        if (this.alertedCritical && batteryStatus.isCharging) {
            this.alertedCritical = false;
            this.notificationService.hideNotification('battery-critical');
        }

        // Reset alert flag if percentage goes above a certain threshold
        const hysteresis = 3;
        if (this.alertedLow && batteryStatus.percent > BatteryStatusService.PERCENT_LOW + hysteresis) {
            this.alertedLow = false;
            this.notificationService.hideNotification('battery-low');
        }
        if (this.alertedCritical && batteryStatus.percent > BatteryStatusService.PERCENT_CRITICAL + hysteresis) {
            this.alertedCritical = false;
            this.notificationService.hideNotification('battery-critical');
        }
    }

    /**
     * Clear the battery status information.
     */
    public clearStatus(): void {
        this.batteryStatus = null;
    }

    /**
     * Is battery status information available?
     */
    public get dataAvailable(): boolean {
        return this.batteryStatus !== null;
    }

    /**
     * Return the charge level in percent.
     */
    public get percent(): number {
        return this.batteryStatus.percent;
    }

    /**
     * Return whether the battery is currently charging.
     */
    public get isCharging(): boolean {
        return this.batteryStatus.isCharging;
    }

    /**
     * Return whether the battery level is low (<20%).
     */
    public get isLow(): boolean {
        return this.batteryStatus.percent < BatteryStatusService.PERCENT_LOW;
    }

    /**
     * Return whether the battery level is critical (<20%).
     */
    public get isCritical(): boolean {
        return this.batteryStatus.percent < BatteryStatusService.PERCENT_CRITICAL;
    }

    /**
     * Alert the user about a certain battery level.
     */
    private notifyLevel(level: 'low' | 'critical'): void {
        if (!this.notificationService.getWantsNotifications()) {
            // User does not want notifications.
            // This flag is also checked in the `showNotification` function, but
            // we'll return early to avoid having to do the translations and to
            // keep the notification sound from playing without a visible
            // notification.
            return;
        }

        const title = this.$translate.instant('common.WARNING');
        const picture = 'img/ic_battery_alert-64x64.png';
        let tag: string;
        let body: string;
        if (level === 'low') {
            tag = 'battery-low';
            body = this.$translate.instant('battery.LEVEL_LOW', { percent: this.percent });
            this.notificationService.hideNotification('battery-critical');
        } else if (level === 'critical') {
            tag = 'battery-critical';
            body = this.$translate.instant('battery.LEVEL_CRITICAL', { percent: this.percent });
            this.notificationService.hideNotification('battery-low');
        }
        this.notificationService.showNotification(tag, title, body, picture, undefined, true, true);
    }

    public toString(): string {
        if (this.batteryStatus === null) {
            return 'No data';
        }
        return this.percent + '%, ' + (this.isCharging ? 'charging' : 'discharging');
    }

}
