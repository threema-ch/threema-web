/**
 * Threema Web configuration.
 *
 * The various options are explained in the `README.md` file.
 */
// tslint:disable:max-line-length
export default {
    // Version
    VERSION: '[[VERSION]]',

    // General
    SELF_HOSTED: false,
    VERSION_MOUNTAIN: 'Fluebrig',
    VERSION_MOUNTAIN_URL: 'https://en.wikipedia.org/wiki/Fluebrig',
    VERSION_MOUNTAIN_IMAGE_URL: 'img/bg.original.jpg',
    VERSION_MOUNTAIN_IMAGE_COPYRIGHT: '',  // Own work
    VERSION_MOUNTAIN_HEIGHT: 2098,
    PREV_PROTOCOL_LAST_VERSION: '1.8.2',
    GIT_BRANCH: 'master',

    // SaltyRTC
    SALTYRTC_HOST: 'saltyrtc-{prefix}.threema.ch',
    SALTYRTC_PORT: 443,
    SALTYRTC_SERVER_KEY: 'b1337fc8402f7db8ea639e05ed05d65463e24809792f91eca29e88101b4a2171',

    // ICE
    ICE_SERVERS: [{
        urls: [
            'turn:turn-{prefix}.threema.ch:443?transport=udp',
            'turn:turn-{prefix}.threema.ch:443?transport=tcp',
            'turns:turn-{prefix}.threema.ch:443',
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
    CONSOLE_LOG_LEVEL: 'debug',
    // Report log level and maximum amount of log records to keep in memory.
    // Note: There's no reason to change this unless you want to disable
    //       the report tool.
    REPORT_LOG_LEVEL: 'debug',
    REPORT_LOG_LIMIT: 1000,
    // Compose area log level
    COMPOSE_AREA_LOG_LEVEL: 'warn',
    // SaltyRTC log level
    SALTYRTC_LOG_LEVEL: 'warn',
    // Timer (created by the TimeoutService) log level.
    // Note: Log records filtered by this level will prevent them from being
    //       picked up by the console and the report logger.
    TIMER_LOG_LEVEL: 'info',
    // App remote protocol log level.
    // Note: Log records filtered by this level will prevent them from being
    //       picked up by the console and the report logger.
    ARP_LOG_LEVEL: 'debug',
    // Toggles expensive or sensitive logging operations. Toggles logging of
    // all chunks and messages exchanged by or associated with the app remote
    // protocol.
    // Note: Affects performance and contains sensitive information.
    ARP_LOG_TRACE: false,
    // Toggles URL logging to visualise MsgPack messages for all incoming and
    // outgoing protocol messages.
    // Note: Affects performance and contains sensitive information.
    MSGPACK_LOG_TRACE: false,
    // Transport log level
    TRANSPORT_LOG_LEVEL: 'warn',
    // Always show the real connection state using the dot in the logo
    VISUALIZE_STATE: true,

} as threema.Config;
