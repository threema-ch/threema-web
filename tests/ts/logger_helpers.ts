/**
 * Copyright © 2016-2021 Threema GmbH (https://threema.ch/).
 *
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

// tslint:disable:no-reference
/// <reference path="../../src/threema.d.ts" />

import {Logger} from 'ts-log';

import {BaseConfidential} from '../../src/helpers/confidential';
import {ConsoleLogger, LevelLogger, MemoryLogger, TagLogger, TeeLogger, UnveilLogger} from '../../src/helpers/logger';

import LogLevel = threema.LogLevel;
import LogType = threema.LogType;

interface EnsureLoggedArgs {
    level: LogLevel,
    logger: TestLogger | TestLogger[],
    tag?: string | string[],
}

type LogRecord = [LogType, any?, ...any[]];
type LogFunction = (message?: any, ...args: any[]) => void;
// Supported log (level) types
const LOG_TYPES: LogType[] = ['debug', 'trace', 'info', 'warn', 'error'];


/**
 * Stores all log records in memory for evaluation.
 */
class TestLogger implements Logger {
    public readonly records: LogRecord[] = [];
    public readonly debug: LogFunction;
    public readonly trace: LogFunction;
    public readonly info: LogFunction;
    public readonly warn: LogFunction;
    public readonly error: LogFunction;

    constructor() {
        // Bind log level type methods
        for (const type of LOG_TYPES) {
            this[type] = this.append.bind(this, type);
        }
    }

    private append(type: LogType, message?: any, ...args: any[]): void {
        this.records.push([type, message, ...args])
    }
}

/**
 * A confidential log record for testing purposes.
 */
class TestConfidential extends BaseConfidential<string, string> {
    public readonly uncensored: string = 'uncensored';

    public censored(): string {
        return 'censored';
    }
}

/**
 * Log a record of each type.
 */
function logEachType(...loggers: Logger[]): void {
    for (const logger of loggers) {
        for (const type of LOG_TYPES) {
            logger[type](type);
        }
    }
}

/**
 * Format a log record. This splices a tag into the expected place.
 */
function formatLogRecord(record: LogRecord, tag?: string[]): LogRecord {
    if (tag === undefined) {
        return record;
    }

    // Splice tag into message
    const [type, ...args] = record;
    return [type, ...tag.concat(args)];
}

/**
 * Ensure a log record of a level equal to or above has been logged.
 */
function expectLogged(args: EnsureLoggedArgs): void {
    // Prepare arguments
    if (!(args.logger instanceof Array)) {
        args.logger = [args.logger];
    }
    let tag: string[];
    if (args.tag !== undefined) {
        tag = args.tag instanceof Array ? args.tag : [args.tag];
    }

    // Check for log records to be present, depending on the level
    for (const logger of args.logger) {
        // noinspection FallThroughInSwitchStatementJS
        switch (args.level) {
            case 'debug':
                expect(logger.records).toContain(formatLogRecord(['debug', 'debug'], tag));
                expect(logger.records).toContain(formatLogRecord(['trace', 'trace'], tag));
            case 'info':
                expect(logger.records).toContain(formatLogRecord(['info', 'info'], tag));
            case 'warn':
                expect(logger.records).toContain(formatLogRecord(['warn', 'warn'], tag));
            case 'error':
                expect(logger.records).toContain(formatLogRecord(['error', 'error'], tag));
            default:
                break;
        }
    }
}

