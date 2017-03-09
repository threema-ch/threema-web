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

export class PushService {
    private static ARG_TOKEN = 'token';
    private static ARG_SESSION = 'session';
    private static ARG_VERSION = 'version';

    private $http: ng.IHttpService;
    private $httpParamSerializerJQLike;

    private url: string;
    private pushToken: string = null;
    private version: number = null;

    public static $inject = ['$http', '$httpParamSerializerJQLike', 'CONFIG', 'PROTOCOL_VERSION'];
    constructor($http: ng.IHttpService, $httpParamSerializerJQLike,
                CONFIG: threema.Config, PROTOCOL_VERSION: number) {
        this.$http = $http;
        this.$httpParamSerializerJQLike = $httpParamSerializerJQLike;
        this.url = CONFIG.PUSH_URL;
        this.version = PROTOCOL_VERSION;
    }

    /**
     * Initiate the push service with a push token.
     */
    public init(pushToken: string): void {
        this.pushToken = pushToken;
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
    public sendPush(session: Uint8Array): Promise<boolean> {
        if (!this.isAvailable()) {
            return Promise.resolve(false);
        }

        // Prepare request
        let request = {
            method: 'POST',
            url: this.url,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data: this.$httpParamSerializerJQLike({
                [PushService.ARG_SESSION]: sha256(session),
                [PushService.ARG_TOKEN]: this.pushToken,
                [PushService.ARG_VERSION]: this.version,
            }),
        };

        // Send push
        return new Promise((resolve) => {
            this.$http(request).then(
                (successResponse) => resolve(successResponse.status === 204),
                (errorResponse) => resolve(false),
            );
        });
    }
}
