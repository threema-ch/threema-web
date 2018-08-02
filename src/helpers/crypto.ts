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

// This file contains helper functions related to crypto.
// Try to keep all functions pure!

import {u8aToHex} from '../helpers';

/**
 * Calculate the SHA256 hash of the specified bytes.
 * Throw an Error if the SubtleCrypto API is not available.
 */
export async function sha256(bytes: ArrayBuffer): Promise<string> {
    if (window.crypto === undefined) {
        throw new Error('window.crypto API not available');
    }
    if (window.crypto.subtle === undefined) {
        throw new Error('window.subtle API not available');
    }
    const buf: ArrayBuffer = await crypto.subtle.digest('SHA-256', bytes);
    return u8aToHex(new Uint8Array(buf));
}
