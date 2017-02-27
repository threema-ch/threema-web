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
* The settings service can update the settings.
*/

export class SettingsService implements threema.SettingsService {
    private $log: ng.ILogService;
    private $window: ng.IWindowService;
    private themeProvider: any;
    private $mdTheming: any;

    private static STORAGE_KEY_PREFIX = 'settings-';

    private logTag: string = '[SettingsService]';

    private storage: Storage = null;

    private currentTheme: string;

    public blocked = false;

    public static $inject = ['$log', '$window','themeProvider','$mdTheming'];
    constructor($log: ng.ILogService,$window: ng.IWindowService,themeProvider ,$mdTheming) {
        this.$log = $log;
        this.$window = $window;
        this.themeProvider = themeProvider;
        this.$mdTheming = $mdTheming;

        try {
            if (this.$window.localStorage === null) {
                this.blocked = true;
            }
            this.storage = this.$window.localStorage;
            // Load Initial Data from LocalStorage
            this.currentTheme = this.retrieveUntrustedKeyValuePair('theme');
            this.applyTheme();
        } catch (e) {
            this.$log.warn(this.logTag, 'LocalStorage blocked:', e);
            this.blocked = true;
        }
    }

    public applyTheme(): void{
        if(this.currentTheme=='Dark'){
                this.$log.debug(this.logTag, 'Updating Theme to Dark');
                //create new theme
                this.themeProvider.theme('dark').primaryPalette('pink')
                                                   .accentPalette('orange')
                                                   .backgroundPalette('yellow');
                //reload the theme
                this.$mdTheming.generateTheme('dark');
                //optional - set the default to this new theme
                this.themeProvider.setDefaultTheme('dark');
        }else{
                this.$log.debug(this.logTag, 'Updating Theme to Bright');
                //create new theme
                this.themeProvider.theme('default').primaryPalette('grey')
                                                   .accentPalette('red')
                                                   .backgroundPalette('grey');
                //reload the theme
                this.$mdTheming.generateTheme('default');
                //optional - set the default to this new theme
                this.themeProvider.setDefaultTheme('default');
        }
    }

    public setTheme(name: string): void {
        this.currentTheme = name;
        this.applyTheme();
        //Write Value To storage
        this.storeUntrustedKeyValuePair('theme',name);
    }

    public getTheme(): string {
        return this.currentTheme;
    }

    private storeUntrustedKeyValuePair(Key: string, value: string): void {
        this.$log.debug(this.logTag, 'Storing unencrypted key-value pair for settings');
        this.storage.setItem(SettingsService.STORAGE_KEY_PREFIX+Key, value);
    }

    private retrieveUntrustedKeyValuePair(Key: string): string {
        this.$log.debug(this.logTag, 'Retrieving unencrypted key-value pair for settings');
        if(this.hasUntrustedKeyValuePair(Key)){
            return this.storage.getItem(SettingsService.STORAGE_KEY_PREFIX+Key);
        }else{
            this.$log.debug(this.logTag, 'key-value not set, creating empty one');
            this.storeUntrustedKeyValuePair(Key,"");
        }

    }

    /**
     * Return whether key-value pair is present in localstorage.
     */
    private hasUntrustedKeyValuePair(Key: string): boolean {
        const item: string = this.storage.getItem(SettingsService.STORAGE_KEY_PREFIX+Key);
        return item !== null;
    }

}
