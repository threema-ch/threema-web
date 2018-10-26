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

import {sha256} from '../helpers/crypto';

export class PushService {
    private static ARG_TYPE = 'type';
    private static ARG_TOKEN = 'token';
    private static ARG_SESSION = 'session';
    private static ARG_VERSION = 'version';
    private static ARG_ENDPOINT = 'endpoint';
    private static ARG_BUNDLE_ID = 'bundleid';

    private logTag: string = '[PushService]';

    private $http: ng.IHttpService;
    private $log: ng.ILogService;
    private $httpParamSerializerJQLike;

    private url: string;
    private pushToken: string = null;
    private pushType = threema.PushTokenType.Gcm;
    private version: number = null;

    public static $inject = ['$http', '$log', '$httpParamSerializerJQLike', 'CONFIG', 'PROTOCOL_VERSION'];
    constructor($http: ng.IHttpService, $log: ng.ILogService, $httpParamSerializerJQLike,
                CONFIG: threema.Config, PROTOCOL_VERSION: number) {
        this.$http = $http;
        this.$log = $log;
        this.$httpParamSerializerJQLike = $httpParamSerializerJQLike;
        this.url = CONFIG.PUSH_URL;
        this.version = PROTOCOL_VERSION;
    }

    /**
     * Initiate the push service with a push token.
     */
    public init(pushToken: string, pushTokenType: threema.PushTokenType): void {
        this.$log.info(this.logTag, 'Initialized with', pushTokenType, 'token');
        this.pushToken = pushToken;
        this.pushType = pushTokenType;
    }

    /**
     * Reset the push service, remove stored push tokens.
     */
    public reset(): void {
        this.pushToken = null;
    }

    /**
     * Return true if service has been initialized with a push token.
     */
    public isAvailable(): boolean {
        return this.pushToken != null;
    }

    /**
     * Send a push notification for the specified session (public permanent key
     * of the initiator). The promise is always resolved to a boolean.
     */
    public async sendPush(session: Uint8Array): Promise<boolean> {
        if (!this.isAvailable()) {
            return false;
        }

        // Calculate session hash
        const sessionHash = await sha256(session.buffer);

        // Prepare request
        const data = {
            [PushService.ARG_TYPE]: this.pushType,
            [PushService.ARG_SESSION]: sessionHash,
            [PushService.ARG_VERSION]: this.version,
        };
        if (this.pushType === threema.PushTokenType.Apns) {
            // APNS token format: "<hex-deviceid>;<endpoint>;<bundle-id>"
            const parts = this.pushToken.split(';');
            if (parts.length < 3) {
                this.$log.warn(this.logTag, 'APNS push token contains', parts.length, 'parts, at least 3 are required');
                return false;
            }
            data[PushService.ARG_TOKEN] = parts[0];
            data[PushService.ARG_ENDPOINT] = parts[1];
            data[PushService.ARG_BUNDLE_ID] = parts[2];
        } else if (this.pushType === threema.PushTokenType.Gcm) {
            data[PushService.ARG_TOKEN] = this.pushToken;
        } else {
            this.$log.warn(this.logTag, 'Invalid push type');
            return false;
        }

        const request = {
            method: 'POST',
            url: this.url,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data: this.$httpParamSerializerJQLike(data),
        };

        // Send push
        return new Promise((resolve) => {
            this.$http(request).then(
                (successResponse) => {
                    if (successResponse.status === 204) {
                        this.$log.debug(this.logTag, 'Sent push');
                        resolve(true);
                    } else {
                        this.$log.warn(this.logTag, 'Sending push failed: HTTP ' + successResponse.status);
                        resolve(false);
                    }
                },
                (errorResponse) => {
                    this.$log.warn(this.logTag, 'Sending push failed:', errorResponse);
                    resolve(false);
                },
            );
        }) as Promise<boolean>;
    }
}
