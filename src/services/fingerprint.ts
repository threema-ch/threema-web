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

export class FingerPrintService {
    private $log: ng.ILogService;

    public static $inject = ['$log'];
    constructor($log: ng.ILogService) {
        this.$log = $log;
    }

    public generate(publicKey: ArrayBuffer): string {
        if (publicKey !== undefined
            && publicKey.byteLength === 32) {
            let sha256PublicKey = sha256(publicKey);
            if (sha256PublicKey !== undefined) {
                return sha256PublicKey.toLowerCase().substr(0, 32);
            }
        }
        return 'undefined/failed';
    }
}
