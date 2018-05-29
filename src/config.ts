/**
 * Threema Web configuration.
 *
 * The various options are explained in the `README.md` file.
 */
export default {

    // General
    SELF_HOSTED: false,
    PREV_PROTOCOL_LAST_VERSION: '1.8.2',

    // SaltyRTC
    SALTYRTC_HOST: 'saltyrtc-beta.threema.ch',
    SALTYRTC_HOST_PREFIX: 'saltyrtc-',
    SALTYRTC_HOST_SUFFIX: '.threema.ch',
    SALTYRTC_PORT: 443,
    SALTYRTC_SERVER_KEY: 'b1337fc8402f7db8ea639e05ed05d65463e24809792f91eca29e88101b4a2171',

    // ICE
    ICE_SERVERS: [{
        urls: [
            'turn:ds-turn.threema.ch:443?transport=udp',
            'turn:ds-turn.threema.ch:443?transport=tcp',
            'turns:ds-turn.threema.ch:443',
        ],
        username: 'threema-angular',
        credential: 'Uv0LcCq3kyx6EiRwQW5jVigkhzbp70CjN2CJqzmRxG3UGIdJHSJV6tpo7Gj7YnGB',
    }],

    // Push
    PUSH_URL: 'https://push-web-beta.threema.ch/push',

    // Debugging options
    DEBUG: false,
    MSG_DEBUGGING: false, // Log all incoming and outgoing messages
    MSGPACK_DEBUGGING: false, // Log URLs to the msgpack visualizer
    ICE_DEBUGGING: false,

} as threema.Config;
