describe('TrustedKeyStoreService', function() {

    let $service;

    const STORAGE_KEY = 'trusted-test';

    // Ignoring page reload request
    beforeAll(() => window.onbeforeunload = () => null);

    beforeEach(function() {
        module('3ema.services');

        // Inject the service
        inject(function(TrustedKeyStore) {
            $service = TrustedKeyStore;
            foo = $service;
            $service.STORAGE_KEY = STORAGE_KEY;
        });
    });

    it('localstorage is not blocked', () => {
        expect($service.blocked).toBe(false);
    });

    it('stringToBytes', () => {
        expect($service.stringToBytes('asdf')).toEqual(Uint8Array.of(0x61, 0x73, 0x64, 0x66));
    });

    it('pwToKey', () => {
        expect($service.pwToKey('mehmetefendi')).toEqual(Uint8Array.of(
            132, 95, 3, 249, 12, 29, 57, 169,
            54, 146, 171, 111, 43, 69, 133, 87,
            26, 207, 236, 120, 176, 94, 2, 231,
            72, 177, 74, 104, 102, 109, 50, 13
        ));
    });

    function roundtrip(tokenType) {
        const pubkey = Uint8Array.of(1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6,7,7,7,7,8,8,8,8);
        const seckey = Uint8Array.of(2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6,7,7,7,7,8,8,8,8,9,9,9,9);
        const peerkey = Uint8Array.of(3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6,7,7,7,7,8,8,8,8,9,9,9,9,10,10,10,10);
        const token = 'yaytoken';
        const password = 'baristapro';

        $service.clearTrustedKey();

        expect($service.hasTrustedKey()).toBe(false);
        expect($service.retrieveTrustedKey(password)).toEqual(null);

        $service.storeTrustedKey(pubkey, seckey, peerkey, token, tokenType, password);

        expect($service.hasTrustedKey()).toBe(true);
        expect($service.retrieveTrustedKey(password)).toEqual({
            ownPublicKey: pubkey,
            ownSecretKey: seckey,
            peerPublicKey: peerkey,
            pushToken: token,
            pushTokenType: tokenType,
        });

        // Clean up
        $service.clearTrustedKey();
        expect($service.hasTrustedKey()).toBe(false);
    }

    it('roundtripGcm', () => {
        roundtrip('gcm');
    });

    it('roundtripApns', () => {
        roundtrip('apns');
    });

    it('roundtripHms', () => {
        roundtrip('hms');
    });

    // When no push token is set, then both the token and the token type retrieved should be null.
    it('roundtripNoToken', () => {
        const pubkey = Uint8Array.of(1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6,7,7,7,7,8,8,8,8);
        const seckey = Uint8Array.of(2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6,7,7,7,7,8,8,8,8,9,9,9,9);
        const peerkey = Uint8Array.of(3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6,7,7,7,7,8,8,8,8,9,9,9,9,10,10,10,10);
        const password = 'baristapro';

        $service.clearTrustedKey();

        expect($service.hasTrustedKey()).toBe(false);
        expect($service.retrieveTrustedKey(password)).toEqual(null);

        $service.storeTrustedKey(pubkey, seckey, peerkey, null, null, password);

        expect($service.hasTrustedKey()).toBe(true);
        const keyinfo = $service.retrieveTrustedKey(password);
        expect(keyinfo.ownPublicKey).toEqual(pubkey);
        expect(keyinfo.ownSecretKey).toEqual(seckey);
        expect(keyinfo.peerPublicKey).toEqual(peerkey);
        expect(keyinfo.pushToken).toEqual(null);
        expect(keyinfo.pushTokenType).toEqual(null);

        // Clean up
        $service.clearTrustedKey();
    });

    it('decryptGcm', () => {
        $service.clearTrustedKey();
        window.localStorage.setItem(STORAGE_KEY, 'dfc0583350096ad02080f11113824fd65bd916ec295bd43f:33813017f6a7cecc9d6e1be858f9d5217496e2023de8fe0227a616f9d78339800da20bb1b83765ca83289f3f1ecfd9293934a15ac31127e91f186205c310c9bfefeccab9f58155930ab5e19804d4d304c4c61cc54e4f9dd695a5d222ab9af48dab1e2beccf7dbacdf82e144220f50b25b41f009c24296da86bddd83e48cb6719377d99dbb2fda2cc56b2c2c86df2ab27b7053b1c01cec2ec');
        const keyinfo = $service.retrieveTrustedKey('espressodopio');
        expect(keyinfo.pushToken).toEqual('asdfasdfjklo:DFLKJALKDJFKLJDASLKFJLDJF');
        expect(keyinfo.pushTokenType).toEqual('gcm');
        $service.clearTrustedKey();
    });

    it('decryptApns', () => {
        $service.clearTrustedKey();
        window.localStorage.setItem(STORAGE_KEY, 'e52061adf1093236b698876be67476015f8846f01060eb28:80e4ec31bb0390ef331c402937e45177c3450551ca29e8e7211a136c93a7cd70fe94de60212cb7b645149803e89681147a7fef9d3386064246aab8f85609835f38cc46a333267a20657076862aae653ff9bbe9f009b68d59cd7a8cf60a6f4cc4dfad43e6328132de0bd99a0b8555f7a93db7f7269f49dbdba0b29d0a7a810798bb314878b759944ebbb5e1dc7bc0d5597a3063875d0ba3c2');
        const keyinfo = $service.retrieveTrustedKey('espressodopio');
        expect(keyinfo.pushToken).toEqual('asdfasdfjklo:DFLKJALKDJFKLJDASLKFJLDJF');
        expect(keyinfo.pushTokenType).toEqual('apns');
        $service.clearTrustedKey();
    });

    it('decryptInvalidPushTokenType', () => {
        $service.clearTrustedKey();
        window.localStorage.setItem(STORAGE_KEY, '8a139834b5e6505b5ce8f2ee4243884e61cc9a928024dc9ad7764a8468af03f6a68a9fced7bb40c9a4fb3bb73eb5edba70253dfc90f3900d0135f7db8af77d9182b417bddcfd3fe7beb2e7f35fa17926b1cfc9fdf074798ca63c579667f95d9707fe35d87493bf46a07103daeee6199e9d7bda3fd170ee75490db79cf805406ff02e5afd47ced502451e69dcac5233b9a52f280b09147e73');
        const keyinfo = $service.retrieveTrustedKey('espressodopio');
        expect(keyinfo).toEqual(null);
        $service.clearTrustedKey();
    });

    // Legacy push tokens don't have a type prefix
    it('decryptLegacy', () => {
        $service.clearTrustedKey();
        window.localStorage.setItem(STORAGE_KEY, 'e6a7a40344361184b9d66bb658a6cc8d0fd4df2ab86affdd:2ee05bf4833f26ecbcac1f0301884d8137aeb2d98f485690bc73dbec943d20e9ad51e851a8568a88d880213d77095a3ec195298b1577804537c5000e6e4182348ed919e74e83b3e7a552ced2b6d52bbeb7ef661fd64111d1c5875af2e96cea828a69dbec71f50702cf3df629dc502c6f76c8e16e8f41127601031d8c20e22939e54585c8db58c7383e3e412368892cef700884fe7582');
        const keyinfo = $service.retrieveTrustedKey('espressodopio');
        expect(keyinfo.pushToken).toEqual('asdfasdfjklo:DFLKJALKDJFKLJDASLKFJLDJF');
        expect(keyinfo.pushTokenType).toEqual('gcm');
        $service.clearTrustedKey();
    });

});
