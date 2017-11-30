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
    public getWord(input: string, pos: number, additionalSeparators: string[] = null): string {
        if (input !== null && input.length > 0) {
            let chars = [...input];
            let charFound = false;
            let realPos = Math.min(pos, chars.length) - 1;

            let wordChars = new Array(realPos);
            for (let n = realPos; n >= 0; n--) {
                let realChar = chars[n].trim();
                if (realChar === '') {
                    // Abort
                    if (charFound === false) {
                        continue;
                    } else {
                        break;
                    }
                } else if (additionalSeparators !== null) {
                    if (additionalSeparators.indexOf(chars[n]) > -1) {
                        // append char
                        wordChars[n] = realChar;
                        if (charFound === false) {
                            continue;
                        } else {
                            break;
                        }
                    }
                }

                wordChars[n] = realChar;
                charFound = true;
            }
            return wordChars.join('');
        }
        return '';
    }
}
