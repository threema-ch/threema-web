/**
 * This file is part of Threema Web.
 *
 * Threema Web is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
 * General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Threema Web. If not, see <http://www.gnu.org/licenses/>.
 */

import {Logger} from 'ts-log';

import {PushError, TimeoutError} from '../exceptions';
import {randomString, sleep} from '../helpers';
import {sha256} from '../helpers/crypto';
import {LogService} from './log';

/**
 * A push session will send pushes continuously until an undefined goal has
 * been achieved which needs to call the `.done` method to stop pushes.
 *
 * The push session will stop and reject the returned promise in case the
 * push relay determined a client error (e.g. an invalid push token). In any
 * other case, it will continue sending pushes. Thus, it is crucial to call
 * `.done` eventually!
 *
 * With default settings, the push session will send a push in the following
 * intervals: 0s, 2s, 4s, 8s, 16s, 30s (maximum), 30s, ...
 *
 * The first push will use a TTL (time to live) of 0, the second push a TTL of
 * 15s, and all subsequent pushes will use a TTL of 90s.
 *
 * The default settings intend to wake up the app immediately by the first push
 * which uses a TTL of 0, indicating the push server to deliver *now or never*.
 * The mid TTL tries to work around issues with FCM clients interpreting the
 * TTL as *don't need to dispatch until expired*. And the TTL of 90s acts as a
 * last resort mechanism to wake up the app eventually.
 *
 * Furthermore, the collapse key ensures that only one push per session will be
 * stored on the push server.
 */
export class PushSession {
    private readonly service: PushService;
    private readonly session: Uint8Array;
    private readonly config: threema.PushSessionConfig;
    private readonly doneFuture: Future<any> = new Future();
    private readonly affiliation: string = randomString(6);
    private log: Logger;
    private running: boolean = false;
    private retryTimeoutMs: number;
    private tries: number = 0;

    /**
     * Return the default configuration.
     */
    public static get defaultConfig(): threema.PushSessionConfig {
        return {
            retryTimeoutInitMs: 2000,
            retryTimeoutMaxMs: 30000,
            triesMax: 3,
            timeToLiveRange: [0, 15, 90],
        };
    }

    /**
     * Return the expected maximum period until the session will be forcibly
     * rejected.
     *
     * Note: The actual maximum period will usually be larger since the HTTP
     *       request itself can take an arbitrary amount of time.
     */
    public static expectedPeriodMaxMs(config?: threema.PushSessionConfig): number {
        if (config === undefined) {
            config = PushSession.defaultConfig;
        }
        if (config.triesMax === Number.POSITIVE_INFINITY) {
            return Number.POSITIVE_INFINITY;
        }
        let retryTimeoutMs = config.retryTimeoutInitMs;
        let sumMs = 0;
        for (let i = 0; i < config.triesMax; ++i) {
            sumMs += retryTimeoutMs;
            retryTimeoutMs = Math.min(retryTimeoutMs * 2, config.retryTimeoutMaxMs);
        }
        return sumMs;
    }

    /**
     * Create a push session.
     *
     * @param service The associated `PushService` instance.
     * @param session Session identifier (public permanent key of the
     *   initiator)
     * @param config Push session configuration.
     */
    public constructor(service: PushService, session: Uint8Array, config?: threema.PushSessionConfig) {
        this.log = service.logService.getLogger(`Push.${this.affiliation}`, 'color: #fff; background-color: #9900cc');
        this.service = service;
        this.session = session;
        this.config = config !== undefined ? config : PushSession.defaultConfig;
        this.retryTimeoutMs = this.config.retryTimeoutInitMs;

        // Sanity checks
        if (this.config.timeToLiveRange.length === 0) {
            throw new Error('timeToLiveRange must not be an empty array');
        }
        if (this.config.triesMax < 1) {
            throw new Error('triesMax must be >= 1');
        }
    }

    /**
     * The promise resolves once the session has been marked as *done*.
     *
     * It will reject in case the server indicated a bad request or the maximum
     * amount of retransmissions have been reached.
     *
     * @throws TimeoutError in case the maximum amount of retries has been
     *   reached.
     * @throws PushError if the push was rejected by the push relay server.
     * @throws Error in case of an unrecoverable error which prevents further
     *   pushes.
     */
    public start(): Promise<void> {
        // Start sending
        if (!this.running) {
            this.run().catch((error) => {
                this.log.error('Push runner failed:', error);
                this.doneFuture.reject(error);
            });
            this.running = true;
        }
        return this.doneFuture;
    }

    /**
     * Mark as done and stop sending push messages.
     *
     * This will resolve all pending promises.
     */
    public done(): void {
        this.log.info('Push done');
        this.doneFuture.resolve();
    }