describe('Logger Helpers', () => {
    describe('TestLogger', () => {
        it('stores log records', () => {
            const logger = new TestLogger();

            // Ensure a record of each type is being logged
            logEachType(logger);
            expectLogged({ level: 'debug', logger: logger });
        });
    });

    describe('TeeLogger', () => {
        it('forwards log records to each underlying logger', () => {
            const loggers: TestLogger[] = [
                new TestLogger(),
                new TestLogger(),
                new TestLogger(),
            ];
            const root = new TeeLogger(loggers);

            // Ensure a record of each type is being logged
            logEachType(root);
            expectLogged({ level: 'debug', logger: loggers });
        });
    });

    describe('LevelLogger', () => {
        it("'none' level discards everything", () => {
            const logger = new TestLogger();
            const root = new LevelLogger(logger, 'none');

            // Ensure a record of each expected type is being logged
            logEachType(root);
            expect(logger.records.length).toBe(0);
        });

        it("'debug' level discards nothing", () => {
            const logger = new TestLogger();
            const root = new LevelLogger(logger, 'debug');

            // Ensure a record of each expected type is being logged
            logEachType(root);
            expectLogged({ level: 'debug', logger: logger });
        });

        it("'info' level discards 'debug' and 'trace'", () => {
            const logger = new TestLogger();
            const root = new LevelLogger(logger, 'info');

            // Ensure a record of each expected type is being logged
            logEachType(root);
            expectLogged({ level: 'info', logger: logger });
        });

        it("'warn' level discards 'debug', 'trace' and 'info'", () => {
            const logger = new TestLogger();
            const root = new LevelLogger(logger, 'warn');

            // Ensure a record of each expected type is being logged
            logEachType(root);
            expectLogged({ level: 'warn', logger: logger });
        });

        it("'error' level discards 'debug', 'trace', 'info' and 'warn'", () => {
            const logger = new TestLogger();
            const root = new LevelLogger(logger, 'error');

            // Ensure a record of each expected type is being logged
            logEachType(root);
            expectLogged({ level: 'error', logger: logger });
        });
    });

    describe('TagLogger', () => {
        it('applies a tag', () => {
            const logger = new TestLogger();
            const root = new TagLogger(logger, 'tag');

            // Ensure a record of each type is being logged with the expected tag
            logEachType(root);
            expectLogged({ level: 'debug', tag: 'tag', logger: logger });
        });

        it('applies multiple tags', () => {
            const logger = new TestLogger();
            const root = new TagLogger(logger, 'tag1', 'tag2');

            // Ensure a record of each type is being logged with the expected tag
            logEachType(root);
            expectLogged({ level: 'debug', tag: ['tag1', 'tag2'], logger: logger });
        });
    });

    describe('UnveilLogger', () => {
        it('leaves normal log records untouched', () => {
            const logger = new TestLogger();
            const root = new UnveilLogger(logger);

            // Ensure a record of each expected type is being logged
            logEachType(root);
            expectLogged({ level: 'debug', logger: logger });
        });

        it('unveils confidential log record', () => {
            const logger = new TestLogger();
            const root = new UnveilLogger(logger);

            // Ensure a confidential record is being unveiled
            root.debug(new TestConfidential());
            expect(logger.records).toContain(['debug', 'uncensored']);
        });
    });

    describe('ConsoleLogger', () => {
        let backup: Logger = {} as Logger;
        let logger: TestLogger;

        beforeEach(() => {
            logger = new TestLogger();

            // Store each log level type method of console that we will override
            for (const type of LOG_TYPES) {
                backup[type] = console[type];
            }

            // Overwrite each log level type method of console
            for (const type of LOG_TYPES) {
                console[type] = logger[type];
            }
        });

        afterEach(() => {
            // Restore each log level type method of console that we have
            // previously overridden.
            for (const type of LOG_TYPES) {
                console[type] = backup[type];
            }
        });

        it('forwards log records to the console', () => {
            const root = new ConsoleLogger();

            // Ensure a record of each expected type is being logged
            logEachType(root);
            expectLogged({ level: 'debug', logger: logger });
        });

        it('leaves confidential log record untouched', () => {
            const root = new ConsoleLogger();

            // Ensure a confidential record is being left untouched
            const message = new TestConfidential();
            root.debug(message);
            expect(logger.records).toContain(['debug', message]);
        });
    });

    describe('MemoryLogger', () => {
        it('serialises each log record with a timestamp', () => {
            const start = Date.now();
            const logger = new MemoryLogger();

            // Ensure each log record has a timestamp.
            for (let i = 0; i < 10; ++i) {
                logger.debug(i);
            }
            const end = Date.now();
            const timestamps = JSON
                .parse(JSON.stringify(logger.getRecords(), logger.getReplacer(true)))
                .map((entry) => entry[0]);
            expect(timestamps.length).toBe(10);
            for (const timestamp of timestamps) {
                expect(timestamp).toBeGreaterThanOrEqual(start);
                expect(timestamp).toBeLessThanOrEqual(end);
            }
        });

        it('stores all arguments of the log record', () => {
            const logger = new MemoryLogger();

            // Ensure all arguments of the log record are being kept.
            // Note: All of these values need to serialised loss-less.
            const record = [
                'debug',
                null,
                true,
                1,
                'a',
                [2, 3],
                { b: 4 },
            ];
            logger.debug(...record.slice(1));
            const records = JSON
                .parse(JSON.stringify(logger.getRecords(), logger.getReplacer(true)))
                .map((entry) => entry.slice(1));
            expect(records.length).toBe(1);
            expect(records[0]).toEqual(record);
        });

        it("trims the first log record's message (tag)", () => {
            const logger = new MemoryLogger();

            // Ensure %c CSS style formatting placeholder remains but the tag
            // is being trimmed.
            const args = [
                null,
                true,
                1,
                'a',
                [2, 3],
                { b: 4 },
            ];
            logger.debug('  te%cst  ', 'color: #fff', ...args);
            const records = JSON
                .parse(JSON.stringify(logger.getRecords(), logger.getReplacer(true)))
                .map((entry) => entry.slice(1));
            expect(records.length).toBe(1);
            expect(records[0]).toEqual((['debug', 'te%cst', 'color: #fff'] as any[]).concat(args));
        });

        it("ignores style formatting beyond the log record's message (args)", () => {
            const logger = new MemoryLogger();

            // Ensure %c CSS style formatting placeholder and the following
            // argument are not being touched.
            const record = [
                'debug',
                'test',
                '  me%cow  ',
                'color: #fff',
                null,
                true,
                '  ra%cwr  ',
                'color: #ffa500',
                1,
                'a',
                [2, 3],
                { b: 4 },
            ];
            logger.debug(...record.slice(1));
            const records = JSON
                .parse(JSON.stringify(logger.getRecords(), logger.getReplacer(true)))
                .map((entry) => entry.slice(1));
            expect(records.length).toBe(1);
            expect(records[0]).toEqual(record);
        });

        it('serialises standard types', () => {
            const logger = new MemoryLogger();

            // Ensure 'null', 'boolean', 'number' and 'string' are being
            // represented loss-less.
            const record = [
                'debug',
                null,
                false,
                1337,
                'meow?',
            ];
            logger.debug(...record.slice(1));
            const records = JSON
                .parse(JSON.stringify(logger.getRecords(), logger.getReplacer(true)))
                .map((entry) => entry.slice(1));
            expect(records.length).toBe(1);
            expect(records[0]).toEqual(record);
        });

        it('serialises confidential types sanitised, if requested', () => {
            const logger = new MemoryLogger();

            // Ensure 'Confidential' messages are being sanitised.
            const confidential = new TestConfidential();
            logger.debug(confidential, confidential, confidential);
            const records = JSON
                .parse(JSON.stringify(logger.getRecords(), logger.getReplacer(true)))
                .map((entry) => entry.slice(1));
            expect(records.length).toBe(1);
            expect(records[0]).toEqual(['debug', 'censored', 'censored', 'censored']);
        });

        it('serialises confidential types as is, if requested', () => {
            const logger = new MemoryLogger();

            // Ensure 'Confidential' messages are being sanitised.
            const confidential = new TestConfidential();
            logger.debug(confidential, confidential, confidential);
            const records = JSON
                .parse(JSON.stringify(logger.getRecords(), logger.getReplacer(false)))
                .map((entry) => entry.slice(1));
            expect(records.length).toBe(1);
            expect(records[0]).toEqual(['debug', 'uncensored', 'uncensored', 'uncensored']);
        });

        it('serialises exceptions', () => {
            const logger = new MemoryLogger();

            // Ensure exceptions are being represented (in their lossy string form).
            const error = new Error('WTF!');
            logger.error(error);
            const records = JSON
                .parse(JSON.stringify(logger.getRecords(), logger.getReplacer(true)))
                .map((entry) => entry.slice(1));
            expect(records.length).toBe(1);
            expect(records[0]).toEqual(['error', error.toString()]);
        });

        it('serialises unrepresentable binary types', () => {
            const logger = new MemoryLogger();

            // Ensure 'ArrayBuffer', 'Uint8Array' and 'Blob' are being
            // represented with metadata only.
            const buffer = new ArrayBuffer(10);
            const array = new Uint8Array(buffer, 2, 6);
            const blob = new Blob([JSON.stringify({ a: 10 })], { type: 'application/json'} );
            logger.debug(buffer, array, blob);
            const records = JSON
                .parse(JSON.stringify(logger.getRecords(), logger.getReplacer(true)))
                .map((entry) => entry.slice(1));
            expect(records.length).toBe(1);
            expect(records[0]).toEqual([
                'debug',
                '[ArrayBuffer: length=10]',
                '[Uint8Array: length=6, offset=2]',
                `[Blob: length=${blob.size}, type=application/json]`,
            ]);
        });

        it('serialises class instances', () => {
            const logger = new MemoryLogger();

            // Ensure instances are being represented with their name.
            logger.debug(logger);
            const records = JSON
                .parse(JSON.stringify(logger.getRecords(), logger.getReplacer(true)))
                .map((entry) => entry.slice(1));
            expect(records.length).toBe(1);
            expect(records[0]).toEqual(['debug', '[MemoryLogger]']);
        });

        it('serialises objects recursively', () => {
            const logger = new MemoryLogger();

            // Ensure an object's properties are being serialised recursively.
            const object = {
                bool: true,
                inner: {
                    number: 4,
                },
                array: ['a', 'b'],
            };
            logger.debug(object);
            const records = JSON
                .parse(JSON.stringify(logger.getRecords(), logger.getReplacer(true)))
                .map((entry) => entry.slice(1));
            expect(records.length).toBe(1);
            expect(records[0]).toEqual(['debug', object]);
        });

        it('serialises arrays recursively', () => {
            const logger = new MemoryLogger();

            // Ensure each item of an array is being serialised recursively.
            const array = [
                false,
                { null: null },
                ['a', 'b'],
            ];
            logger.debug(array);
            const records = JSON
                .parse(JSON.stringify(logger.getRecords(), logger.getReplacer(true)))
                .map((entry) => entry.slice(1));
            expect(records.length).toBe(1);
            expect(records[0]).toEqual(['debug', array]);
        });

        it('respects the supplied log record limit', () => {
            const logger = new MemoryLogger(2);

            // Ensure only the last two log records are being kept
            for (let i = 0; i < 10; ++i) {
                logger.debug(i);
            }
            const records = JSON
                .parse(JSON.stringify(logger.getRecords(), logger.getReplacer(true)))
                .map((entry) => entry.slice(1));
            expect(records).toEqual([
                ['debug', 8],
                ['debug', 9],
            ]);
        });
    });
});
