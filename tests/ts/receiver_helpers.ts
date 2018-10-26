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
/// <reference path="../../src/threema.d.ts" />

import * as helpers from '../../src/receiver_helpers';

describe('Receiver Helpers', () => {
    describe('isGatewayContact', () => {
        it('regular contact', function() {
            expect(helpers.isGatewayContact({id: 'FOOOOBAR', type: 'contact'} as threema.ContactReceiver)).toBe(false);
        });

        it('gateway contact', function() {
            expect(helpers.isGatewayContact({id: '*THREEMA', type: 'contact'} as threema.ContactReceiver)).toBe(true);
        });

        it('empty identity', function() {
            expect(helpers.isGatewayContact({id: '', type: 'contact'} as threema.ContactReceiver)).toBe(false);
        });
    });

    describe('isEchoContact', () => {
        it('regular contact', function() {
            expect(helpers.isEchoContact({id: 'FOOOOBAR', type: 'contact'} as threema.ContactReceiver)).toBe(false);
        });

        it('gateway contact', function() {
            expect(helpers.isEchoContact({id: '*THREEMA', type: 'contact'} as threema.ContactReceiver)).toBe(false);
        });

        it('empty identity', function() {
            expect(helpers.isEchoContact({id: '', type: 'contact'} as threema.ContactReceiver)).toBe(false);
        });

        it('echoecho', function() {
            expect(helpers.isEchoContact({id: 'ECHOECHO', type: 'contact'} as threema.ContactReceiver)).toBe(true);
        });
    });
});
