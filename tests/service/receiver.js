describe('ReceiverService', function () {

    let $service;

    // Ignoring page reload request
    beforeAll(() => window.onbeforeunload = () => null);

    beforeEach(function () {

        module('3ema.services');

        // Inject the service
        inject(function (ReceiverService) {
            $service = ReceiverService;
        });

    });

    describe('Receiver', () => {
        it('is not blocked', () => {
            expect($service.isBlocked({
                id: 'FOOOOBAR',
                type: 'contact',
                isBlocked: false
            })).toEqual(false);
        });
        it('is blocked', () => {
            expect($service.isBlocked({
                id: 'FOOOOBAR',
                type: 'contact',
                isBlocked: true
            })).toEqual(true);
        });
    });

    describe('Invalid receiver', () => {
        it('group is not blocked', () => {
            expect($service.isBlocked({
                id: 'FOOOOBAR',
                type: 'group',
                isBlocked: false
            })).toEqual(false);
        });
        it('invalidType is not blocked', () => {
            expect($service.isBlocked({
                id: 'FOOOOBAR',
                type: 'invalidType',
                isBlocked: true
            })).toEqual(false);
        });
    });

    describe('Receiver without isBlocked flag', () => {
        it('is not blocked', () => {
            expect($service.isBlocked({
                id: 'FOOOOBAR',
                type: 'contact'
            })).toEqual(false);
        });
        it('and invalid type is blocked', () => {
            expect($service.isBlocked({
                id: 'FOOOOBAR',
                type: 'invalidType'
            })).toEqual(false);
        });
    });

    describe('Undefined receiver', () => {
        it('is not blocked', () => {
            expect($service.isBlocked(undefined)).toEqual(false);
        });
    });

});
