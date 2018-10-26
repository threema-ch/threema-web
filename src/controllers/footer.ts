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

    public showVersionInfo(version: string, ev?: KeyboardEvent): void {
        if (ev !== undefined && !isActionTrigger(ev)) {
            return;
        }
        this.$mdDialog.show({
            controller: [
                '$mdDialog',
                'CONFIG',
                function($mdDialog: ng.material.IDialogService, CONFIG: threema.Config) {
                    this.activeElement = null;
                    this.version = version;
                    this.fullVersion = `${version} ${CONFIG.VERSION_MOUNTAIN}`;
                    this.config = CONFIG;
                    this.cancel = () => {
                        $mdDialog.cancel();
                        if (this.activeElement !== null) {
                            this.activeElement.focus(); // reset focus
                        }
                    };
                },
            ],
            controllerAs: 'ctrl',
            templateUrl: 'partials/dialog.version.html',
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
