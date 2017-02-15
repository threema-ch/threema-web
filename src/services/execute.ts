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
 * Execute a promise and wait x (timeout) seconds for end the process
 * Used for a better user experience on saving forms
 */
export class ExecuteService {
    private $log: ng.ILogService;
    private $timeoutService: ng.ITimeoutService;

    private timeout: number;
    private started = false;

    public static $inject = ['$log', '$timeout'];
    constructor($log: ng.ILogService, $timeout: ng.ITimeoutService, timeout = 0) {
        // Angular services
        this.$log = $log;
        this.$timeoutService = $timeout;
        this.timeout = timeout;
    }

    public execute(runnable: Promise<any>): Promise<any> {
        if (this.started) {
            this.$log.error('execute already in progress');
            return null;
        }

        this.started = true;
        return new Promise((a, e) => {
            runnable
                .then((arg: any) => {
                    this.$timeoutService(() => {
                        this.started = false;
                        a(arg);
                    }, this.timeout);
                })
                .catch((arg: any) => {
                    this.started = false;
                    e(arg);
                });
        });
    }

    public isRunning(): boolean {
        return this.started;
    }
}
