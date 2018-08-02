/**
 * Copyright © 2016-2018 Threema GmbH (https://threema.ch/).
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

import {sha256} from '../../src/helpers/crypto';

describe('Crypto Helpers', () => {
    it('sha256', function(done) {
        const arr = Uint8Array.of(1, 2, 4, 8, 254, 255);
        sha256(arr.buffer).then((hash) => {
            expect(hash).toEqual('54caf7192551d011c9018e6e00b0f2d13f71784277d581fc5146182cb8af4181');
            done();
        });
    });
});
