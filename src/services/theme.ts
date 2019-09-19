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

import {AsyncEvent} from 'ts-events';
import {Logger} from 'ts-log';

import {LogService} from './log';

export class ThemeService {
    // Angular services
    private $interval: ng.IIntervalService;

    // Logging
    private readonly log: Logger;

    // Events
    public evtThemeChange = new AsyncEvent<threema.Theme>();

    // Private attributes
    private _theme: threema.Theme = threema.Theme.Regular;

    public static $inject = ['$interval', 'LogService'];
    constructor($interval: ng.IIntervalService, logService: LogService) {
        this.$interval = $interval;
        this.log = logService.getLogger('Theme-S', 'color: #fff; background-color: #cc9900');

        this.log.debug(`Initializing with theme ${this.theme}`);
    }

    /**
     * Return the current theme.
     */
    public get theme(): threema.Theme {
        return this._theme;
    }

    /**
     * Change the theme.
     */
    public changeTheme(theme: threema.Theme) {
        this._theme = theme;
        this.evtThemeChange.post(theme);
    }
}
