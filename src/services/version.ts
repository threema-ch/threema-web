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

export class VersionService {
    public static $inject = ['$log', '$http', '$mdDialog', '$translate', '$window'];

    private logTag: string = '[VersionService]';

    private $log: ng.ILogService;
    private $http: ng.IHttpService;
    private $mdDialog: ng.material.IDialogService;
    private $translate: ng.translate.ITranslateService;
    private $window: ng.IWindowService;

    private version: string;
    private dialogShowing = false;

    constructor($log: ng.ILogService,
                $http: ng.IHttpService,
                $mdDialog: ng.material.IDialogService,
                $translate: ng.translate.ITranslateService,
                $window: ng.IWindowService) {
        this.$log = $log;
        this.$http = $http;
        this.$mdDialog = $mdDialog;
        this.$translate = $translate;
        this.$window = $window;
    }

    /**
     * Set the version by fetching the version.txt file.
     */
    public initVersion(): void {
        if (this.version !== undefined) {
            this.checkForUpdate();
            return;
        }

        this.fetchVersion()
            .then((version: string) => {
                this.version = version;
                this.$log.info(this.logTag, 'Using Threema Web version', this.version);
            })
            .catch((error: string) => {
                this.$log.error(this.logTag, 'Could not fetch version.txt:', error);
            });
    }

    /**
     * Fetch the version.txt file.
     */
    private fetchVersion(): Promise<string> {
        return new Promise((resolve, reject) => {
            const cacheBust = Math.floor(Math.random() * 1000000000);
            this.$http({
                method: 'GET',
                url: 'version.txt?' + cacheBust,
                cache: false,
                responseType: 'text',
                transformResponse: (data: string, headersGetter, statusCode) => {
                    if (statusCode !== 200) {
                        return reject('HTTP ' + statusCode);
                    }
                    return data.trim();
                },
            }).then(
                (successResponse: ng.IHttpPromiseCallbackArg<string>) => {
                    return resolve(successResponse.data);
                },
                (error: Error) => {
                    return reject(error);
                },
            );
        });
    }

    /**
     * Check for a version update. If the version was updated, show a dialog.
     */
    public checkForUpdate(): void {
        this.$log.debug(this.logTag, 'Checking for version update...');
        if (this.version === undefined) {
            this.$log.error(this.logTag, 'Cannot check for update, version is not initialized');
            return;
        }
        this.fetchVersion()
            .then((version: string) => {
                if (version !== this.version) {
                    this.$log.warn(this.logTag,
                        'A new version of Threema Web is available:',
                        this.version, '->', version);
                    this.notifyNewVersion(version);
                }
            })
            .catch((error: string) => {
                this.$log.error('Could not fetch version.txt:', error);
            });
    }

    /**
     * A new version is available!
     */
    private notifyNewVersion(version: string): void {
        if (this.dialogShowing === true) {
            // Don't show again if dialog is already showing.
            return;
        }
        const changelogUrl = 'https://github.com/threema-ch/threema-web/blob/master/CHANGELOG.md';
        const changelogLink = '<a href="' + changelogUrl + '" target="_blank" rel="noopener noreferrer">Changelog</a>';
        const confirm = this.$mdDialog.alert()
            .title(this.$translate.instant('version.NEW_VERSION'))
            .htmlContent(this.$translate.instant('version.NEW_VERSION_BODY', {
                version: version,
                changelog: changelogLink,
            }))
            .ok(this.$translate.instant('common.OK'));
        this.dialogShowing = true;
        this.$mdDialog.show(confirm).then(() => {
            this.$window.location.reload();
        }, () => {
            this.$window.location.reload();
        });
    }

}
