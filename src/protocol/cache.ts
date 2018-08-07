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

import {SequenceNumber} from './sequence_number';

export type CachedChunk = Uint8Array | null;

/**
 * Contains chunks that have not yet been acknowledged.
 */
export class ChunkCache {
    private _sequenceNumber: SequenceNumber;
    private _size = 0;
    private cache: CachedChunk[] = [];

    constructor(sequenceNumber: SequenceNumber) {
        this._sequenceNumber = sequenceNumber;
    }

    /**
     * Get the current sequence number (e.g. of the **next** chunk to be added).
     */
    public get sequenceNumber(): SequenceNumber {
        return this._sequenceNumber;
    }

    /**
     * Get the size of currently stored chunks.
     */
    public get size(): number {
        return this._size;
    }

    /**
     * Get the currently cached chunks.
     */
    public get chunks(): CachedChunk[] {
        return this.cache;
    }

    /**
     * Transfer an array of cached chunks to this cache instance.
     */
    public transfer(cache: CachedChunk[]): void {
        // Add chunks but remove all which should not be retransmitted
        for (const chunk of cache) {
            if (chunk !== null) {
                this.append(chunk);
            }
        }
    }

    /**
     * Append a chunk to the chunk cache.
     */
    public append(chunk: CachedChunk): void {
        // Update sequence number, update size & append chunk
        this._sequenceNumber.increment();
        this._size += chunk.byteLength;
        this.cache.push(chunk);
    }

    /**
     * Acknowledge cached chunks and remove those from the cache.
     */
    public acknowledge(theirSequenceNumber: number): void {
        try {
            this._sequenceNumber.validate(theirSequenceNumber);
        } catch (error) {
            throw new Error(`Remote sent us an invalid sequence number: ${theirSequenceNumber}`);
        }

        // Calculate the slice start index for the chunk cache
        // Important: Our sequence number is one chunk ahead!
        const endOffset = theirSequenceNumber + 1 - this._sequenceNumber.get();
        if (endOffset > 0) {
            throw new Error('Remote travelled through time and acknowledged a chunk which is in the future');
        } else if (-endOffset > this.cache.length) {
            throw new Error('Remote travelled back in time and acknowledged a chunk it has already acknowledged');
        }

        // Slice our cache & recalculate size
        this.cache = endOffset === 0 ? [] : this.cache.slice(endOffset);
        this._size = this.cache.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    }
}
