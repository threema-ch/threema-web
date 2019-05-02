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
import {SettingsService} from './settings';

export class ThemeService {

    public currentTheme: number;

    public themeOptions: string[] = ['THEME_LIGHT_WHITE', 'THEME_DARK_BLACK'];
    private themeFilenames: string[] = ['app-light.css', 'app-dark.css'];

    private settingsService: SettingsService;
    public static $inject = ['SettingsService'];

    constructor(settingsService: SettingsService) {
        this.settingsService = settingsService;
        this.currentTheme = this.getThemeID();
    }

    /*
    * Returns a string with _dark added at the end.
    * Used to get the correct icons depending on the theme.
    */
    public themedFilename(fn: string): string {
        if (fn == null) {
            return null;
        }
        const ext = (this.currentTheme === 1) ? '_dark' : '';
        const fnl = fn.length;
        return fn.substring(0, fnl - 4) + ext + fn.substring(fnl - 4, fnl);
    }

    public setThemeID(themeID: number) {
        this.currentTheme = themeID;
        this.storeSetting('ThemeService.THEME_SETTING', themeID.toString());
    }

    public getThemeIDS(): number[] {
        const list: number[] = [];
        for (let i = 0; i < this.themeOptions.length; i++) {
            list.push(i);
        }
        return list;
    }

    public getThemeID(): number {
        const theme: number = Number(this.retrieveSetting('ThemeService.THEME_SETTING'));
        this.currentTheme = theme;
        return isNaN(theme) ? 0 : theme;
    }

    private getNameForThemeID(themeID: number): string {
        if (themeID < this.themeOptions.length) {
            return this.themeOptions[themeID];
        }
        return this.themeOptions[0];
    }

    public getCSSForThemeID(themeID: number): string {
        if (themeID < this.themeFilenames.length) {
            return this.themeFilenames[themeID];
        }
        return this.themeFilenames[0];
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
