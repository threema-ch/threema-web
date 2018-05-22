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

});
