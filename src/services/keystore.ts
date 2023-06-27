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
import {scrypt} from 'scrypt-js';

import * as nacl from 'tweetnacl';
import {hexToU8a, u8aToHex} from '../helpers';
import {InMemorySession} from '../helpers/in_memory_session';
import {LogService} from './log';

/**
 * This service stores trusted keys in the local browser storage.
 *
 * The data is encrypted with `nacl.secretbox` using a key derived from the
 * user defined password through scrypt:
 *
 *     plaintext = <ownSecKey> + <peerPubKey>
 *                 [+ <pushtoken-type-prefix> + ':' + <pushtoken>]
 *     encrypted = nacl.secretbox(plaintext, <nonce>, <key>)
 *
 * Storage format (JSON encoded to string):
 *
 *     {
 *         nonce: <nonce-as-hex>,
 *         salt: <random-salt-as-hex>,
 *         N: <scrypt-N-parameter-as-number>,
 *         r: <scrypt-r-parameter-as-number>,
 *         p: <scrypt-p-parameter-as-number>,
 *         encrypted: <encrypted-as-hex>,
 *     }
 *
 */
export class TrustedKeyStoreService {
    private STORAGE_KEY = 'trusted';
    private STORAGE_KEY_AUTO_FLAG = 'autoSession';

    // Minimum parameters as recommended by
    // https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt
    //
    // We're targeting ~500ms of delay for deriving the keys.
    private SCRYPT_PARAMETERS = {
        NBenchmark: 4096,
        NMin: 65536,
        NTargetMs: 500,
        r: 8,
        p: 1,
    }

    private readonly log: Logger;
    private storage: Storage = null;

    public blocked = false;

    private inMemorySession: InMemorySession = new InMemorySession();

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
     * DEPRECATED! Only exists in order to migrate previous storages.
     *
     * Convert a password string to a NaCl key. This is done by getting a
     * SHA512 hash and returning the first 32 bytes.
     */
    private deprecatedPwToKey(password: Uint8Array): Uint8Array {
        const hash = nacl.hash(password);
        return hash.slice(0, nacl.secretbox.keyLength);
    }

    /**
     * Store the trusted key (and optionally the push token) in local browser
     * storage. Encrypt it using NaCl with the provided password.
     */
    public async storeTrustedKey(
        ownSecretKey: Uint8Array,
        peerPublicKey: Uint8Array,
        pushToken: string | null,
        pushTokenType: threema.PushTokenType | null,
        password: string,
        isAutoSession: boolean,
    ): Promise<void> {
        // Generate a random salt of 32 bytes
        const salt = nacl.randomBytes(32);

        // Determine work factor (N) for the target
        const r = this.SCRYPT_PARAMETERS.r;
        const p = this.SCRYPT_PARAMETERS.p;
        let N = this.SCRYPT_PARAMETERS.NBenchmark;
        const benchmarkPassword = nacl.randomBytes(32);
        let start = performance.now();
        await scrypt(benchmarkPassword, salt, N, r, p, nacl.secretbox.keyLength);
        let end = performance.now();
        const extrapolatedN = Math.round((N / (end - start)) * this.SCRYPT_PARAMETERS.NTargetMs);

        // Round the work factor down to the nearest power of two.
        // tslint:disable:no-bitwise
        N = Math.max(this.SCRYPT_PARAMETERS.NMin, 1 << (31 - Math.clz32(extrapolatedN)));
        // tslint:enable:no-bitwise
        if (!Number.isFinite(N)) {
            throw new Error(`Unable to determine scrypt work factor`);
        }
        this.log.debug(`scrypt benchmark determined work factor N=${N} (from ${extrapolatedN}), took ${(end - start).toFixed(0)}ms`);

        // Derive key and generate a random nonce
        const encodedPassword = (new TextEncoder()).encode(password);
        start = performance.now();
        const key = await scrypt(encodedPassword, salt, N, r, p, nacl.secretbox.keyLength);
        end = performance.now();
        this.log.debug(`Used scrypt parameters (N=${N}, r=${r}, p=${p}) for key derivation, took ${(end - start).toFixed(0)}ms`);
        const nonce: Uint8Array = nacl.randomBytes(nacl.secretbox.nonceLength);

        // Encode push token (if any)
        let encodedToken = new Uint8Array(0);
        if (pushToken !== null && pushTokenType !== null) {
            encodedToken = this.encodePushToken(pushToken, pushTokenType);
        }

        const data = new Uint8Array(2 * 32 + encodedToken.byteLength);
        data.set(ownSecretKey, 0);
        data.set(peerPublicKey, 32);
        data.set(encodedToken, 64);
        const encrypted: Uint8Array = nacl.secretbox(data, nonce, key);
        this.log.debug(isAutoSession ? 'Storing trusted key (auto session)' : 'Storing trusted key');
        this.storage.setItem(this.STORAGE_KEY, JSON.stringify({
            nonce: u8aToHex(nonce),
            salt: u8aToHex(salt),
            N: N,
            r: r,
            p: p,
            encrypted: u8aToHex(encrypted),
        }))
        if (isAutoSession) {
            this.storage.setItem(this.STORAGE_KEY_AUTO_FLAG, 'auto');
        }
    }

