/**
 * Threema Web configuration.
 *
 * The various options are explained in the `README.md` file.
 */

window.UserConfig = {
    // SaltyRTC
    SALTYRTC_HOST: 'saltyrtc-{prefix}.threema.ch',
    SALTYRTC_PORT: 443,
    SALTYRTC_SERVER_KEY: 'b1337fc8402f7db8ea639e05ed05d65463e24809792f91eca29e88101b4a2171',

    // ICE
    ICE_SERVERS: [{
        urls: [
            'turn:ds-turn-{prefix}.threema.ch:443?transport=udp',
            'turn:ds-turn-{prefix}.threema.ch:443?transport=tcp',
            'turns:ds-turn-{prefix}.threema.ch:443',
        ],
        username: 'threema-angular',
        credential: 'Uv0LcCq3kyx6EiRwQW5jVigkhzbp70CjN2CJqzmRxG3UGIdJHSJV6tpo7Gj7YnGB',
    }],

    // Push
    PUSH_URL: 'https://push-web.threema.ch/push',

    // Fonts
    // Note: If you want to use the Lab Grotesque font in your self-hosted
    //       instance (with SELF_HOSTED=true), you need to obtain a license for
    //       it and update the font URL below. Otherwise, Threema Web will
    //       fall back to Roboto.
    FONT_CSS_URL: null,
};
