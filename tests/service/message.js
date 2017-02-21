describe('MessageService', function() {

    let messageService;

    beforeEach(function() {

        // load threema services
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
                ack: false,
                dec: false,
                delete: false,
                download: false,
                copy: false,
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
                            ack: true && canAckDec,
                            dec: true && canAckDec,
                            delete: true,
                            download: false,
                            copy: false,
                        }));

                    test({isOutbox: true, type: 'text'}, receiver)
                        .toEqual(jasmine.objectContaining({
                            quote: true,
                            ack: false,
                            dec: false,
                            delete: true,
                            download: false,
                            copy: false,
                        }));

                    test({isOutbox: false, type: 'text', state: 'user-ack'}, receiver)
                        .toEqual(jasmine.objectContaining({
                            quote: true,
                            ack: false,
                            dec: true && canAckDec,
                            delete: true,
                            download: false,
                            copy: false,
                        }));


                    test({isOutbox: false, type: 'text', state: 'user-dec'}, receiver)
                        .toEqual(jasmine.objectContaining({
                            quote: true,
                            ack: true && canAckDec,
                            dec: false,
                            delete: true,
                            download: false,
                            copy: false,
                        }));
                });

                it('location messages  ', () => {
                    test({isOutbox: false, type: 'text'}, receiver)
                        .toEqual(jasmine.objectContaining({
                            quote: true,
                            ack: true && canAckDec,
                            dec: true && canAckDec,
                            delete: true,
                            download: false,
                            copy: false,
                        }));

                    test({isOutbox: true, type: 'text'}, receiver)
                        .toEqual(jasmine.objectContaining({
                            quote: true,
                            ack: false,
                            dec: false,
                            delete: true,
                            download: false,
                            copy: false,
                        }));

                    test({isOutbox: false, type: 'text', state: 'user-ack'}, receiver)
                        .toEqual(jasmine.objectContaining({
                            quote: true,
                            ack: false,
                            dec: true && canAckDec,
                            delete: true,
                            download: false,
                            copy: false,
                        }));


                    test({isOutbox: false, type: 'text', state: 'user-dec'}, receiver)
                        .toEqual(jasmine.objectContaining({
                            quote: true,
                            ack: true && canAckDec,
                            dec: false,
                            delete: true,
                            download: false,
                            copy: false,
                        }));
                });

                ['image', 'video', 'audio', 'file'].forEach((type) => {
                    it('inbox ' + type, () => {
                        test({isOutbox: false, type: type}, receiver)
                            .toEqual(jasmine.objectContaining({
                                quote: false,
                                ack: true && canAckDec,
                                dec: true && canAckDec,
                                delete: true,
                                download: true,
                                copy: false,
                            }));
                    });

                    it('inbox (caption) ' + type, () => {
                        test({isOutbox: false, type: type, caption: 'test'}, receiver)
                            .toEqual(jasmine.objectContaining({
                                quote: true,
                                ack: true && canAckDec,
                                dec: true && canAckDec,
                                delete: true,
                                download: true,
                                copy: false,
                            }));
                    });

                    it('outbox ' + type, () => {
                        test({isOutbox: false, type: type}, receiver)
                            .toEqual(jasmine.objectContaining({
                                quote: false,
                                ack: true && canAckDec,
                                dec: true && canAckDec,
                                delete: true,
                                download: true,
                                copy: false,
                            }));
                    });


                    it('outbox (caption) ' + type, () => {
                        test({isOutbox: false, type: type, caption: 'test'}, receiver)
                            .toEqual(jasmine.objectContaining({
                                quote: true,
                                ack: true && canAckDec,
                                dec: true && canAckDec,
                                delete: true,
                                download: true,
                                copy: false,
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

    describe('getFileName', () => {
        it('image', () => {
            expect(messageService.getFileName({type: 'image', id: '123'}))
                .toEqual('image-123.jpg');
        });

        it('audio', () => {
            expect(messageService.getFileName({type: 'audio', id: '123'}))
                .toEqual('audio-123.mp4');
        });

        it('video', () => {
            expect(messageService.getFileName({type: 'video', id: '123'}))
                .toEqual('video-123.mpg');
        });

        it('file', () => {
            expect(messageService.getFileName({type: 'file', id: '123', file: {
                type: 'xyz',
                name: 'the-quick-fox.xyz'
            }})).toEqual('the-quick-fox.xyz');
        });

        it('file without file object', () => {
            expect(messageService.getFileName({type: 'file', id: '123'}))
                .toEqual('file-123');
        });

        it('text', () => {
            expect(messageService.getFileName({type: 'text', id: '123'}))
                .toEqual(null);
        });

        it('no file types', () => {
            ['text', 'location', 'status', 'ballot'].forEach((type) => {
                expect(messageService.getFileName({type: type, id: '123'}))
                    .toEqual(null);
            });
        });

        it('no type', () => {
            expect(messageService.getFileName({id: 1}))
                .toEqual(null);
        });
        it('no id', () => {
            expect(messageService.getFileName({type: 'image'}))
                .toEqual(null);
        });

        it('no type', () => {
            expect(messageService.getFileName({id: 1}))
                .toEqual(null);
        });
        it('no message', () => {
            expect(messageService.getFileName(null))
                .toEqual(null);
            expect(messageService.getFileName())
                .toEqual(null);
        });

    });
});
