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
// tslint:disable:no-reference
/// <reference path="threema.d.ts" />

import {Logger} from 'ts-log';

/**
 * Convert an Uint8Array to a hex string.
 *
 * Example:
 *
 *   >>> u8aToHex(new Uint8Array([1, 255]))
 *   "01ff"
 */
export function u8aToHex(array: Uint8Array): string {
    const results: string[] = [];
    array.forEach((arrayByte) => {
        results.push(arrayByte.toString(16).replace(/^([\da-f])$/, '0$1'));
    });
    return results.join('');
}

/**
 * Convert a hexadecimal string to a Uint8Array.
 *
 * Example:
 *
 *   >>> hexToU8a("01ff")
 *   [1, 255]
 */
export function hexToU8a(hexstring: string): Uint8Array {
    let array;
    let i;
    let j = 0;
    let k;
    let ref;

    // If number of characters is odd, add padding
    if (hexstring.length % 2 === 1) {
        hexstring = '0' + hexstring;
    }

    array = new Uint8Array(hexstring.length / 2);
    for (i = k = 0, ref = hexstring.length; k <= ref; i = k += 2) {
        array[j++] = parseInt(hexstring.substr(i, 2), 16);
    }
    return array;
}

/**
 * Convert an Uint8Array to a base 64 string.
 */
export function u8aToBase64(array: Uint8Array): string {
    return btoa(Array.from(array, (byte: number) => String.fromCharCode(byte)).join(''));
}

/**
 * Convert a base 64 string to an Uint8Array.
 */
export function base64ToU8a(base64String: string): Uint8Array {
    return Uint8Array.from(atob(base64String), (char: string) => char.charCodeAt(0));
}

/**
 * Generate a (non-cryptographically-secure!) random string.
 *
 * Based on http://stackoverflow.com/a/1349426/284318.
 */
export function randomString(
    length = 32,
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
): string {
    let str = '';
    for (let i = 0; i < length; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return str;
}

/* tslint:disable */
/**
 * Convert a JS string to a UTF-8 "byte" array.
 *
 * Copyright 2008 The Closure Library Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * https://github.com/google/closure-library/commit/e877b1eac410c0d842bcda118689759512e0e26f
 *
 * @param {string} str 16-bit unicode string.
 * @return {!Array<number>} UTF-8 byte array.
 */
export function stringToUtf8a(str: string): Uint8Array {
    var out = [], p = 0;
    for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (c < 128) {
            out[p++] = c;
        } else if (c < 2048) {
            out[p++] = (c >> 6) | 192;
            out[p++] = (c & 63) | 128;
        } else if (
            ((c & 0xFC00) == 0xD800) && (i + 1) < str.length &&
            ((str.charCodeAt(i + 1) & 0xFC00) == 0xDC00)) {
                // Surrogate Pair
                c = 0x10000 + ((c & 0x03FF) << 10) + (str.charCodeAt(++i) & 0x03FF);
                out[p++] = (c >> 18) | 240;
                out[p++] = ((c >> 12) & 63) | 128;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            } else {
                out[p++] = (c >> 12) | 224;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
    }
    return Uint8Array.from(out);
}

/**
 * Convert a UTF-8 byte array to JavaScript's 16-bit Unicode.
 *
 * Copyright 2008 The Closure Library Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * https://github.com/google/closure-library/commit/e877b1eac410c0d842bcda118689759512e0e26f
 *
 * @param {Uint8Array|Array<number>} bytes UTF-8 byte array.
 * @return {string} 16-bit Unicode string.
 */
export function utf8aToString(bytes: Uint8Array): string {
    var out = [], pos = 0, c = 0;
    while (pos < bytes.length) {
        var c1 = bytes[pos++];
        if (c1 < 128) {
            out[c++] = String.fromCharCode(c1);
        } else if (c1 > 191 && c1 < 224) {
            var c2 = bytes[pos++];
            out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
        } else if (c1 > 239 && c1 < 365) {
            // Surrogate Pair
            var c2 = bytes[pos++];
            var c3 = bytes[pos++];
            var c4 = bytes[pos++];
            var u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) - 0x10000;
            out[c++] = String.fromCharCode(0xD800 + (u >> 10));
            out[c++] = String.fromCharCode(0xDC00 + (u & 1023));
        } else {
            var c2 = bytes[pos++];
            var c3 = bytes[pos++];
            out[c++] = String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
        }
    }
    return out.join('');
}
/* tslint:enable */

/**
 * Filter an array or object.
 */
export function filter(obj: object | any[], callback: (arg: any) => boolean) {
    if (obj instanceof Array) {
        // Filter arrays using Array.filter
        return (obj as any[]).filter(callback);
    } else {
        // Filter objects by iterating over them
        // and selectively copying values
        const out = {};
        for (const key in Object.keys(obj)) { // tslint:disable-line:forin
            const value = obj[key];
            if (callback(value)) {
                out[key] = value;
            }
        }
        return out;
    }
}

/**
 * Check whether a variable is a string.
 */
export function isString(val: any): boolean {
    return typeof val === 'string' || val instanceof String;
}

/**
 * Detect whether browser supports passive event listeners.
 *
 * Taken from https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
 */
