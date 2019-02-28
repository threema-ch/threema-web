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

import {StateService as UiStateService} from '@uirouter/angularjs';

import {SettingsService} from './settings';

export class ThemeService {

    private $log: ng.ILogService;
    private $window: ng.IWindowService;
    private $state: UiStateService;

    private settingsService: SettingsService;
    private logTag = '[ThemeService]';

    public static $inject = ['$log', '$window', '$state', 'SettingsService'];

    constructor($log: ng.ILogService, $window: ng.IWindowService,
                $state: UiStateService, settingsService: SettingsService) {
        this.$log = $log;
        this.$window = $window;
        this.$state = $state;
        this.settingsService = settingsService;
    }

    public init(): void {
        this.getTheme();
    }

    /**
     * Sets the theme to themeName
     */
    public setTheme(themeName: string): void {
        this.$log.info(this.logTag, 'Set a new theme', themeName);
        this.$log.warn(this.logTag, 'Storing the theme as: ', themeName);
        this.storeSetting('ThemeService.THEME_SETTING', themeName);
        this.loadTheme();
    }

    /**
     * Retrieves the theme from settings
     */
    public getTheme(): string {

        let theme = this.retrieveSetting('ThemeService.THEME_SETTING');

        if (!theme) {
            theme = 'Light (White)';
        }

        return theme;
    }

    /**
     * Changes the theme to the one currently stored in the settings
     */
    public loadTheme() {
        let themeName = this.getTheme();
        this.$log.info(this.logTag, 'Setting the theme to: ', themeName);

        if (themeName === 'Dark (Black)') {
            themeName = 'app-dark.css';
        } else if (themeName === 'Light (White)') {
            themeName = 'app-light.css';
        } else {
            themeName = 'app-light.css';
        }

        this.$log.info(this.logTag, 'Setting the link to: ', '/css/' + themeName);

        // StackOverflow: https://stackoverflow.com/a/577002/2310837
        // you could encode the css path itself to generate id..
        const cssId = 'themeID';
        const head = document.getElementsByTagName('head')[0];
        const oldTheme = document.getElementById(cssId);
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = '/css/' + themeName;
        link.media = 'all';
        head.appendChild(link);
        head.removeChild(oldTheme);
    }

    /**
     * Stores the given key/value pair in local storage
     */
    private storeSetting(key: string, value: string): void {
        this.settingsService.storeUntrustedKeyValuePair(key, value);
    }

    /**
     * Retrieves the value for the given key from local storage
     */
    private retrieveSetting(key: string): string {
        return this.settingsService.retrieveUntrustedKeyValuePair(key);
    }
}
