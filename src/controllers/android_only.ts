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
 * Controller to show or hide the "Android only" note at the bottom of the welcome screen.
 */
export class AndroidOnlyController {
    public show: boolean = false;

    //Theme
    private theme: string;

    // Costom Services
    private settingsService: threema.SettingsService;

    public static $inject = ['$rootScope','SettingsService'];
    constructor($rootScope: ng.IRootScopeService,settingsService: threema.SettingsService) {
        $rootScope.$on(
            '$stateChangeStart',
            (event, toState: ng.ui.IState, toParams, fromState: ng.ui.IState, fromParams) => {
                this.show = toState.name === 'welcome';
                this.settingsService=settingsService;
                this.theme = settingsService.getTheme();
            },
        );
    }
}
