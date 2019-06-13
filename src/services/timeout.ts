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

export class TimeoutService {
    private logTag: string = '[TimeoutService]';

    // Config
    private config: threema.Config;

    // Angular services
    private $log: ng.ILogService;
    private $timeout: ng.ITimeoutService;

    // List of registered timeouts
    private timeouts: Set<ng.IPromise<any>> = new Set();

    public static $inject = ['CONFIG', '$log', '$timeout'];
    constructor(config: threema.Config, $log: ng.ILogService, $timeout: ng.ITimeoutService) {
        this.config = config;
        this.$log = $log;
        this.$timeout = $timeout;
    }

    /**
     * Log a message on debug log level, but only if the `DEBUG` flag is enabled.
     */
    private logDebug(msg: string): void {
        if (this.config.VERBOSE_DEBUGGING) {
            this.$log.debug(this.logTag, msg);
        }
    }

    /**
     * Register a timeout.
     */
    public register<T>(fn: (...args: any[]) => T, delay: number, invokeApply: boolean, name?: string): ng.IPromise<T> {
        this.logDebug('Registering timeout' + (name === undefined ? '' : ` (${name})`));
        const timeout = this.$timeout(fn, delay, invokeApply);
        timeout
            .then(() => this.timeouts.delete(timeout))
            .catch((reason) => {
                if (reason !== 'canceled') { // We can safely ignore cancellation
                    this.$log.error(this.logTag, 'Registered timeout promise rejected:', reason);
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

        this.logDebug('Cancelling timeout' + (name === undefined ? '' : ` (${name})`));
        const cancelled = this.$timeout.cancel(timeout);

        this.timeouts.delete(timeout);
        return cancelled;
    }

    /**
     * Cancel all pending timeouts.
     */
    public cancelAll() {
        this.$log.debug(this.logTag, 'Cancelling ' + this.timeouts.size + ' timeouts');
        for (const timeout of this.timeouts) {
            this.$timeout.cancel(timeout);
        }
        this.timeouts.clear();
    }
}
