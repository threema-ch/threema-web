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
import {BaseConfidential} from './confidential';
import LogType = threema.LogType;
import LogLevel = threema.LogLevel;
import LogRecord = threema.LogRecord;

type LogFunction = (message?: any, ...args: any[]) => void;

// Supported log (level) types
const LOG_TYPES: LogType[] = ['debug', 'trace', 'info', 'warn', 'error'];
// Types allowed for serialisation
const ALLOWED_TYPES: any[] = [Boolean, Number, String, Array];

/**
 * Forwards log records to one or more loggers.
 */
export class TeeLogger implements Logger {
    private readonly loggers: Logger[];
    public readonly debug: LogFunction;
    public readonly trace: LogFunction;
    public readonly info: LogFunction;
    public readonly warn: LogFunction;
    public readonly error: LogFunction;

    constructor(loggers: Logger[]) {
        this.loggers = loggers;

        // Bind log level type methods
        for (const type of LOG_TYPES) {
            this[type] = this.forward.bind(this, type);
        }
    }

    /**
     * Forward a log record to each underlying logger.
     * @param type The log record level type.
     * @param message The log message.
     * @param args Further arguments of the log record.
     */
    private forward(type: LogType, message?: any, ...args: any[]): void {
        for (const log of this.loggers) {
            log[type](message, ...args);
        }
    }
}

/**
 * Filters log messages depending on the applied log level.
 *
 * Wraps a normal logger and forwards all log records that have not been
 * filtered by the log level.
 */
export class LevelLogger implements Logger {
    public readonly logger: Logger;
    public readonly level: LogLevel;
    public readonly debug: LogFunction = this.noop;
    public readonly trace: LogFunction = this.noop;
    public readonly info: LogFunction = this.noop;
    public readonly warn: LogFunction = this.noop;
    public readonly error: LogFunction = this.noop;

    constructor(logger: Logger, level: LogLevel) {
        this.logger = logger;
        this.level = level;

        // Bind corresponding method to log level type, if enabled
        // noinspection FallThroughInSwitchStatementJS
        switch (level) {
            case 'debug':
                this.debug = this.logger.debug.bind(this.logger);
                this.trace = this.logger.trace.bind(this.logger);
            case 'info':
                this.info = this.logger.info.bind(this.logger);
            case 'warn':
                this.warn = this.logger.warn.bind(this.warn);
            case 'error':
                this.error = this.logger.error.bind(this.error);
            default:
                break;
        }
    }

    private noop(): void {
        // noop
    }
}

/**
 * Adds a prefix before forwarding log records to another logger.
 */
export class TagLogger implements Logger {
    public readonly logger: Logger;
    public readonly debug: LogFunction;
    public readonly trace: LogFunction;
    public readonly info: LogFunction;
    public readonly warn: LogFunction;
    public readonly error: LogFunction;

    constructor(logger: Logger, ...tag: string[]) {
        this.logger = logger;

        // Apply a tag to each log level type method of the logger
        for (const type of LOG_TYPES) {
            this[type] = logger[type].bind(logger, ...tag);
        }
    }
}

/**
 * Forwards all log records to another logger while unveiling confidential
 * log records.
 */
export class UnveilLogger implements Logger {
    public readonly logger: Logger;
    public readonly debug: LogFunction;
    public readonly trace: LogFunction;
    public readonly info: LogFunction;
    public readonly warn: LogFunction;
    public readonly error: LogFunction;

    constructor(logger: Logger) {
        this.logger = logger;

        // Bind log level type methods
        for (const type of LOG_TYPES) {
            this[type] = this.unveil.bind(this, type);
        }
    }

    private unveil(type: LogType, ...args: any[]): void {
        args = args.map((item) => item instanceof BaseConfidential ? item.uncensored : item);
        this.logger[type](...args);
    }
}

/**
 * Forwards all log records to the default `Console` logger.
 */
export class ConsoleLogger implements Logger {
    // tslint:disable:no-console
    public readonly debug: LogFunction = console.debug;
    public readonly trace: LogFunction = console.trace;
    public readonly info: LogFunction = console.info;
    public readonly warn: LogFunction = console.warn;
    public readonly error: LogFunction = console.error;
    // tslint:enable:no-console
}

/**
 * Stores log records in memory.
 *
 * A limit can be provided which results in a circular memory buffer, where old
 * log records are being continuously dropped in case the limit would be
 * exceeded by a new log record.
 *
 * Since serialisation can be expensive, this holds references to objects
 * until explicit serialisation is being requested.
 *
 * Note: This logger will serialise confidential log arguments censored.
 */
export class MemoryLogger implements Logger {
    private readonly records: LogRecord[] = [];
    public readonly limit: number = 0;
    public readonly debug: LogFunction;
    public readonly trace: LogFunction;
    public readonly info: LogFunction;
    public readonly warn: LogFunction;
    public readonly error: LogFunction;

    constructor(limit: number = 0) {
        this.limit = limit;

        // Bind log level type methods
        for (const type of LOG_TYPES) {
            this[type] = this.append.bind(this, type);
        }
    }

    /**
     * Append a log record to the memory buffer.
     *
     * Drops the oldest log record if the log record limit would be exceeded.
     *
     * @param type The log record level type.
     * @param message The log message.
     * @param args Further arguments of the log record
     */
    private append(type: LogType, message?: any, ...args: any[]): void {
        // Remove oldest record if needed
        if (this.limit > 0 && this.records.length >= this.limit) {
            this.records.shift();
        }

        // Add newest record
        this.records.push([Date.now(), type, message, ...args]);
    }

    /**
     * Get a copy of all currently logged records. Strips any style formatting
     * of the log tags.
     *
     * Important: Objects implementing the `Confidential` interface will be
     *            returned as is.
     */
    public getRecords(): LogRecord[] {
        return this.records.map(([date, type, message, ...args]: LogRecord) => {
            // Trim first message (tag)
            if (message !== null && message !== undefined && message.constructor === String) {
                message = message.trim();
            }
            return [date, type, message, ...args];
        });
    }

    /**
     * Replacer function for serialising log records to JSON.
     *
     * A recursive filter will be applied:
     *
     * - the types `null`, `string`, `number` and `boolean` will be returned
     *   unmodified,
     * - an object implementing the `Confidential` interface will be returned
     *   sanitised,
     * - an `Error` instance will be left as is,
     * - the binary types `Uint8Array` and `Blob` will only return meta
     *   information about the content, and
     * - everything else will return the value's type instead of the value
     *   itself.
     */
    public static replacer(key: string, value: any): any {
        // Handle `null` and `undefined` early
        if (value === null || value === undefined) {
            return value;
        }

        // Apply filter to confidential data
        if (value instanceof BaseConfidential) {
            return value.censored();
        }

        // Allowed (standard) types
        for (const allowedType of ALLOWED_TYPES) {
            if (value.constructor === allowedType) {
                return value;
            }
        }

        // Allow exceptions
        if (value instanceof Error) {
            return value.toString();
        }

        // Filter binary data
        if (value instanceof ArrayBuffer) {
            return `[ArrayBuffer: length=${value.byteLength}]`;
        }
        if (value instanceof Uint8Array) {
            return `[Uint8Array: length=${value.byteLength}, offset=${value.byteOffset}]`;
        }
        if (value instanceof Blob) {
            return `[Blob: length=${value.size}, type=${value.type}]`;
        }

        // Plain object
        if (value.constructor === Object) {
            return value;
        }

        // Not listed
        return `[${value.constructor.name}]`;
    }
}
