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
 * The settings service can update variables for settings and persist them to
 * LocalStorage.
 */
export class SettingsService {
    private $log: ng.ILogService;

    private static STORAGE_KEY_PREFIX = 'settings-';
    private logTag: string = '[SettingsService]';

    private storage: Storage;

    public static $inject = ['$log', '$window'];
    constructor($log: ng.ILogService, $window: ng.IWindowService) {
        this.$log = $log;
        this.storage = $window.localStorage;
    }

    /**
     * Store settings key-value pair in LocalStorage.
     */
    public storeUntrustedKeyValuePair(key: string, value: string): void {
        this.$log.debug(this.logTag, 'Storing settings key:', key);
        this.storage.setItem(SettingsService.STORAGE_KEY_PREFIX + key, value);
    }

    /**
     * Retrieve settings key-value pair from LocalStorage.
     */
    public retrieveUntrustedKeyValuePair(key: string): string {
        this.$log.debug(this.logTag, 'Retrieving settings key:', key);
        if (this.hasUntrustedKeyValuePair(key)) {
            return this.storage.getItem(SettingsService.STORAGE_KEY_PREFIX + key);
        } else {
            this.storeUntrustedKeyValuePair(key, '');
            return '';
        }
    }

    /**
     * Return whether key-value pair is present in LocalStorage.
     *
     * Note that this will return `true` for empty values!
     */
    private hasUntrustedKeyValuePair(key: string): boolean {
        const item: string = this.storage.getItem(SettingsService.STORAGE_KEY_PREFIX + key);
        return item !== null;
    }

}
