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

import {Logger} from 'ts-log';

import {LogService} from '../services/log';
import {ThemeService} from '../services/theme';
import {SettingsService} from '../services/settings'

/**
 * This controller handles theming.
 */
export class ThemeController {
    // Logging
    private readonly log: Logger;

    // Theme name
    public theme: string;

    // User interface class
    public userInterfaceClass: string;

    public static $inject = ['$scope', 'LogService', 'ThemeService', 'SettingsService'];
    constructor($scope, logService: LogService, themeService: ThemeService, settingsService: SettingsService) {
        // Logging
        this.log = logService.getLogger('Theme-C', 'color: #000; background-color: #ffff99');

        // Initialize theme
        this.theme = themeService.theme;

        // Listen to theme changes
        themeService.evtThemeChange.attach((newTheme: threema.Theme) => {
            this.log.debug(`Updating theme: ${this.theme} -> ${newTheme}`);
            $scope.$apply(() => this.theme = newTheme);
        });

        // Set user interface class
        this.userInterfaceClass = ThemeController.getUserInterfaceClass(settingsService.userInterface.getUserInterface())

        // Listen to user interface changes
        settingsService.userInterfaceChange.attach((newUserInterface: threema.UserInterface) => {
            const newUserInterfaceClass = ThemeController.getUserInterfaceClass(newUserInterface);
            this.log.debug(`Updating user interface class: ${this.userInterfaceClass} -> ${newUserInterfaceClass}`);
            $scope.$apply(() => this.userInterfaceClass = newUserInterfaceClass);
        })
    }

    private static getUserInterfaceClass(userInterface: threema.UserInterface): string {
        const base = 'user-interface-'
        switch (userInterface) {
            case threema.UserInterface.Minimal:
                return base + 'minimal'
            default:
                return base + 'default'
        }
    }
}
