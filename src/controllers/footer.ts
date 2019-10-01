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

import {isActionTrigger} from '../helpers';
import {ThemeService} from '../services/theme';
import {DialogController} from './dialog';
import {TroubleshootingController} from './troubleshooting';

class VersionDialogController extends DialogController {
    public readonly version: string;
    public readonly fullVersion: string;

    public readonly config: threema.Config;

    public static readonly $inject = ['$scope', '$mdDialog', 'ThemeService', 'CONFIG'];
    constructor(
        $scope: ng.IScope,
        $mdDialog: ng.material.IDialogService,
        themeService: ThemeService,
        config: threema.Config,
    ) {
        super($scope, $mdDialog, themeService);
        this.version = config.VERSION;
        this.fullVersion = `${config.VERSION} ${config.VERSION_MOUNTAIN}`;
        this.config = config;
    }
}

/**
 * Handle footer information.
 */
export class FooterController {
    private $mdDialog: ng.material.IDialogService;

    private config: threema.Config;

    public static $inject = ['CONFIG', '$mdDialog'];
    constructor(CONFIG: threema.Config, $mdDialog: ng.material.IDialogService) {
        this.$mdDialog = $mdDialog;
        this.config = CONFIG;
    }

    public showVersionInfo(ev?: KeyboardEvent): void {
        if (ev !== undefined && !isActionTrigger(ev)) {
            return;
        }
        this.$mdDialog.show({
            controller: VersionDialogController,
            controllerAs: 'ctrl',
            templateUrl: 'partials/dialog.version.html',
            parent: angular.element(document.body),
            clickOutsideToClose: true,
            fullscreen: true,
        });
    }

    public showTroubleshooting(ev?: KeyboardEvent): void {
        if (ev !== undefined && !isActionTrigger(ev)) {
            return;
        }
        this.$mdDialog.show({
            controller: TroubleshootingController,
            controllerAs: 'ctrl',
            templateUrl: 'partials/dialog.troubleshooting.html',
            parent: angular.element(document.body),
            clickOutsideToClose: true,
            fullscreen: true,
        });
    }

    /**
     * Return the changelog URL.
     */
    public get changelogUrl(): string {
        return 'https://github.com/threema-ch/threema-web/blob/' + this.config.GIT_BRANCH + '/CHANGELOG.md';
    }
}
