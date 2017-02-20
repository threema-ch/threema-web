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

export class StringService implements threema.StringService {

    /**
     * Split a string into junks
     * @param str
     * @param length
     * @param offset
     */
    public chunk(str: string, length: number, offset: number = 10): string[] {
        if (str === undefined
            || str === null
            || length === undefined
            || str.trim().length === 0) {
            return [];
        }

        // split into word pieces
        let pieces = str.trim().split(' ');
        let junks = [];
        let junkIndex = 0;
        let junk = (piece: string) => {
            if (junks.length - 1 < junkIndex) {
                junks.push(piece);
            } else {
                junks[junkIndex] = (junks[junkIndex] + ' ' + piece).trim();
            }
        };

        // first iteration, split
        pieces.forEach((p) => {
            let nc = ((junks.length  > junkIndex ? junks[junkIndex] : '') + ' ' + p).trim();

            if (nc.length <= length) {
                junk(p);
            } else {
                do  {
                    junkIndex++;
                    junk(p.substring(0, length));
                    p = p.substring(length);
                } while (p.length > 0);
            }
        });
        return junks;
    }
}
