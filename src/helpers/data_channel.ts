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

import {Logger} from 'ts-log';

import {LogService} from '../services/log';

/**
 * A flow-controlled (sender side) data channel.
 */
export class FlowControlledDataChannel {
    // Logging
    private readonly log: Logger = null;

    // Data channel
    public readonly dc: RTCDataChannel;
    public readonly highWaterMark: number;

    // Flow control mechanism
    private _ready: Future<void> = new Future();

    /**
     * Create a flow-controlled (sender side) data channel.
     *
     * @param dc The data channel to be flow-controlled.
     * @param logService The logging service.
     * @param logLevel The desired log level.
     * @param lowWaterMark The low water mark unpauses the data channel
     *   once the buffered amount of bytes becomes less or equal to it.
     *   Defaults to 256 KiB.
     * @param highWaterMark The high water mark pauses the data channel
     *   once the buffered amount of bytes becomes greater or equal to it.
     *   Defaults to 1 MiB.
     */
    public constructor(
        dc: RTCDataChannel,
        logService: LogService,
        logLevel: threema.LogLevel,
        lowWaterMark: number = 256 * 1024,
        highWaterMark: number = 1024 * 1024,
    ) {
        this.log = logService.getLogger(
            `FlowControlledDataChannel.${dc.id}`, 'color: #fff; background-color: #009688', logLevel);
        this.dc = dc;
        this.highWaterMark = highWaterMark;

        // Allow writing
        this._ready.resolve();

        // Unpause once low water mark has been reached
        this.dc.bufferedAmountLowThreshold = lowWaterMark;
        this.dc.onbufferedamountlow = () => {
            if (!this._ready.done) {
                this.log.debug(`${this.dc.label} resumed (buffered=${this.dc.bufferedAmount})`);
                this._ready.resolve();
            }
        };
    }

    /**
     * A future whether the data channel is ready to be written on.
     */
    public get ready(): Future<void> {
        return this._ready;
    }

    /**
     * Write a message to the data channel's internal buffer for delivery to
     * the remote side.
     *
     * Important: Before calling this, the `ready` Promise must be awaited.
     *
     * @param message The message to be sent.
     * @throws Error in case the data channel is currently paused.
     */
    public write(message: Uint8Array): void {
        // Throw if paused
        if (!this._ready.done) {
            throw new Error('Unable to write, data channel is paused!');
        }

        // Try sending
        // Note: Technically we should be able to catch a TypeError in case the
        //       underlying buffer is full. However, there are other reasons
        //       that can result in a TypeError and no browser has implemented
        //       this properly so far. Thus, we use a well-tested high water
        //       mark instead and try to never fill the buffer completely.
        this.dc.send(message);

        // Pause once high water mark has been reached
        if (this.dc.bufferedAmount >= this.highWaterMark) {
            this._ready = new Future();
            this.log.debug(`${this.dc.label} paused (buffered=${this.dc.bufferedAmount})`);
        }
    }
}

/**
 * A flow-controlled (sender side) data channel that allows to queue an
 * infinite amount of messages.
 *
 * While this cancels the effect of the flow control, it prevents the data
 * channel's underlying buffer from becoming saturated by queueing all messages
 * in application space.
 */
export class UnboundedFlowControlledDataChannel extends FlowControlledDataChannel {
    private queue: Promise<void> = this.ready;

    /**
     * Write a message to the data channel's internal or application buffer for
     * delivery to the remote side.
     *
     * @param message The message to be sent.
     */
    public write(message: Uint8Array) {
        // Wait until ready, then write
        // Note: This very simple technique allows for ordered message
        //       queueing by using the event loop.
        this.queue = this.queue.then(() => this.writeWhenReady(message));
    }

    private async writeWhenReady(message: Uint8Array): Promise<void> {
        await this.ready;
        super.write(message);
    }
}