export function supportsPassive(): boolean {
    // Test via a getter in the options object to see if the passive property is accessed
    let support = false;
    try {
        const opts = Object.defineProperty({}, 'passive', {
            get: () => support = true,
        });
        window.addEventListener('test', null, opts);
    } catch (e) { /* do nothing */ }
    return support;
}

/**
 * Excape a RegEx, so that none of the string characters are considered special characters.
 *
 * Taken from https://stackoverflow.com/a/17606289/284318
 */
export function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Generate a link to the msgpack visualizer from an Uint8Array containing
 * msgpack encoded data.
 */
export function msgpackVisualizer(array: Uint8Array): string {
    return 'https://msgpack.dbrgn.ch#base64=' + encodeURIComponent(u8aToBase64(array));
}

/**
 * Check the featureMask of a contactReceiver
 */
export function hasFeature(
    contactReceiver: threema.ContactReceiver,
    feature: threema.ContactReceiverFeature,
    log: Logger,
): boolean {
    if (contactReceiver !== undefined) {
        if (contactReceiver.featureMask === 0) {
            log.warn(`Contact receiver with id ${contactReceiver.id} has featureMask 0`);
            return false;
        }
        if (feature === threema.ContactReceiverFeature.NONE) {
            return true;
        }
        // tslint:disable:no-bitwise
        return (contactReceiver.featureMask & feature) !== 0;
        // tslint:enable:no-bitwise
    }
    log.warn('Cannot check featureMask of an undefined contact receiver');
    return false;
}

/**
 * Convert an ArrayBuffer to a data URL.
 */
export function bufferToUrl(buffer: ArrayBuffer, mimeType: string, log: Logger): string {
    switch (mimeType) {
        case 'image/jpg':
        case 'image/jpeg':
        case 'image/png':
        case 'image/webp':
        case 'image/gif':
        case 'audio/mp4':
        case 'audio/m4a':
        case 'audio/x-m4a':
        case 'audio/aac':
        case 'audio/ogg':
        case 'audio/webm':
            // OK
            break;
        default:
            const fallbackMimeType = 'image/jpeg';
            log.warn(`Unknown mimeType "${mimeType}", falling back to "${fallbackMimeType}"`);
            mimeType = fallbackMimeType;
            break;
    }
    return 'data:' + mimeType + ';base64,' + u8aToBase64(new Uint8Array(buffer));
}

/**
 * Convert a TypedArray to an ArrayBuffer.
 *
 * **Important:** If the source array's data occupies the underlying buffer
 *   completely, the underlying buffer will be returned directly. Thus, the
 *   caller may not assume that the data has been copied.
 */
export function arrayToBuffer(array: ArrayBufferView): ArrayBuffer {
    if (array.byteOffset === 0 && array.byteLength === array.buffer.byteLength) {
        return array.buffer;
    }
    return array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength);
}

/**
 * Return whether a value is not null and not undefined.
 */
export function hasValue<T>(val?: T | null): val is T {
    return val !== null && val !== undefined;
}

/**
 * Awaitable timeout function.
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Compare two Uint8Array instances. Return true if all elements are equal
 * (compared using ===).
 */
export function arraysAreEqual(a1: Uint8Array, a2: Uint8Array): boolean {
    if (a1.length !== a2.length) {
        return false;
    }
    for (let i = 0; i < a1.length; i++) {
        if (a1[i] !== a2[i]) {
            return false;
        }
    }
    return true;
}

/*
 * Return whether this key event should trigger a button.
 * https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
 */
export function isActionTrigger(ev: KeyboardEvent): boolean {
    if (ev.key === undefined) {
        return false;
    }
    switch (ev.key) {
        case 'Enter':
        case ' ':
            return true;
        default:
            return false;
    }
}

/**
 * Create a shallow copy of an object.
 */
export function copyShallow(object: object): object {
    return Object.assign({}, object);
}

/**
 * Create a deep copy (mostly).
 *
 * This handles the following types:
 *
 * - copies `undefined` and `null`,
 * - copies `Boolean`, `Number` and `String`,
 * - copies `object` recursively,
 * - copies `Array` recursively,
 * - copies `ArrayBuffer`,
 * - copies `Uint8Array`,
 *
 * Everything else will be **referenced**.
 */
export function copyDeepOrReference(value: any): any {
    // Handle `null` and `undefined` early
    if (value === null || value === undefined) {
        return value;
    }

    // Plain object
    if (value.constructor === Object) {
        const object = {};
        for (const [k, v] of Object.entries(value)) {
            object[k] = copyDeepOrReference(v);
        }
        return object;
    }

    // Plain array
    if (value instanceof Array) {
        return value.map((item) => copyDeepOrReference(item));
    }

    // ArrayBuffer
    if (value instanceof ArrayBuffer) {
        return value.slice(0);
    }

    // Uint8Array
    if (value instanceof Uint8Array) {
        // Note: To mimic the byte offset, we copy the whole underlying buffer.
        const buffer = value.buffer.slice(0);
        return new Uint8Array(buffer, value.byteOffset, value.byteLength);
    }

    // Reference everything else
    return value;
}

/**
 * Replace spaces with `&nbsp;` and tabs with `&nbsp;&nbsp;`.
 */
export function replaceWhitespace(text: string): string {
    return text
        .replace(/ /g, '&nbsp;')
        .replace(/\t/, '&nbsp;&nbsp;');
}
