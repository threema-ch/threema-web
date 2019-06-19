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
import {ConsoleLogger, LevelLogger, MemoryLogger, TagLogger, TeeLogger, UnveilLogger} from '../helpers/logger';
import LogLevel = threema.LogLevel;

/**
 * Initialises logging and hands out Logger instances.
 */
export class LogService {
    private readonly config: threema.Config;
    public readonly memory: MemoryLogger;
    private readonly root: TeeLogger;

    public static $inject = ['CONFIG'];
    constructor(config: threema.Config) {
        this.config = config;

        // Initialise root logger
        let logger: Logger;
        const loggers: Logger[] = [];

        // Initialise console logging
        logger = new ConsoleLogger();
        logger = new UnveilLogger(logger);
        if (config.CONSOLE_LOG_LEVEL !== 'debug') {
            logger = new LevelLogger(logger, config.CONSOLE_LOG_LEVEL);
        }
        loggers.push(logger);

        // Initialise memory logging
        logger = this.memory = new MemoryLogger(config.REPORT_LOG_LIMIT);
        if (config.REPORT_LOG_LEVEL !== 'debug') {
            logger = new LevelLogger(logger, config.REPORT_LOG_LEVEL);
        }
        loggers.push(logger);

        // Initialise tee logging
        this.root = new TeeLogger(loggers);
    }

    /**
     * Get a logger.
     * @param tag The tag prefix for the logger.
     * @param style Optional CSS style to be included with the tag.
     * @param level An optional level to be used. Note that loggers higher up
     *   in the chain will supersede filtering of the log level. Thus, it is
     *   possible to reduce the amount of logged levels but not increase them.
     */
    public getLogger(tag: string, style?: string, level?: LogLevel): Logger {
        // Style the tag
        let styledTag: string;
        if (style !== undefined) {
            styledTag = `%c[${tag}]`;
        } else {
            styledTag = `[${tag}]`;
        }

        // Pad the styled tag
        styledTag = styledTag.padStart(this.config.LOG_TAG_PADDING + styledTag.length - tag.length);

        // Create logger instance
        let logger: Logger;
        if (style !== undefined) {
            logger = new TagLogger(this.root, styledTag, style);
        } else {
            logger = new TagLogger(this.root, styledTag);
        }
        if (level !== undefined) {
            logger = new LevelLogger(logger, level);
        }
        return logger;
    }
}
