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

import {stringToUtf8a} from '../helpers';

/**
 * Functionality related to the initial QR code.
 */
export class QrCodeService {

    private config: threema.Config;
    private protocolVersion: number;

    public static $inject = ['CONFIG', 'PROTOCOL_VERSION'];
    constructor(CONFIG: threema.Config, PROTOCOL_VERSION: number) {
        this.config = CONFIG;
        this.protocolVersion = PROTOCOL_VERSION;
    }

    /**
     * Create QR code payload.
     *
     * See `docs/qr_code.md` for more information.
     */
    public buildQrCodePayload(initiatorKey: Uint8Array, authToken: Uint8Array, serverKey: Uint8Array | null,
                              host: string, port: number,
                              persistent: boolean): string {
        // tslint:disable:no-bitwise

        // Allocate array buffer
        let saltyRtcHostBytes = stringToUtf8a(host);
        let buf = new ArrayBuffer(2 + 1 + 32 + 32 + 32 + 2 + saltyRtcHostBytes.byteLength);

        // Options bitfield
        let options = 0;
        options |= (this.config.SELF_HOSTED === true ? 1 : 0) << 0;
        options |= (persistent ? 1 : 0) << 1;

        // Write version and options
        let dataView = new DataView(buf);
        dataView.setUint16(0, this.protocolVersion);
        dataView.setUint8(2, options);

        // Write initiator key, auth token and server key
        let u8Array = new Uint8Array(buf);
        u8Array.set(initiatorKey, 3);
        u8Array.set(authToken, 35);
        if (serverKey === null) {
            u8Array.set(new Uint8Array(32), 67);
        } else {
            u8Array.set(serverKey, 67);
        }

        // Write SaltyRTC host and port
        dataView.setUint16(99, port);
        u8Array.set(saltyRtcHostBytes, 101);

        // Base64 encode
        return btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));

        // tslint:enable:no-bitwise
    }
}
