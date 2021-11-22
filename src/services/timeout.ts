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

import {LogService} from './log';

export class TimeoutService {
    // Config
    private userConfig: threema.UserConfig;

    // Angular services
    private $timeout: ng.ITimeoutService;

    // Logging
    private readonly log: Logger;

    // List of registered timeouts
    private timeouts: Set<ng.IPromise<any>> = new Set();

    public static $inject = ['$timeout', 'LogService'];
    constructor($timeout: ng.ITimeoutService, logService: LogService) {
        // tslint:disable-next-line: no-string-literal
        this.userConfig = window['UserConfig'];
        this.$timeout = $timeout;
        this.log = logService.getLogger(
            'Timeout-S', 'color: #fff; background-color: #669900', this.userConfig.TIMER_LOG_LEVEL);
    }

    /**
     * Register a timeout.
     */
    public register<T>(fn: (...args: any[]) => T, delay: number, invokeApply: boolean, name?: string): ng.IPromise<T> {
        this.log.debug(`Registering timeout${name === undefined ? '' : ` (${name})`}`);
        const timeout = this.$timeout(fn, delay, invokeApply);
        timeout
            .then(() => this.timeouts.delete(timeout))
            .catch((reason) => {
                if (reason !== 'canceled') { // We can safely ignore cancellation
                    this.log.error('Registered timeout promise rejected:', reason);
                }
            });

        // Stick name onto promise for debugging purposes
        // tslint:disable-next-line: no-string-literal
        timeout['_timeout_name'] = name;

        this.timeouts.add(timeout);
        return timeout;
    }

    /**
     * Cancel the specified timeout.
     *
     * Return true if the task hasn't executed yet and was successfully canceled.
     */
    public cancel<T>(timeout: ng.IPromise<T>): boolean {
        // Retrieve name from promise for debugging purposes
        // tslint:disable-next-line: no-string-literal
        const name = timeout['_timeout_name'];
        this.log.debug(`Cancelling timeout${name === undefined ? '' : ` (${name})`}`);
        const cancelled = this.$timeout.cancel(timeout);

        this.timeouts.delete(timeout);
        return cancelled;
    }

    /**
     * Cancel all pending timeouts.
     */
    public cancelAll() {
        this.log.debug('Cancelling ' + this.timeouts.size + ' timeouts');
        for (const timeout of this.timeouts) {
            this.$timeout.cancel(timeout);
        }
        this.timeouts.clear();
    }
}