    private async run(): Promise<void> {
        // Calculate session hash
        const sessionHash = await sha256(this.session.buffer);

        // Prepare data
        const data = new URLSearchParams();
        data.set(PushService.ARG_TYPE, this.service.pushType);
        data.set(PushService.ARG_SESSION, sessionHash);
        data.set(PushService.ARG_VERSION, `${this.service.version}`);
        data.set(PushService.ARG_AFFILIATION, this.affiliation);
        if (this.service.pushType === threema.PushTokenType.Apns) {
            // APNS token format: "<hex-deviceid>;<endpoint>;<bundle-id>"
            const parts = this.service.pushToken.split(';');
            if (parts.length < 3) {
                throw new Error(`APNS push token contains ${parts.length} parts, but at least 3 are required`);
            }
            data.set(PushService.ARG_TOKEN, parts[0]);
            data.set(PushService.ARG_ENDPOINT, parts[1]);
            data.set(PushService.ARG_BUNDLE_ID, parts[2]);
        } else if (this.service.pushType === threema.PushTokenType.Fcm) {
            data.set(PushService.ARG_TOKEN, this.service.pushToken);
        } else if (this.service.pushType === threema.PushTokenType.Hms) {
            // HMS token format: "<app-id>|<push-token>"
            const parts = this.service.pushToken.split('|');
            data.set(PushService.ARG_TOKEN, parts[1]);
            data.set(PushService.ARG_APP_ID, parts[0]);
        } else {
            throw new Error(`Invalid push type: ${this.service.pushType}`);
        }

        // Push until done or unrecoverable error
        while (!this.doneFuture.done) {
            // Determine TTL
            let timeToLive = this.config.timeToLiveRange[this.tries];
            if (timeToLive === undefined) {
                timeToLive = this.config.timeToLiveRange[this.config.timeToLiveRange.length - 1];
            }

            // Set/Remove collapse key
            if (timeToLive === 0) {
                data.delete(PushService.ARG_COLLAPSE_KEY);
            } else {
                data.set(PushService.ARG_COLLAPSE_KEY, sessionHash.slice(0, 6));
            }

            // Modify data
            data.set(PushService.ARG_TIME_TO_LIVE, `${timeToLive}`);
            ++this.tries;

            // Send push
            this.log.debug(`Sending push ${this.tries}/${this.config.triesMax} (ttl=${timeToLive})`);
            if (this.service.config.ARP_LOG_TRACE) {
                this.log.debug('Push data:', `${data}`);
            }
            try {
                const response = await fetch(this.service.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: data,
                });

                // Check if successful
                if (response.ok) {
                    // Success: Retry
                    this.log.debug('Push sent successfully');
                } else if (response.status >= 400 && response.status < 500) {
                    // Client error: Don't retry
                    const error = `Push rejected (client error), status: ${response.status}`;
                    this.log.warn(error);
                    this.doneFuture.reject(new PushError(error, response.status));
                } else {
                    // Server error: Retry
                    this.log.warn(`Push rejected (server error), status: ${response.status}`);
                }
            } catch (error) {
                this.log.warn('Sending push failed:', error);
            }

            // Retry after timeout
            await sleep(this.retryTimeoutMs);

            // Apply RTO backoff
            this.retryTimeoutMs = Math.min(this.retryTimeoutMs * 2, this.config.retryTimeoutMaxMs);

            // Maximum tries reached?
            if (!this.doneFuture.done && this.tries === this.config.triesMax) {
                const error = `Push session timeout after ${this.tries} tries`;
                this.log.warn(error);
                this.doneFuture.reject(new TimeoutError(error));
            }
        }
    }
}

export class PushService {
    public static readonly $inject = ['CONFIG', 'PROTOCOL_VERSION', 'LogService'];

    public static readonly ARG_TYPE = 'type';
    public static readonly ARG_TOKEN = 'token';
    public static readonly ARG_SESSION = 'session';
    public static readonly ARG_VERSION = 'version';
    public static readonly ARG_AFFILIATION = 'affiliation';
    public static readonly ARG_APP_ID = 'appid';
    public static readonly ARG_ENDPOINT = 'endpoint';
    public static readonly ARG_BUNDLE_ID = 'bundleid';
    public static readonly ARG_TIME_TO_LIVE = 'ttl';
    public static readonly ARG_COLLAPSE_KEY = 'collapse_key';

    public readonly config: threema.Config;
    public readonly url: string;
    public readonly version: number = null;
    public readonly logService: LogService;
    public readonly log: Logger;
    private _pushToken: string = null;
    private _pushType = threema.PushTokenType.Fcm;

    constructor(CONFIG: threema.Config, PROTOCOL_VERSION: number, logService: LogService) {
        this.config = CONFIG;
        this.url = CONFIG.PUSH_URL;
        this.version = PROTOCOL_VERSION;
        this.logService = logService;
        this.log = logService.getLogger(`Push-S`, 'color: #fff; background-color: #9900ff');
    }

    public get pushToken(): string {
        return this._pushToken;
    }

    public get pushType(): string {
        return this._pushType;
    }

    /**
     * Initiate the push service with a push token.
     */
    public init(pushToken: string, pushTokenType: threema.PushTokenType): void {
        this.log.info('Initialized with', pushTokenType, 'token');
        this._pushToken = pushToken;
        this._pushType = pushTokenType;
    }

    /**
     * Reset the push service, remove stored push tokens.
     */
    public reset(): void {
        this._pushToken = null;
    }

    /**
     * Return whether the service has been initialized with a push token.
     */
    public isAvailable(): boolean {
        return this._pushToken != null;
    }

    /**
     * Create a push session for a specific session (public permanent key of
     * the initiator) which will repeatedly send push messages until the
     * session is marked as established.
     */
    public createSession(session: Uint8Array, config?: threema.PushSessionConfig): PushSession {
        if (!this.isAvailable()) {
            throw new Error('Push service unavailable');
        }

        // Create push instance
        return new PushSession(this, session, config);
    }
}
