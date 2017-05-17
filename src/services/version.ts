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

}
