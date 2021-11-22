/**
 * Threema Web configuration.
 *
 * The various options are explained in the `README.md` file.
 */

// tslint:disable:max-line-length
export default {
    // Version
    VERSION: '[[VERSION]]',

    // Set this to `true` if this instance of Threema Web isn't being hosted on
    // `web.threema.ch`.
    SELF_HOSTED: false,

    // General
    VERSION_MOUNTAIN: 'Säntis',
    VERSION_MOUNTAIN_URL: 'https://en.wikipedia.org/wiki/Säntis',
    VERSION_MOUNTAIN_IMAGE_URL: 'https://en.wikipedia.org/wiki/S%C3%A4ntis#/media/File:S%C3%A4ntis_mountain_by_sunset..JPG',
    VERSION_MOUNTAIN_IMAGE_COPYRIGHT: 'CC BY-SA 3.0 B0rder',
    VERSION_MOUNTAIN_HEIGHT: 2502,
    GIT_BRANCH: 'master',

    // When the Threema Web protocol version changes, this can be set to the
    // last version of Threema Web that supported the previous protocol
    // version. If set to something different than `null`, a message will be
    // shown to the user if reconnecting fails.
    PREV_PROTOCOL_LAST_VERSION: '1.8.2',

    // Store session password in-memory (if an appropriate API is available).
    // Auto-generate a session password if none was entered.
    IN_MEMORY_SESSION_PASSWORD: false,
} as threema.Config;
