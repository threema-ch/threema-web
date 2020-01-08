/**
 * Copyright © 2016-2020 Threema GmbH (https://threema.ch/).
 *
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
import {
    censor,
    BaseConfidential,
    ConfidentialArray,
    ConfidentialIceCandidate,
    ConfidentialObjectValues,
    ConfidentialWireMessage
} from '../../src/helpers/confidential';

// tslint:disable:no-reference
/// <reference path="../../src/threema.d.ts" />

class UnlistedClass {}

/**
 * A confidential subclass for testing purposes.
 */
class TestConfidential extends BaseConfidential<string, string> {
    public readonly uncensored: string = 'uncensored';

    public censored(): string {
        return 'censored';
    }
}

describe('Confidential Helpers', () => {
    describe('censor function', () => {
        it('handles null and undefined', () => {
            expect(censor(null)).toBe(null);
            expect(censor(undefined)).toBe(undefined);
        });

        it('handles an object implementing the Confidential interface', () => {
            expect(censor(new TestConfidential())).toBe('censored');
        });

        it('handles booleans', () => {
            expect(censor(true)).toBe('[Boolean]');
            expect(censor(false)).toBe('[Boolean]');
        });

        it('handles numbers', () => {
            expect(censor(0)).toBe('[Number]');
            expect(censor(42)).toBe('[Number]');
            expect(censor(-1337)).toBe('[Number]');
        });

        it('handles strings', () => {
            expect(censor('test')).toBe('[String: length=4]');
            expect(censor('')).toBe('[String: length=0]');
        });

        it('handles binary types', () => {
            const buffer = new ArrayBuffer(10);
            const array = new Uint8Array(buffer, 2, 6);
            const blob = new Blob([JSON.stringify({ a: 10 })], { type: 'application/json'} );
            expect(censor(buffer)).toBe('[ArrayBuffer: length=10]');
            expect(censor(array)).toBe('[Uint8Array: length=6, offset=2]');
            expect(censor(blob)).toBe(`[Blob: length=${blob.size}, type=application/json]`);
        });

        it('handles arrays', () => {
            expect(censor([
                null,
                undefined,
                new TestConfidential(),
                false,
                42,
                'test',
                new Uint8Array(10),
            ])).toEqual([
                null,
                undefined,
                'censored',
                '[Boolean]',
                '[Number]',
                '[String: length=4]',
                '[Uint8Array: length=10, offset=0]',
            ]);
        });

        it('handles arrays recursively', () => {
            expect(censor([
                'test',
                [1, false],
            ])).toEqual([
                '[String: length=4]',
                ['[Number]', '[Boolean]'],
            ]);
        });

        it('handles objects', () => {
            expect(censor({
                null: null,
                undefined: undefined,
                confidential: new TestConfidential(),
                boolean: false,
                number: 42,
                string: 'test',
                uint8array: new Uint8Array(10),
            })).toEqual({
                null: null,
                undefined: undefined,
                confidential: 'censored',
                boolean: '[Boolean]',
                number: '[Number]',
                string: '[String: length=4]',
                uint8array: '[Uint8Array: length=10, offset=0]',
            });
        });

        it('handles objects recursively', () => {
            expect(censor({
                boolean: false,
                object: {
                    foo: 'bar',
                },
            })).toEqual({
                boolean: '[Boolean]',
                object: {
                    foo: '[String: length=3]',
                },
            });
        });

        it('handles class instances', () => {
            expect(censor(new UnlistedClass())).toBe('[UnlistedClass]');
        });
    });

    describe('ConfidentialArray', () => {
        it('subclass of BaseConfidential', () => {
            expect(ConfidentialArray.prototype instanceof BaseConfidential).toBeTruthy();
        });

        it('sanitises all items', () => {
            const array = new ConfidentialArray([new TestConfidential(), new TestConfidential()]);
            expect(array.uncensored).toEqual(['uncensored', 'uncensored']);
            expect(array.censored()).toEqual(['censored', 'censored']);
        });

        it('sanitises all items recursively', () => {
            const array = new ConfidentialArray([
                new TestConfidential(),
                new ConfidentialArray([new TestConfidential()]),
            ]);
            expect(array.uncensored).toEqual(['uncensored', ['uncensored']]);
            expect(array.censored()).toEqual(['censored', ['censored']]);
        });
    });

    describe('ConfidentialObjectValues', () => {
        it('subclass of BaseConfidential', () => {
            expect(ConfidentialObjectValues.prototype instanceof BaseConfidential).toBeTruthy();
        });

        it('returns underlying object directly when unveiling', () => {
            const object = {};
            const confidential = new ConfidentialObjectValues(object);
            expect(confidential.uncensored).toBe(object);
        });

        it('sanitises all object values', () => {
            const object = {
                boolean: false,
                object: {
                    foo: 'bar',
                },
            };
            const confidential = new ConfidentialObjectValues(object);
            expect(confidential.uncensored).toBe(object);
            expect(confidential.censored()).toEqual({
                boolean: '[Boolean]',
                object: {
                    foo: '[String: length=3]',
                },
            });
        });
    });

    describe('ConfidentialWireMessage', () => {
        it('subclass of BaseConfidential', () => {
            expect(ConfidentialWireMessage.prototype instanceof BaseConfidential).toBeTruthy();
        });

        it('returns underlying message directly when unveiling', () => {
            const message = {
                type: 'request/food',
                subType: 'dessert',
            };
            const confidential = new ConfidentialWireMessage(message);
            expect(confidential.uncensored).toBe(message);
        });

        it("handles 'args' and 'data' being undefined", () => {
            const message = {
                type: 'request/food',
                subType: 'dessert',
            };
            const confidential = new ConfidentialWireMessage(message);
            expect(confidential.censored()).toEqual(message);
        });

        it("sanitises 'args' and 'data' fields", () => {
            const message = {
                type: 'request/food',
                subType: 'dessert',
                args: 'arrrrrrgggsss',
                data: {
                    preference: ['ice cream', 'chocolate'],
                    priority: Number.POSITIVE_INFINITY,
                },
            };
            const confidential = new ConfidentialWireMessage(message);
            expect(confidential.censored()).toEqual({
                type: 'request/food',
                subType: 'dessert',
                args: '[String: length=13]',
                data: {
                    preference: ['[String: length=9]', '[String: length=9]'],
                    priority: '[Number]',
                },
            });
        });
    });

    describe('ConfidentialIceCandidate', () => {
        it('subclass of BaseConfidential', () => {
            expect(ConfidentialIceCandidate.prototype instanceof BaseConfidential).toBeTruthy();
        });

        it('returns underlying ICE candidate directly when unveiling', () => {
            const input = 'cannot be bothered to use valid SDP here';
            const confidential = new ConfidentialIceCandidate(input);
            expect(confidential.uncensored).toBe(input);
        });

        it('returns underlying ICE candidate directly if it cannot be parsed', () => {
            const input = 'certainly invalid';
            const confidential = new ConfidentialIceCandidate(input);
            expect(confidential.censored()).toBe(input);
        });

        it('does not censor mDNS concealed candidates', () => {
            const input = 'candidate:1 1 UDP 1234 aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.local 1337 typ host';
            const confidential = new ConfidentialIceCandidate(input);
            expect(confidential.censored()).toBe(input);
        });

        it('censors host candidates', () => {
            // IPv4
            let input = 'candidate:1 1 UDP 1234 192.168.0.42 1337 typ host';
            let expected = 'candidate:1 1 UDP 1234 192.168.*.* 1337 typ host';
            let confidential = new ConfidentialIceCandidate(input);
            expect(confidential.censored()).toBe(expected);

            // IPv6
            input = 'candidate:1 1 UDP 1234 fe80::1 1337 typ host';
            expected = 'candidate:1 1 UDP 1234 fe80::* 1337 typ host';
            confidential = new ConfidentialIceCandidate(input);
            expect(confidential.censored()).toBe(expected);
        });

        it('censors srflx candidates', () => {
            const input = 'candidate:1 1 UDP 1234 1.2.3.4 42 typ srflx raddr 192.168.0.42 rport 1337';
            const expected = 'candidate:1 1 UDP 1234 1.2.*.* 42 typ srflx raddr 192.168.*.* rport 1337';
            const confidential = new ConfidentialIceCandidate(input);
            expect(confidential.censored()).toBe(expected);
        });

        it('censors relay candidates', () => {
            // IPv4
            let input = 'candidate:1 1 UDP 1234 1.2.3.4 42 typ relay raddr 192.168.0.42 rport 1337';
            let expected = 'candidate:1 1 UDP 1234 1.2.3.4 42 typ relay raddr 192.168.*.* rport 1337';
            let confidential = new ConfidentialIceCandidate(input);
            expect(confidential.censored()).toBe(expected);

            // IPv6
            input = 'candidate:1 1 UDP 1234 2a02:1:2::3 42 typ relay raddr 2a02:dead:beef::1 rport 1337';
            expected = 'candidate:1 1 UDP 1234 2a02:1:2::3 42 typ relay raddr 2a02:*:*::* rport 1337';
            confidential = new ConfidentialIceCandidate(input);
            expect(confidential.censored()).toBe(expected);
        });
    });
});
