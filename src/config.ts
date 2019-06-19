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

    // Padding length (in characters) of the log tag
    // Note: The padding will be stripped by the report log.
    LOG_TAG_PADDING: 20,
    // Console log level
    // Note: It is advisable to set this to `info` on production.
    CONSOLE_LOG_LEVEL: 'info',
    // Report log level and maximum amount of log records to keep in memory.
    // Note: There's no reason to change this unless you want to disable
    //       the report tool.
    REPORT_LOG_LEVEL: 'debug',
    REPORT_LOG_LIMIT: 1000,
    // Compose area log level
    COMPOSE_AREA_LOG_LEVEL: 'warn',
    // SaltyRTC log level
    SALTYRTC_LOG_LEVEL: 'warn',
    // Toggles logging verbose timer-related information.
    DEBUG_TIMER: false,
    // Toggles logging all chunks and messages exchanged by or associated with
    // the app remote protocol. May also enable additional debug facilities of
    // the app remote protocol.
    // Note: Affects performance and contains sensitive information.
    DEBUG_ARP: false,
    // Toggles URL logging to visualise MsgPack messages for all incoming and
    // outgoing protocol messages.
    // Note: Affects performance and contains sensitive information.
    DEBUG_MSGPACK: false,

} as threema.Config;
