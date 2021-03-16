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

import * as nacl from 'tweetnacl';
import {hexToU8a, u8aToHex} from '../helpers';
import {stringToUtf8a, utf8aToString} from '../helpers';
import {LogService} from './log';

/**
 * This service stores trusted keys in the local browser storage.
 *
 * Data is encrypted as follows:
 *
 *     plaintext = <ownPubKey> + <ownSecKey> + <peerPubKey>
 *                 [+ <pushtoken-type-prefix> + ':' + <pushtoken>]
 *     encrypted = nacl.secretbox(plaintext, <nonce>, <key>)
 *
 * The data is encrypted using the first 32 bytes of the SHA512 hash of the
 * user defined password. The passwort should not be stored.
 *
 * The nonce is created randomly and stored alongside the encrypted password.
 *
 * Storage format:
 *
 *     "<nonceHexString>:<encryptedHexString>"
 *
 */
export class TrustedKeyStoreService {
    private STORAGE_KEY = 'trusted';

    private readonly log: Logger;
    private storage: Storage = null;

    public blocked = false;

    public static $inject = ['$window', 'LogService'];
    constructor($window: ng.IWindowService, logService: LogService) {
        this.log = logService.getLogger('TrustedKeyStore-S', 'color: #fff; background-color: #666699');
        try {
            if ($window.localStorage === null) {
                this.blocked = true;
            }
            this.storage = $window.localStorage;
        } catch (e) {
            this.log.warn('LocalStorage blocked:', e);
            this.blocked = true;
        }
    }

    /**
     * Convert a string to an Uint8Array.
     *
     * This function is quite primitive, Unicode is not supported.
     */
    private stringToBytes(str: string): Uint8Array {
        const arr = [];
        for (let i = 0; i < str.length; i++) {
            arr.push(str.charCodeAt(i));
        }
        return new Uint8Array(arr);
    }

    /**
     * Convert a password string to a NaCl key. This is done by getting a
     * SHA512 hash and returning the first 32 bytes.
     */
    private pwToKey(password: string): Uint8Array {
        const bytes = this.stringToBytes(password);
        const hash = nacl.hash(bytes);
        return hash.slice(0, nacl.secretbox.keyLength);
    }

    /**
     * Store the trusted key (and optionally the push token) in local browser
     * storage. Encrypt it using NaCl with the provided password.
     */
    public storeTrustedKey(ownPublicKey: Uint8Array, ownSecretKey: Uint8Array,
                           peerPublicKey: Uint8Array,
                           pushToken: string | null, pushTokenType: threema.PushTokenType | null,
                           password: string): void {
        const nonce: Uint8Array = nacl.randomBytes(nacl.secretbox.nonceLength);

        // Add prefix to push token string
        let pushTokenString = null;
        if (pushToken !== null && pushTokenType !== null) {
            switch (pushTokenType) {
                case threema.PushTokenType.Fcm:
                    pushTokenString = threema.PushTokenPrefix.Fcm + ':' + pushToken;
                    break;
                case threema.PushTokenType.Apns:
                    pushTokenString = threema.PushTokenPrefix.Apns + ':' + pushToken;
                    break;
                case threema.PushTokenType.Hms:
                    pushTokenString = threema.PushTokenPrefix.Hms + ':' + pushToken;
                    break;
            }
        }
        const token: Uint8Array = (pushTokenString == null)
                                ? new Uint8Array(0)
                                : stringToUtf8a(pushTokenString);

        const data = new Uint8Array(3 * 32 + token.byteLength);
        // TODO: Stop storing public key (redundant)
        data.set(ownPublicKey, 0);
        data.set(ownSecretKey, 32);
        data.set(peerPublicKey, 64);
        data.set(token, 96);
        const encrypted: Uint8Array = nacl.secretbox(data, nonce, this.pwToKey(password));
        this.log.debug('Storing trusted key');
        this.storage.setItem(this.STORAGE_KEY, u8aToHex(nonce) + ':' + u8aToHex(encrypted));
    }

    /**
     * Return whether or not a trusted key is stored in local storage.
     */
    public hasTrustedKey(): boolean {
        const item: string = this.storage.getItem(this.STORAGE_KEY);
        return item !== null && item.length > 96 && item.indexOf(':') !== -1;
    }

    /**
     * Retrieve the trusted key from local browser storage. Decrypt it using
     * the provided password.
     */
    public retrieveTrustedKey(password: string): threema.TrustedKeyStoreData | null {
        const storedValue: string = this.storage.getItem(this.STORAGE_KEY);
        if (storedValue === null) {
            return null;
        }

        const parts: string[] = storedValue.split(':');
        if (parts.length !== 2) {
            return null;
        }

        const nonce = hexToU8a(parts[0]);
        const encrypted = hexToU8a(parts[1]);
        const decrypted = nacl.secretbox.open(encrypted, nonce, this.pwToKey(password));
        if (!decrypted) {
            return null;
        }

        // Parse push token
        const tokenBytes = (decrypted as Uint8Array).slice(96);
        const tokenString: string | null = tokenBytes.byteLength > 0 ? utf8aToString(tokenBytes) : null;
        let tokenType: threema.PushTokenType = null;
        let token: string = null;
        if (tokenString !== null && tokenString[1] === ':') {
            switch (tokenString[0]) {
                case threema.PushTokenPrefix.Fcm:
                    tokenType = threema.PushTokenType.Fcm;
                    break;
                case threema.PushTokenPrefix.Apns:
                    tokenType = threema.PushTokenType.Apns;
                    break;
                case threema.PushTokenPrefix.Hms:
                    tokenType = threema.PushTokenType.Hms;
                    break;
                default:
                    this.log.error('Invalid push token type:', tokenString[0]);
                    return null;
            }
            token = tokenString.slice(2);
        } else if (tokenString !== null) {
            // Compat
            token = tokenString;
            tokenType = threema.PushTokenType.Fcm;
        }

        return {
            ownPublicKey: (decrypted as Uint8Array).slice(0, 32),
            ownSecretKey: (decrypted as Uint8Array).slice(32, 64),
            peerPublicKey: (decrypted as Uint8Array).slice(64, 96),
            pushToken: token,
            pushTokenType: tokenType,
        };
    }

    /**
     * Delete any stored trusted keys.
     */
    public clearTrustedKey(): void {
        this.log.debug('Clearing trusted key');
        this.storage.removeItem(this.STORAGE_KEY);
    }
}
