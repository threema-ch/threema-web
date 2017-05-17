describe('QrCodeService', function() {

    let $service;

    // Ignoring page reload request
    beforeAll(() => window.onbeforeunload = () => null);

    beforeEach(function() {

        module(($provide) => {
            $provide.constant('PROTOCOL_VERSION', 1337);
            $provide.constant('CONFIG', {
                'SELF_HOSTED': false,
            });
        });

        module('3ema.services');

        // Inject the service
        inject(function(QrCodeService) {
            $service = QrCodeService;
        });

    });

    it('generates correct payload', () => {
        // Example from docs/qr_code.md
        let permanentKey = Uint8Array.of(66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66,
            66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66);
        let authToken = Uint8Array.of(35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35,
            35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35);
        let serverKey = Uint8Array.of(19, 55, 19, 55, 19, 55, 19, 55, 19, 55, 19, 55, 19, 55, 19, 55,
            19, 55, 19, 55, 19, 55, 19, 55, 19, 55, 19, 55, 19, 55, 19, 55);
        let host = 'saltyrtc.example.org';
        let port = 1234;
        let persistent = true;
        let payload = $service.buildQrCodePayload(permanentKey, authToken, serverKey, host, port, persistent);
        expect(payload).toEqual("BTkCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIxM3EzcTNxM3EzcTNxM3EzcTNxM3EzcTNxM3EzcTNxM3BNJzYWx0eXJ0Yy5leGFtcGxlLm9yZw==");
    });

    it('sends zero bytes if no server key was specified', () => {
        // Example from docs/qr_code.md
        let permanentKey = Uint8Array.of(66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66,
                                         66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66);
        let authToken = Uint8Array.of(35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35,
                                      35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35);
        let host = 'saltyrtc.example.org';
        let port = 1234;
        let persistent = true;
        let payload = $service.buildQrCodePayload(permanentKey, authToken, null, host, port, persistent);
        expect(payload).toEqual("BTkCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABNJzYWx0eXJ0Yy5leGFtcGxlLm9yZw==");
    });

});
