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

export class StringService {
    public byteChunk(str: string, byteLength: number, offset: number = null): string[] {
        const chars = [...str];
        const chunks = [''];
        let currentChunkSize = 0;
        let chunkIndex = 0;
        const offsetChars = [' ', '\r', '\n', '\t', '.'];
        let lastSeparator = -1;
        chars.forEach ((charString: string) => {
            const length = Buffer.byteLength(charString, 'utf8');
            if (offset !== null) {
                if (offsetChars.indexOf(charString) > -1) {
                    lastSeparator = currentChunkSize + 1;
                }
            }
            if (currentChunkSize + length > byteLength) {
                let appendNewChunk = true;
                if (lastSeparator > -1) {
                    // check if separator in offset
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

    /**
     * Return the word below the cursor position.
     *
     * If the cursor is at the end of a word, the word to the left of it will
     * be returned.
     *
     * If there is whitespace to the left of the cursor, then the returned
     * `WordResult` object will include the trimmed word to the left of the
     * cursor. The `realLength` includes the trimmed whitespace though.
     */
    public getWord(input: string, pos: number, additionalSeparators: string[] = null): threema.WordResult {
        const result = {
            word: null,
            realLength: 0,
        };
        if (input !== null && input.length > 0) {
            const chars = [...input];
            let charFound = false;
            const realPos = Math.min(pos, chars.length) - 1;

            if (realPos > 0) {
                const wordChars = new Array(realPos);
                for (let n = realPos; n >= 0; n--) {
                    const realChar = chars[n].trim();
                    if (realChar === '') {
                        // Abort
                        if (charFound === false) {
                            result.realLength++;
                            continue;
                        } else {
                            break;
                        }
                    } else if (additionalSeparators !== null) {
                        if (additionalSeparators.indexOf(chars[n]) > -1) {
                            // append char
                            result.realLength++;
                            wordChars[n] = realChar;
                            if (charFound === false) {
                                continue;
                            } else {
                                break;
                            }
                        }
                    }
                    result.realLength++;
                    wordChars[n] = realChar;
                    charFound = true;
                }
                result.word = wordChars.join('');
            }

        }
        return result;
    }
}
