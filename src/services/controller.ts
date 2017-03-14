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
 * controller states
 */
export class ControllerService {
    private currentController: string;
    private $log: ng.ILogService;
    public static $inject = ['$log'];

    constructor($log: ng.ILogService) {
        // Angular services
        this.$log = $log;
    }

    public setControllerName(name: string): void {
        this.currentController = name;
    }

    public getControllerName(): string {
        return this.currentController;
    }
}
