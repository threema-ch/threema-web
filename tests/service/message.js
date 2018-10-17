describe('MessageService', function() {

    let messageService;

    // Ignoring page reload request
    beforeAll(() => window.onbeforeunload = () => null);

    beforeEach(function() {

        // Inject constants
        module(($provide) => {
            $provide.constant('CONFIG', {
                'DEBUG': true,
            });
        });

        // Load threema services
        module('3ema.services');

        // Inject the MessageService
        inject(function(MessageService) {
            messageService = MessageService;
        });

    });

    describe ('getAccess', () => {
        let test = (m, r) => {
            return expect(messageService.getAccess(m, r));
        };
        it('invalid arguments', () => {
            test().toEqual(jasmine.objectContaining({
                quote: false,
                copy: false,
                ack: false,
                dec: false,
                delete: false,
                download: false,
            }));
        })

        const testCases = [['contact', {id: 'ECHOECHO', type: 'contact'}, true],
            ['gateway contact', {id: '*THREEMA', type: 'contact'}, true],
            ['group', {id: 1, type: 'group'}, false],
            ['distributionList', {id: 1, type: 'distributionList'}, false]]

        testCases.forEach((testData) => {

            let type = testData[0];
            let receiver = testData[1];
            let canAckDec = testData[2];

            describe(type, () => {
                it('text messages  ', () => {
                    test({isOutbox: false, type: 'text'}, receiver)
                        .toEqual(jasmine.objectContaining({
                            quote: true,
                            copy: true,
                            ack: true && canAckDec,
                            dec: true && canAckDec,
                            delete: true,
                            download: false,
                        }));

                    test({isOutbox: true, type: 'text'}, receiver)
                        .toEqual(jasmine.objectContaining({
                            quote: true,
                            copy: true,
                            ack: false,
                            dec: false,
                            delete: true,
                            download: false,
                        }));

                    test({isOutbox: false, type: 'text', state: 'user-ack'}, receiver)
                        .toEqual(jasmine.objectContaining({
                            quote: true,
                            copy: true,
                            ack: false,
                            dec: true && canAckDec,
                            delete: true,
                            download: false,
                        }));


                    test({isOutbox: false, type: 'text', state: 'user-dec'}, receiver)
                        .toEqual(jasmine.objectContaining({
                            quote: true,
                            copy: true,
                            ack: true && canAckDec,
                            dec: false,
                            delete: true,
                            download: false,
                        }));
                });

                it('location messages  ', () => {
                    test({isOutbox: false, type: 'text'}, receiver)
                        .toEqual(jasmine.objectContaining({
                            quote: true,
                            copy: true,
                            ack: true && canAckDec,
                            dec: true && canAckDec,
                            delete: true,
                            download: false,
                        }));

                    test({isOutbox: true, type: 'text'}, receiver)
                        .toEqual(jasmine.objectContaining({
                            quote: true,
                            copy: true,
                            ack: false,
                            dec: false,
                            delete: true,
                            download: false,
                        }));

                    test({isOutbox: false, type: 'text', state: 'user-ack'}, receiver)
                        .toEqual(jasmine.objectContaining({
                            quote: true,
                            copy: true,
                            ack: false,
                            dec: true && canAckDec,
                            delete: true,
                            download: false,
                        }));


                    test({isOutbox: false, type: 'text', state: 'user-dec'}, receiver)
                        .toEqual(jasmine.objectContaining({
                            quote: true,
                            copy: true,
                            ack: true && canAckDec,
                            dec: false,
                            delete: true,
                            download: false,
                        }));
                });

                ['image', 'video', 'audio', 'file'].forEach((type) => {
                    it('inbox ' + type, () => {
                        test({isOutbox: false, type: type}, receiver)
                            .toEqual(jasmine.objectContaining({
                                quote: false,
                                copy: false,
                                ack: true && canAckDec,
                                dec: true && canAckDec,
                                delete: true,
                                download: true,
                            }));
                    });

                    it('inbox (caption) ' + type, () => {
                        test({isOutbox: false, type: type, caption: 'test'}, receiver)
                            .toEqual(jasmine.objectContaining({
                                quote: true,
                                copy: true,
                                ack: true && canAckDec,
                                dec: true && canAckDec,
                                delete: true,
                                download: true,
                            }));
                    });

                    it('outbox ' + type, () => {
                        test({isOutbox: false, type: type}, receiver)
                            .toEqual(jasmine.objectContaining({
                                quote: false,
                                copy: false,
                                ack: true && canAckDec,
                                dec: true && canAckDec,
                                delete: true,
                                download: true,
                            }));
                    });


                    it('outbox (caption) ' + type, () => {
                        test({isOutbox: false, type: type, caption: 'test'}, receiver)
                            .toEqual(jasmine.objectContaining({
                                quote: true,
                                copy: true,
                                ack: true && canAckDec,
                                dec: true && canAckDec,
                                delete: true,
                                download: true,
                            }));
                    });
                });
            });
        });
    });

    describe ('showStatusIcon', () => {
        let test = (m, r) => {
            return expect(messageService.showStatusIcon(m, r));
        };

        it ('invalid arguments', () => {
            test(null, null).toEqual(false);
            test({}, null).toEqual(false);
            test(null, {}).toEqual(false);
            test({}, {}).toEqual(false);
        });


        let testAll = (receiver, outboxTrue, outboxFalse, inboxTrue, inboxFalse) => {
            let testDirection = (outbox, t, f) => {
                let testDirections = (states, toBe) => {
                    states.forEach((state) => {
                        it(state, () => {
                            test({isOutbox: outbox, state: state}, receiver).toBe(toBe);
                        });
                    });
                };
                testDirections(t, true);
                testDirections(f, false);
            };
            describe ('outbox', () => {
                testDirection(true, outboxTrue, outboxFalse);
            });

            describe ('inbox', () => {
                testDirection(false, inboxTrue, inboxFalse);
            });
        };

        describe ('normal contact', () => {
            testAll({id: 'ECHOECHO', type: 'contact'},
                ['delivered', 'read', 'send-failed', 'sent', 'pending', 'sending', 'user-ack', 'user-dec'],
                [],
                ['user-ack', 'user-dec'],
                ['delivered', 'read', 'send-failed', 'sent', 'pending', 'sending']
            );
        });

        describe ('gateway contact', () => {
            testAll({id: '*THREEMA', type: 'contact'},
                ['send-failed', 'pending', 'sending'],
                ['delivered', 'read', 'sent', 'user-ack', 'user-dec'],
                ['user-ack', 'user-dec'],
                ['delivered', 'read', 'send-failed', 'sent', 'pending', 'sending']
            );
        });

        describe ('Group', () => {
            testAll({id: 1, type: 'group'},
                ['send-failed', 'pending', 'sending'],
                ['delivered', 'read', 'sent', 'user-ack', 'user-dec'],
                [],
                ['delivered', 'read', 'send-failed', 'sent', 'pending', 'sending', 'user-ack', 'user-dec']
            );
        });

        describe ('Distribution List', () => {
            testAll({id: 1, type: 'distributionList'},
                [],
                ['send-failed', 'pending', 'sending', 'delivered', 'read', 'sent', 'user-ack', 'user-dec'],
                [],
                ['delivered', 'read', 'send-failed', 'sent', 'pending', 'sending', 'user-ack', 'user-dec']
            );
        });
    });

});
