describe('LogService', function() {
    const LOG_TYPES = ['debug', 'trace', 'info', 'warn', 'error'];
    let backup = {};
    let records = [];
    let $service;

    // Mock configuration
    const config = Object.assign({}, window.config);
    config.LOG_TAG_PADDING = 20;
    config.CONSOLE_LOG_LEVEL = 'info';
    config.REPORT_LOG_LEVEL = 'debug';
    config.REPORT_LOG_LIMIT = 10;

    // Ignoring page reload request
    beforeAll(() => window.onbeforeunload = () => null);

    beforeEach(function() {
        records = [];

        // Store each log level type method of console that we will override
        for (const type of LOG_TYPES) {
            backup[type] = console[type];
        }

        // Overwrite each log level type method of console
        for (const type of LOG_TYPES) {
            console[type] = (...args) => records.push(args);
        }

        // Angular magic
        module(($provide) => {
            $provide.constant('CONFIG', config);
        });
        module('3ema.services');

        // Inject the service
        inject(function(LogService) {
            $service = LogService;
        });
    });

    afterEach(() => {
        // Restore each log level type method of console that we have
        // previously overridden.
        for (const type of LOG_TYPES) {
            console[type] = backup[type];
        }
    });

    it('has correct root logger chain', () => {
        // With the above configuration:
        //
        //         TeeLogger
        //          v     v
        // LevelLogger   MemoryLogger
        //      v
        // UnveilLogger
        //      v
        // ConsoleLogger

        // Root logger
        expect($service.root.constructor.name).toBe('TeeLogger');
        let [left, right] = $service.root.loggers;

        // Console logger branch
        expect(left.constructor.name).toBe('LevelLogger');
        expect(left.level).toBe(config.CONSOLE_LOG_LEVEL);
        expect(left.logger.constructor.name).toBe('UnveilLogger');
        expect(left.logger.logger.constructor.name).toBe('ConsoleLogger');

        // Memory (report) logger branch
        expect(right.constructor.name).toBe('MemoryLogger');
        expect(right.limit).toBe(config.REPORT_LOG_LIMIT);
    });

    describe('getLogger', () => {
        it('log messages propagate to the root logger', () => {
            const logger = $service.getLogger('test');

            // Log
            logger.debug('debug');
            logger.trace('trace');
            logger.info('info');
            logger.warn('warn');
            logger.error('error');

            // Expect the console logger to have been called for 'info' and above
            expect(records.map((record) => record.slice(1))).toEqual([
                ['info'],
                ['warn'],
                ['error'],
            ]);

            // Expect the memory logger to have been called for 'debug' and above
            // (i.e. all log levels).
            expect(JSON
                .parse($service.memory.serialize())
                .map((record) => record.slice(1))
            ).toEqual([
                ['debug', '[test]', 'debug'],
                ['trace', '[test]', 'trace'],
                ['info', '[test]', 'info'],
                ['warn', '[test]', 'warn'],
                ['error', '[test]', 'error'],
            ]);
        });

        it('applies a tag (without style)', () => {
            const logger = $service.getLogger('test');
            logger.info('test');

            // Expect the console logger tag to be padded
            expect(records).toEqual([
                ['                [test]', 'test']
            ]);

            // Expect the memory logger tag to be unpadded
            expect(JSON
                .parse($service.memory.serialize())
                .map((record) => record.slice(1))
            ).toEqual([
                ['info', '[test]', 'test']
            ]);
        });

        it('applies a tag (with style)', () => {
            const style = 'color: #fff';
            const logger = $service.getLogger('test', style);
            logger.info('test');

            // Expect the console logger tag to be padded and styled
            expect(records).toEqual([
                ['                %c[test]', style, 'test']
            ]);

            // Expect the memory logger tag to be unpadded and unstyled
            expect(JSON
                .parse($service.memory.serialize())
                .map((record) => record.slice(1))
            ).toEqual([
                ['info', '[test]', 'test']
            ]);
        });

        it('applies the chosen level', () => {
            const logger = $service.getLogger('test', undefined, 'info');
            logger.debug('debug');
            logger.trace('trace');
            logger.info('info');

            // Expect the console logger to only contain the 'info' log
            expect(records.map((record) => record.slice(1))).toEqual([
                ['info']
            ]);

            // Expect the memory logger to only contain the 'info' log
            expect(JSON
                .parse($service.memory.serialize())
                .map((record) => record.slice(1))
            ).toEqual([
                ['info', '[test]', 'info']
            ]);
        });
    });
});