    /**
     * Return whether or not a trusted key is stored in local storage.
     */
    public hasTrustedKey(): boolean {
        const item: string = this.storage.getItem(this.STORAGE_KEY);
        return item !== null && item.length > 96 && item.indexOf(':') !== -1;
    }

    /**
     * Return whether or not a stored trusted key belongs to an auto session.
     *
     * If no trusted key is stored at all, this returns false as well.
     */
    public isAutoSession(): boolean {
        return this.storage.getItem(this.STORAGE_KEY_AUTO_FLAG) !== null;
    }

    private encodePushToken(token: string, type: threema.PushTokenType): Uint8Array {
        // Add prefix to push token string
        let prefix: threema.PushTokenPrefix;
        switch (type) {
            case threema.PushTokenType.Fcm:
                prefix = threema.PushTokenPrefix.Fcm;
                break;
            case threema.PushTokenType.Apns:
                prefix = threema.PushTokenPrefix.Apns;
                break;
            case threema.PushTokenType.Hms:
                prefix = threema.PushTokenPrefix.Hms;
                break;
            case threema.PushTokenType.ThreemaGateway:
                prefix = threema.PushTokenPrefix.ThreemaGateway;
                break;
            default:
                throw new Error(`Invalid push token type: ${type}`)
        }
        return (new TextEncoder()).encode(`${prefix}:${token}`);
    }

    private decodePushToken(encodedBytes: Uint8Array): {token: string | null, type: threema.PushTokenType | null} {
        const encodedString: string | null = encodedBytes.byteLength > 0
            ? (new TextDecoder('utf-8', {fatal: true})).decode(encodedBytes)
            : null;
        let type: threema.PushTokenType = null;
        let token: string = null;
        if (encodedString !== null && encodedString[1] === ':') {
            switch (encodedString[0]) {
                case threema.PushTokenPrefix.Fcm:
                    type = threema.PushTokenType.Fcm;
                    break;
                case threema.PushTokenPrefix.Apns:
                    type = threema.PushTokenType.Apns;
                    break;
                case threema.PushTokenPrefix.Hms:
                    type = threema.PushTokenType.Hms;
                    break;
                case threema.PushTokenPrefix.ThreemaGateway:
                    type = threema.PushTokenType.ThreemaGateway;
                    break;
                default:
                    this.log.error('Invalid push token type:', encodedString[0]);
                    return {token: null, type: null};
            }
            token = encodedString.slice(2);
        } else if (encodedString !== null) {
            // Compat
            token = encodedString;
            type = threema.PushTokenType.Fcm;
        }
        return {token: token, type: type};
    }

    private async migrateDeprecatedStorageFormat(parts: [string, string], password: string): Promise<void> {
        const nonce = hexToU8a(parts[0]);
        const encrypted = hexToU8a(parts[1]);
        const decrypted = nacl.secretbox.open(
            encrypted,
            nonce,
            this.deprecatedPwToKey((new TextEncoder()).encode(password)),
        );
        if (!decrypted) {
            throw new Error('Unable to decrypt deprecated storage');
        }
        const token = this.decodePushToken((decrypted as Uint8Array).slice(96));
        const ownSecretKey = (decrypted as Uint8Array).slice(32, 64);
        const peerPublicKey = (decrypted as Uint8Array).slice(64, 96);
        this.log.warn('Migrating deprecated key storage to scrypt-based key storage');
        await this.storeTrustedKey(ownSecretKey, peerPublicKey, token.token, token.type, password, this.isAutoSession());
    }

