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
 * The settings service can update variables for settings and persist them to local storage.
 */

export class SettingsService implements threema.SettingsService {
    private $log: ng.ILogService;
    private $window: ng.IWindowService;

    private static STORAGE_KEY_PREFIX = 'settings-';
    private logTag: string = '[SettingsService]';

    private storage: Storage = null;
    public blocked = false;

    // Settings Variables

    public static $inject = ['$log', '$window'];
    constructor($log: ng.ILogService, $window: ng.IWindowService, themeProvider, $mdTheming) {
        this.$log = $log;
        this.$window = $window;

        this.storage = this.$window.localStorage;

        // Load Initial Data from LocalStorage to Settings Variables

    }

    // Settings Getters & Setters - also set them in ../threema.d.ts

    // Local Storage , store key-value pair
    private storeUntrustedKeyValuePair(Key: string, value: string): void {
        this.$log.debug(this.logTag, 'Storing unencrypted key-value pair for settings');
        this.storage.setItem(SettingsService.STORAGE_KEY_PREFIX + Key, value);
    }

    // Local Storage , retrieve key-value pair
    private retrieveUntrustedKeyValuePair(Key: string): string {
        this.$log.debug(this.logTag, 'Retrieving unencrypted key-value pair for settings');
        if (this.hasUntrustedKeyValuePair(Key)) {
            return this.storage.getItem(SettingsService.STORAGE_KEY_PREFIX + Key);
        } else {
            this.$log.debug(this.logTag, 'key-value not set, creating empty one');
            this.storeUntrustedKeyValuePair(Key, '');
        }

    }

    /**
     * Return whether key-value pair is present in localstorage.
     */
    private hasUntrustedKeyValuePair(Key: string): boolean {
        const item: string = this.storage.getItem(SettingsService.STORAGE_KEY_PREFIX + Key);
        return item !== null;
    }

}
