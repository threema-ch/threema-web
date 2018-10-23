/**
 * Threema Web configuration.
 *
 * The various options are explained in the `README.md` file.
 */
// tslint:disable:max-line-length
export default {

    // General
    SELF_HOSTED: false,
    VERSION_MOUNTAIN: 'Glärnisch',
    VERSION_MOUNTAIN_URL: 'https://de.wikipedia.org/wiki/Gl%C3%A4rnisch',
    VERSION_MOUNTAIN_IMAGE_URL: 'https://commons.wikimedia.org/wiki/File:Glarus_mit_Gl%C3%A4rnisch,_Sicht_Ennetberge_(18948043634).jpg',
    VERSION_MOUNTAIN_IMAGE_COPYRIGHT: 'CC BY Hans Bühler',
    VERSION_MOUNTAIN_HEIGHT: 2915,
    PREV_PROTOCOL_LAST_VERSION: '1.8.2',
    GIT_BRANCH: 'master',

    // SaltyRTC
    SALTYRTC_HOST: null,
    SALTYRTC_HOST_PREFIX: 'saltyrtc-',
    SALTYRTC_HOST_SUFFIX: '.threema.ch',
    SALTYRTC_PORT: 443,
    SALTYRTC_SERVER_KEY: 'b1337fc8402f7db8ea639e05ed05d65463e24809792f91eca29e88101b4a2171',
    SALTYRTC_LOG_LEVEL: 'warn',

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
    PUSH_URL: 'https://push-web.threema.ch/push',

    // Debugging options
    DEBUG: false,
    MSG_DEBUGGING: false, // Log all incoming and outgoing messages
    MSGPACK_DEBUGGING: false, // Log URLs to the msgpack visualizer
    ICE_DEBUGGING: false,

} as threema.Config;
