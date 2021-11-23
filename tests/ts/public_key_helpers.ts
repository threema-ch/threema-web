/**
 * Copyright © 2016-2021 Threema GmbH (https://threema.ch/).
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

import {publicKeyGrid} from '../../src/helpers/public_key';

describe('PublicKey Helpers', () => {
    it('publicKeyGrid', function() {
        const arr = Uint8Array.of(
            0, 1, 2, 3, 4, 5, 6, 7,
            8, 9, 10, 11, 12, 13, 14, 15,
            16, 17, 18, 19, 20, 21, 22, 23,
            248, 249, 250, 251, 252, 253, 254, 255,
        );
        expect(publicKeyGrid(arr)).toEqual(
            '0 0 0 1 0 2 0 3\n' +
            '0 4 0 5 0 6 0 7\n' +
            '0 8 0 9 0 a 0 b\n' +
            '0 c 0 d 0 e 0 f\n' +
            '1 0 1 1 1 2 1 3\n' +
            '1 4 1 5 1 6 1 7\n' +
            'f 8 f 9 f a f b\n' +
            'f c f d f e f f'
        );
    });
});