    /**
     * Retrieve the trusted key from local browser storage. Decrypt it using
     * the provided password.
     */
    public async retrieveTrustedKey(password: string): Promise<threema.TrustedKeyStoreData | null> {
        let storedValue: string = this.storage.getItem(this.STORAGE_KEY);
        if (storedValue === null) {
            return null;
        }

        // Check if the deprecated format is being used. If so, migrate it immediately.
        const parts: string[] = storedValue.split(':');
        if (parts.length === 2) {
            try {
                await this.migrateDeprecatedStorageFormat(parts as [string, string], password);
            } catch (error) {
                this.log.error(error);
                return null;
            }
            storedValue = this.storage.getItem(this.STORAGE_KEY);
            if (storedValue === null) {
                return null;
            }
        }

        // Parse unencrypted storage data
        let raw: any;
        try {
            raw = JSON.parse(storedValue);
        } catch (error) {
            this.log.error(`Invalid storage data`, error);
            return null;
        }
        if (typeof raw !== 'object') {
            this.log.error('Invalid storage data: Not an object', raw);
        }
        if (
            typeof raw.nonce !== 'string' ||
            typeof raw.salt !== 'string' ||
            typeof raw.N !== 'number' ||
            typeof raw.r !== 'number' ||
            typeof raw.p !== 'number' ||
            typeof raw.encrypted !== 'string'
        ) {
            this.log.error(`Invalid storage data: One or more key is missing or invalid in ${Object.keys(raw)}`);
        }
        let d: {nonce: Uint8Array, salt: Uint8Array, N: number, r: number, p: number, encrypted: Uint8Array};
        try {
            d = {
                nonce: hexToU8a(raw.nonce),
                salt: hexToU8a(raw.salt),
                N: raw.N,
                r: raw.r,
                p: raw.p,
                encrypted: hexToU8a(raw.encrypted),
            };
        } catch (error) {
            this.log.error(`Invalid storage data`, error);
            return null;
        }
        if (
            d.nonce.byteLength !== nacl.secretbox.nonceLength ||
            d.salt.byteLength !== 32 ||
            d.N < this.SCRYPT_PARAMETERS.NMin ||
            d.r < this.SCRYPT_PARAMETERS.r ||
            d.p < this.SCRYPT_PARAMETERS.p ||
            d.encrypted.byteLength === 0
        ) {
            this.log.error(`Invalid storage data: One or more value is invalid in ${Object.keys(raw)}`);
        }

        // Derive key
        const encodedPassword = (new TextEncoder()).encode(password);
        const start = performance.now();
        const key = await scrypt(encodedPassword, d.salt, d.N, d.r, d.p, nacl.secretbox.keyLength);
        const end = performance.now();
        this.log.debug(`Used scrypt parameters (N=${d.N}, r=${d.r}, p=${d.p}) for key derivation, took ${(end - start).toFixed(0)}ms`);

        // Decrypt encrypted data
        const decrypted = nacl.secretbox.open(d.encrypted, d.nonce, key);
        if (!decrypted) {
            return null;
        }
        const ownSecretKey = (decrypted as Uint8Array).slice(0, 32);
        const peerPublicKey = (decrypted as Uint8Array).slice(32, 64);
        const token = this.decodePushToken((decrypted as Uint8Array).slice(64));
        return {
            ownSecretKey: ownSecretKey,
            peerPublicKey: peerPublicKey,
            pushToken: token.token,
            pushTokenType: token.type,
        };
    }

    /**
     * Delete any stored trusted keys.
     */
    public clearTrustedKey(): void {
        // Clear trusted key from local storage
        this.log.debug('Clearing trusted key');
        this.storage.removeItem(this.STORAGE_KEY);
        this.storage.removeItem(this.STORAGE_KEY_AUTO_FLAG);

        // If auto session password is set, clear password as well
        this.inMemorySession.clearPassword();
    }
}
