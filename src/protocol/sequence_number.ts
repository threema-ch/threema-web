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

/**
 * A generic sequence number with specific boundaries.
 *
 * Does not allow for wrapping.
 */
export class SequenceNumber {
    private readonly minValue: number;
    private readonly maxValue: number;
    private value: number;

    constructor(initialValue: number = 0, minValue: number, maxValue: number) {
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.value = initialValue;
    }

    /**
     * Validate a specific sequence number.
     */
    public validate(other: number) {
        if (other < this.minValue) {
            throw new Error(`Invalid sequence number: ${other} < 0`);
        }
        if (other > this.maxValue) {
            throw new Error(`Invalid sequence number: ${other} > ${this.maxValue}`);
        }
    }

    /**
     * Get the current value of the sequence number.
     */
    public get(): number {
        return this.value;
    }

    /**
     * Set the new value of the sequence number.
     */
    public set(value: number): void {
        this.validate(value);
        this.value = value;
    }

    /**
     * Increment the sequence number and return the sequence number as it was
     * before it has been incremented.
     */
    public increment(by: number = 1): number {
        if (by < 0) {
            throw new Error('Cannot decrement the sequence number');
        }
        const value = this.value;
        this.set(value + by);
        return value;
    }
}
