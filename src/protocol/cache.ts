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
    private _byteLength = 0;
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
     * Get the total size of currently cached chunks in bytes.
     */
    public get byteLength(): number {
        return this._byteLength;
    }

    /**
     * Get a reference to the currently cached chunks.
     */
    public get chunks(): CachedChunk[] {
        return this.cache;
    }

    /**
     * Transfer an array of cached chunks to this cache instance.
     */
    public transfer(cache: CachedChunk[]): void {
        // Add chunks but remove all which should not be retransmitted
        cache = cache.filter((chunk) => chunk !== null);
        for (const chunk of cache) {
            this.append(chunk);
        }
    }

    /**
     * Append a chunk to the chunk cache.
     */
    public append(chunk: CachedChunk): void {
        // Update sequence number, update size & append chunk
        this._sequenceNumber.increment();
        if (chunk !== null) {
            this._byteLength += chunk.byteLength;
        }
        this.cache.push(chunk);
    }

    /**
     * Prune cached chunks that have been acknowledged.
     */
    public prune(theirSequenceNumber: number): void {
        try {
            this._sequenceNumber.validate(theirSequenceNumber);
        } catch (error) {
            throw new Error(`Remote sent us an invalid sequence number: ${theirSequenceNumber}`);
        }

        // Calculate the slice start index for the chunk cache
        // Important: Our sequence number is one chunk ahead!
        const beginOffset = theirSequenceNumber + 1 - this._sequenceNumber.get();
        if (beginOffset > 0) {
            throw new Error('Remote travelled through time and acknowledged a chunk which is in the future');
        } else if (-beginOffset > this.cache.length) {
            throw new Error('Remote travelled back in time and acknowledged a chunk it has already acknowledged');
        }

        // Slice our cache & recalculate size
        this.cache = beginOffset === 0 ? [] : this.cache.slice(beginOffset);
        this._byteLength = this.cache
            .filter((chunk) => chunk !== null)
            .reduce((sum, chunk) => sum + chunk.byteLength, 0);
    }
}
