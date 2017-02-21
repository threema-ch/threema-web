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
     * Split a string into chunks
     * @param str the string to chunk
     * @param length max length of a chuck
     * @param offset searching for a separator in the given offset, 0 disable separator indexing
     */
    public chunk(str: string, length: number, offset: number = 10): string[] {
        if (str === undefined
            || str === null
            || length === undefined) {
            return [];
        }

        // trim first
        str = str.trim();
        if (str.length <= length) {
            if (str.length === 0) {
                return [];
            }
            return [str];
        }

        let isValidPosition = (sub: string, i: number) => {
            let code = sub.charCodeAt(i);

            if (Number.isNaN(code)) {
                return true;
            }
            if (code < 0xD800 || code > 0xDFFF) {
                return true;
            }

            // High surrogate (could change last hex to 0xDB7F to treat high private
            // surrogates as single characters)
            if (0xD800 <= code && code <= 0xDBFF) {
                if (sub.length <= (i + 1)) {
                    return false;
                }
                let next = sub.charCodeAt(i + 1);
                if (0xDC00 > next || next > 0xDFFF) {
                    return false;
                }
                return true;
            }
            return true;
        };

        let chunks = [];
        // append a separator
        let rest = str + ' ';
        do {
            let piece = rest.substring(0, length + (offset > 0 ? 1 : 0));

            // check if the split-position is valid (not in breaking emoji)
            if (!isValidPosition(piece, piece.length - 1)) {
                piece = piece.substring(0, piece.length - 1);
            }

            if (piece.length > length) {
                // if a offset defined...

                if (offset > 0) {
                    // ... search separator, backwards
                    let offsetString = piece.substring(Math.min(0, piece.length - offset));

                    // select the nearest neighbour separator
                    let neighbourSeparator = Math.max(
                            offsetString.lastIndexOf(' '),
                            offsetString.lastIndexOf('\r'),
                            offsetString.lastIndexOf('\n'),
                            offsetString.lastIndexOf('\t'),
                            offsetString.lastIndexOf('.'),
                        ) + 1;

                    if (neighbourSeparator > 0) {
                        // cut to neighbour separator
                        piece = piece.substring(0, piece.length
                            - offsetString.length
                            + neighbourSeparator);
                    } else {

                        // no valid separator found, cut
                        piece = piece.substring(0, length);
                    }
                }
            }

            // trim piece
            piece = piece.trim();

            if (piece.length > 0) {
                chunks.push(piece);
                // cut and trim the rest
                rest = rest.substring(piece.length).trim();
            } else {
                // abort, should not happen
                rest = '';
            }
        } while (rest.length > 0);

        return chunks;
    }

    public byteChunk(str: string, byteLength: number, offset: number = null): string[] {
        let chars = [...str];
        let chunks = [''];
        let currentChunkSize = 0;
        let chunkIndex = 0;
        let offsetChars = [' ', '\r', '\n', '\t', '.'];
        let lastSeparator = -1;
        chars.forEach ((charString: string) => {
            let length = Buffer.byteLength(charString, 'utf8');
            if (offset !== null) {
                if (offsetChars.indexOf(charString) > -1) {
                    lastSeparator = currentChunkSize + 1;
                }
            }
            // console.log(charString, length);
            if (currentChunkSize + length > byteLength) {
                let appendNewChunk = true;
                if (lastSeparator > -1) {
                    // check if sepeator in offset
                    if (currentChunkSize - lastSeparator <= offset
                        && chunks.length >= 1) {
                        // create new chunk with existing data
                        chunks.push(chunks[chunkIndex].substr(lastSeparator).trim());
                        // modify old chunk
                        chunks[chunkIndex] = chunks[chunkIndex].substr(0, lastSeparator).trim();
                        appendNewChunk = false;
                        currentChunkSize -= lastSeparator;
                        chunkIndex++;
                        lastSeparator = -1;
                    }
                }
                if (appendNewChunk) {
                    chunkIndex++;
                    currentChunkSize = 0;
                    // create a new chunk
                    chunks.push('');
                }
            }
            chunks[chunkIndex] = (chunks[chunkIndex]  + charString);
            currentChunkSize += length;
        });
        return chunks;
    }
}
