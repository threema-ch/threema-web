/**
 * Threema Web configuration.
 */

window.UserConfig = {
    /**
     * SaltyRTC
     */
    // Set this to the hostname of the SaltyRTC server that you want to use. If
    // supplied, the substring `{prefix}` will be replaced by the first byte of
    // the initiator's public key, represented as a lowercase hexadecimal
    // value.
    SALTYRTC_HOST: 'saltyrtc-{prefix}.threema.ch',
    // The port of the SaltyRTC server to be used.
    SALTYRTC_PORT: 443,
    // The public permanent key of the SaltyRTC server. Set this value to
    // `null` if your server does not provide a public permanent key, or if you
    // don't want to verify it.
    SALTYRTC_SERVER_KEY: 'b1337fc8402f7db8ea639e05ed05d65463e24809792f91eca29e88101b4a2171',

    /**
     * ICE
     */
    // Configuration object for the WebRTC STUN and ICE servers. Each URL may
    // contain the substring `{prefix}`, which will be replaced by a random
    // byte represented as a lowercase hexadecimal value.
    ICE_SERVERS: [{
        urls: [
            'turn:ds-turn-{prefix}.threema.ch:443?transport=udp',
            'turn:ds-turn-{prefix}.threema.ch:443?transport=tcp',
            'turns:ds-turn-{prefix}.threema.ch:443',
        ],
        username: 'threema-angular',
        credential: 'Uv0LcCq3kyx6EiRwQW5jVigkhzbp70CjN2CJqzmRxG3UGIdJHSJV6tpo7Gj7YnGB',
    }],

    /**
     * Push
     */
    // The server URL used to deliver push notifications to the app.
    PUSH_URL: 'https://push-web.threema.ch/push',

    /**
     * Fonts
     *
     * Note: If you want to use the Lab Grotesque font in your self-hosted
     * instance (with SELF_HOSTED=true), you need to obtain a license for it
     * and update the font URL below. Otherwise, Threema Web will fall back to
     * Roboto.
     */
    // URL to the Lab Grotesque font.
    FONT_CSS_URL: null,

    /**
     * Logging and diagnostics.
     */
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
};
