describe('NotificationService', function() {

    let $service;

    // Ignoring page reload request
    beforeAll(() => window.onbeforeunload = () => null);

    beforeEach(function() {
        module(($provide) => {
            $provide.constant('$state', null);
        });

        module('3ema.services');

        // Inject the service
        inject(function(NotificationService) {
            $service = NotificationService;
        });

    });

    describe('getAppNotificationSettings', function () {
        let process = (dnd, sound) => {
            return $service.getAppNotificationSettings({
                notifications: {dnd: dnd, sound: sound},
            })
        };

        it('dnd enabled', () => {
            const res = process(
                {mode: 'on'},
                {mode: 'default'}
            );
            expect(res.sound.muted).toEqual(false);
            expect(res.dnd.enabled).toEqual(true);
            expect(res.dnd.mentionOnly).toEqual(false);
        });

        it('dnd enabled (no sound)', () => {
            const res = process(
                {mode: 'on'},
                {mode: 'muted'}
            );
            expect(res.sound.muted).toEqual(true);
            expect(res.dnd.enabled).toEqual(true);
            expect(res.dnd.mentionOnly).toEqual(false);
        });

        it('dnd disabled', () => {
            const res = process(
                {mode: 'off'},
                {mode: 'default'}
            );
            expect(res.sound.muted).toEqual(false);
            expect(res.dnd.enabled).toEqual(false);
            expect(res.dnd.mentionOnly).toEqual(false);
        });

        it('dnd disabled (no sound)', () => {
            const res = process(
                {mode: 'off'},
                {mode: 'muted'}
            );
            expect(res.sound.muted).toEqual(true);
            expect(res.dnd.enabled).toEqual(false);
            expect(res.dnd.mentionOnly).toEqual(false);
        });

        it('mention only', () => {
            const res = process(
                {mode: 'on', mentionOnly: true},
                {mode: 'default'}
            );
            expect(res.sound.muted).toEqual(false);
            expect(res.dnd.enabled).toEqual(true);
            expect(res.dnd.mentionOnly).toEqual(true);
        });

        it('until (not expired)', () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2018, 9, 9, 20, 42));
            const res = process(
                {mode: 'until', until: +(new Date(2018, 9, 9, 20, 50))},
                {mode: 'default'}
            );
            expect(res.sound.muted).toEqual(false);
            expect(res.dnd.enabled).toEqual(true);
            expect(res.dnd.mentionOnly).toEqual(false);
        });

        it('until (expired)', () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2018, 9, 9, 20, 42));
            const res = process(
                {mode: 'until', until: +(new Date(2018, 9, 9, 19, 50))},
                {mode: 'default'}
            );
            expect(res.sound.muted).toEqual(false);
            expect(res.dnd.enabled).toEqual(false);
            expect(res.dnd.mentionOnly).toEqual(false);
        });

        it('until (mention only, not expired)', () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2018, 9, 9, 20, 42));
            const res = process(
                {mode: 'until', until: +(new Date(2018, 9, 9, 20, 50)), mentionOnly: true},
                {mode: 'default'}
            );
            expect(res.sound.muted).toEqual(false);
            expect(res.dnd.enabled).toEqual(true);
            expect(res.dnd.mentionOnly).toEqual(true);
        });

        it('until (mention only, expired)', () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2018, 9, 9, 20, 42));
            const res = process(
                {mode: 'until', until: +(new Date(2018, 9, 9, 19, 50)), mentionOnly: true},
                {mode: 'default'}
            );
            expect(res.sound.muted).toEqual(false);
            expect(res.dnd.enabled).toEqual(false);
            expect(res.dnd.mentionOnly).toEqual(false);
        });
    });

    describe('getDndModeSimplified', function() {
        let process = (dnd, sound) => {
            return $service.getDndModeSimplified({
                notifications: {dnd: dnd, sound: sound},
            })
        };

        it('dnd enabled', () => {
            expect(process(
                {mode: 'on'},
                {mode: 'default'}
            )).toEqual('on');
        });

        it('dnd enabled (no sound)', () => {
            expect(process(
                {mode: 'on'},
                {mode: 'muted'}
            )).toEqual('on');
        });

        it('dnd disabled', () => {
            expect(process(
                {mode: 'off'},
                {mode: 'default'}
            )).toEqual('off');
        });

        it('dnd disabled (no sound)', () => {
            expect(process(
                {mode: 'off'},
                {mode: 'muted'}
            )).toEqual('off');
        });

        it('mention only', () => {
            expect(process(
                {mode: 'on', mentionOnly: true},
                {mode: 'default'}
            )).toEqual('mention');
        });

        it('mention only (no sound)', () => {
            expect(process(
                {mode: 'on', mentionOnly: true},
                {mode: 'muted'}
            )).toEqual('mention');
        });

        it('until (not expired)', () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2018, 9, 9, 20, 42));
            expect(process(
                {mode: 'until', until: +(new Date(2018, 9, 9, 20, 50))},
                {mode: 'default'}
            )).toEqual('on');
        });

        it('until (expired)', () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2018, 9, 9, 20, 42));
            expect(process(
                {mode: 'until', until: +(new Date(2018, 9, 9, 19, 50))},
                {mode: 'default'}
            )).toEqual('off');
        });

        it('until (mention only, not expired)', () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2018, 9, 9, 20, 42));
            expect(process(
                {mode: 'until', until: +(new Date(2018, 9, 9, 20, 50)), mentionOnly: true},
                {mode: 'default'}
            )).toEqual('mention');
        });

        it('until (mention only, expired)', () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2018, 9, 9, 20, 42));
            expect(process(
                {mode: 'until', until: +(new Date(2018, 9, 9, 19, 50)), mentionOnly: true},
                {mode: 'default'}
            )).toEqual('off');
        });
    });


});
