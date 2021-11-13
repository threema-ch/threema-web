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

import {u8aToHex} from '../helpers';

/**
 * Visualize a 32 bit public key in an 8x8 hex grid.
 *
 * Return a string containing newlines.
 */
export function publicKeyGrid(publicKey: Uint8Array): string {
    const hex = u8aToHex(publicKey);
    let grid = '';
    for (let i = 0; i < hex.length; i++) {
        // Prepend a newline if end of row is reached
        if (i % 8 === 0 && i > 0 && i < 63) {
            grid += '\n';
        }

        // Prepend a space if this isn't the first char of a row
        if (i % 8 > 0) {
            grid += ' ';
        }

        // Add hex character
        grid += hex[i];
    }
    return grid;
}
