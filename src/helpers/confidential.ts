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

import * as SDPUtils from 'sdp';

/**
 * Recursively sanitises `value` in the following way:
 *
 * - `null` and `undefined` will be returned as is,
 * - an object implementing the `Confidential` interface will be sanitised,
 * - booleans and numbers will only reveal the type,
 * - strings will reveal the type and the length of the string,
 * - the binary types `Uint8Array` and `Blob` will only return meta
 *   information about the content, and
 * - array values will be sanitised recursively as described in this list,
 * - object values will be sanitised recursively as described in this list,
 *   and
 * - everything else will only reveal the value's type.
 */
export function censor(value: any): any {
    // Handle `null` and `undefined` early
    if (value === null || value === undefined) {
        return value;
    }

    // Apply filter to confidential data
    if (value instanceof BaseConfidential) {
        return value.censored();
    }

    // Filter string
    if (value.constructor === String) {
        return `[String: length=${value.length}]`;
    }

    // Filter array
    if (value instanceof Array) {
        return value.map((item) => censor(item));
    }

    // Filter binary data
    if (value instanceof ArrayBuffer) {
        return `[ArrayBuffer: length=${value.byteLength}]`;
    }
    if (value instanceof Uint8Array) {
        return `[Uint8Array: length=${value.byteLength}, offset=${value.byteOffset}]`;
    }
    if (value instanceof Blob) {
        return `[Blob: length=${value.size}, type=${value.type}]`;
    }

    // Plain object
    if (value.constructor === Object) {
        const object = {};
        for (const [k, v] of Object.entries(value)) {
            // Store sanitised
            object[k] = censor(v);
        }
        return object;
    }

    // Not listed
    return `[${value.constructor.name}]`;
}

/**
 * Abstract confidential class.
 *
 * Solely exists to be able to detect with the `instanceof` operator.
 */
export abstract class BaseConfidential<U, C> implements threema.Confidential<U, C> {
    public abstract uncensored: U;
    public abstract censored(): C;
}

/**
 * Wraps an array of confidential instances.
 *
 * When sanitising, all items will be sanitised.
 * When accessing uncensored, all items will be returned uncensored.
 */
export class ConfidentialArray<U, C, A extends threema.Confidential<U, C>>
    extends BaseConfidential<U[], C[]> {
    private readonly array: A[];

    constructor(array: A[]) {
        super();
        this.array = array;
    }

    public get uncensored(): U[] {
        return this.array.map((item) => item.uncensored);
    }

    public censored(): C[] {
        return this.array.map((item) => item.censored());
    }
}

/**
 * Wraps an object.
 *
 * When sanitising, all key's values will be sanitised recursively by usage of
 * the `censor` function.
 */
export class ConfidentialObjectValues extends BaseConfidential<object, object> {
    public readonly uncensored: object;

    constructor(object: object) {
        super();
        this.uncensored = object;
    }

    public censored(): object {
        return censor(this.uncensored);
    }
}

/**
 * Wraps a wire message.
 *
 * When sanitising, this returns all data unchanged except for the `data` and
 * `arg` keys whose value will be sanitised recursively by usage of the
 * `censor` function.
 */
export class ConfidentialWireMessage extends BaseConfidential<threema.WireMessage, threema.WireMessage> {
    public readonly uncensored: threema.WireMessage;

    constructor(message: threema.WireMessage) {
        super();
        this.uncensored = message;
    }

    public censored(): threema.WireMessage {
        const message = Object.assign({}, this.uncensored);

        // Sanitise args and data (if existing)
        if (message.args !== undefined) {
            message.args = censor(message.args);
        }
        if (message.data !== undefined) {
            message.data = censor(message.data);
        }

        return message;
    }
}

/**
 * Wraps an ICE candidate's SDP attribute.
 *
 * When sanitising, this returns all attributes unchanged apart from the
 * candidate's IP address which will be partially sanitised.
 */
export class ConfidentialIceCandidate extends BaseConfidential<string, string> {
    public readonly uncensored: string;

    constructor(candidateSdp: string) {
        super();
        this.uncensored = candidateSdp;
    }

    public censored(): string {
        try {
            // Parse into candidate object
            const candidate = SDPUtils.parseCandidate(this.uncensored);

            // Sanitise IP and port
            if (candidate.type !== 'relay') {
                candidate.address = candidate.ip = ConfidentialIceCandidate.censorIp(candidate.address);
            }
            if (candidate.relatedAddress !== undefined) {
                candidate.relatedAddress = ConfidentialIceCandidate.censorIp(candidate.relatedAddress);
            }

            // Return as SDP
            return SDPUtils.writeCandidate(candidate);
        } catch (error) {
            return this.uncensored;
        }
    }

    private static censorIp(ip: string): string {
        // Handle UUID (mDNS)
        if (ip.includes('-')) {
            return ip;
        }

        // Handle IPv4 address
        const ipv4 = ip.split('.');
        if (ipv4.length > 1) {
            return `${ipv4.slice(0, 2).join('.')}.*.*`;
        }

        // Handle IPv6 address (catch-all)
        const ipv6 = ip.split(':');
        const head = ipv6.shift();
        return `${head}:${ipv6.map((item) => item.length > 0 ? '*' : item).join(':')}`;
    }
}
