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

export const enum Strength {
    BAD = 'bad',
    WEAK = 'weak',
    GOOD = 'good',
    STRONG = 'strong',
}

/**
 * A very simple (rather naive) password strength indicator.
 */
export function scorePassword(password: string): {score: number, strength: Strength} {
    let score = 0;

    // Detect empty password
    if (password.length === 0) {
        return {score: score, strength: Strength.BAD};
    }

    // Award letter count, but less points for repeated letters
    const letterCount = {};
    for (const character of password) {
        letterCount[character] = (letterCount[character] || 0) + 1;
        score += 5.0 / letterCount[character];
    }

    // Bonus points for multiple character categories
    const categories = {
        digits: /\d/.test(password),
        lower: /[a-z]/.test(password),
        upper: /[A-Z]/.test(password),
        nonWords: /\W/.test(password),
    };
    const categoryCount = Object
        .values(categories)
        .reduce((total, x) => x ? total + 1 : total, 0);
    score += (categoryCount - 1) * 10;

    // Truncate to an integer
    score = Math.trunc(score);

    // Score strength
    let strength;
    if (score > 80) {
        strength = Strength.STRONG;
    } else if (score > 60) {
        strength = Strength.GOOD;
    } else if (score > 40) {
        strength = Strength.WEAK;
    } else {
        strength = Strength.BAD;
    }

    return {
        score: score,
        strength: strength,
    };
}
