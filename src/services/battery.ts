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

export class BatteryStatusService {
    // Attributes
    private batteryStatus: threema.BatteryStatus = null;

    /**
     * Update the battery status.
     */
    public setStatus(batteryStatus: threema.BatteryStatus): void {
        this.batteryStatus = batteryStatus;
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

    public toString(): string {
        if (this.batteryStatus === null) {
            return 'No data';
        }
        return this.percent + '%, ' + (this.isCharging ? 'charging' : 'discharging');
    }

}
