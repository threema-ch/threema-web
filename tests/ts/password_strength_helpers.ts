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

import {scorePassword, Strength} from '../../src/helpers/password_strength';

describe('Password Strength Helpers', () => {
    describe('scorePassword', () => {
        it('returns 0 for empty passwords', function() {
            expect(scorePassword('')).toEqual({score: 0, strength: Strength.BAD});
        });

        it('increases points depending on character count', function() {
            expect(scorePassword('a')).toEqual({score: 5, strength: Strength.BAD});
            expect(scorePassword('abcd')).toEqual({score: 20, strength: Strength.BAD});
            expect(scorePassword('aaaa')).toEqual({score: 10, strength: Strength.BAD});
        });

        it('awards points for multiple character classes', function() {
            expect(scorePassword('abc')).toEqual({score: 15, strength: Strength.BAD});
            expect(scorePassword('aBc')).toEqual({score: 25, strength: Strength.BAD});
            expect(scorePassword('aB3')).toEqual({score: 35, strength: Strength.BAD});
        });

        it('assigns strength based on score', function() {
            expect(scorePassword('aB3')).toEqual({score: 35, strength: Strength.BAD});
            expect(scorePassword('aB3cde')).toEqual({score: 50, strength: Strength.WEAK});
            expect(scorePassword('aB3cdefgh')).toEqual({score: 65, strength: Strength.GOOD});
            expect(scorePassword('aB3cdefghijkl')).toEqual({score: 85, strength: Strength.STRONG});
        });
    });
});
