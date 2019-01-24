/**
 * Copyright © 2016-2019 Threema GmbH (https://threema.ch/).
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

import {emojify, enlargeSingleEmoji, shortnameToUnicode} from '../../src/helpers/emoji';

describe('Emoji Helpers', () => {
    describe('emojify', () => {
        it('emojifies with img tag', function() {
            expect(emojify('hello 🐦'))
                .toEqual('hello <img class="em" draggable="false" '
                       + 'alt="🐦" src="/emoji/png32/1f426.png" data-c="1f426"/>');
        });

        it('ignores certain codepoints', function() {
            expect(emojify('©')).toEqual('©');
            expect(emojify('®')).toEqual('®');
            expect(emojify('™')).toEqual('™');
        });
    });

    describe('shortnameToUnicode', () => {
        it('converts valid shortnames', function() {
            expect(shortnameToUnicode('+1')).toEqual('\ud83d\udc4d');
            expect(shortnameToUnicode('thumbup')).toEqual('\ud83d\udc4d');
            expect(shortnameToUnicode('thumbsup')).toEqual('\ud83d\udc4d');
        });

        it('returns null for unknown shortcodes', function() {
            expect(shortnameToUnicode('sömbsöp')).toBeNull();
        });
    });

    describe('enlargeSingleEmoji', function() {
        const process = (text) => {
            return enlargeSingleEmoji(text, true)
        };

        const singleEmojiClassName = 'large-emoji';
        const crazy = '<img class="em" draggable="false"'
            + ' alt="🤪" src="/emoji/png32/1f92a.png" data-c="1f92a">';
        const crazyLarge = '<img class="em ' + singleEmojiClassName
            + '" draggable="false" alt="🤪" src="/emoji/png64/1f92a.png" data-c="1f92a">';
        const copyright = '<img class="em anotherclass" draggable="false"'
            + ' alt="©️" src="/emoji/png32/a9.png" data-c="a9">';
        const copyrightLarge = '<img class="em ' + singleEmojiClassName
            + ' anotherclass" draggable="false" alt="©️" src="/emoji/png64/a9.png" data-c="a9">';

        it('enlarges 1 emoji', () => {
            expect(process(crazy)).toEqual(crazyLarge);
        });

        it('enlarges 2 emoji', () => {
            expect(process(crazy + copyright)).toEqual(crazyLarge + copyrightLarge);
        });

        it('enlarges 3 emoji', () => {
            expect(process(crazy + copyright + crazy)).toEqual(crazyLarge + copyrightLarge + crazyLarge);
        });

        it('does not enlarge 4 emoji', () => {
            expect(process(crazy + copyright + crazy + copyright)).toEqual(crazy + copyright + crazy + copyright);
        });

        it('does not enlarge if non-emoji characters are contained', () => {
            expect(process(crazy + ' ')).toEqual(crazy + ' ');
            expect(process(crazy + 'a' + crazy)).toEqual(crazy + 'a' + crazy);
        });

        it('does not modify non emoji text', () => {
            const text = 'emoji e1 e1-people em em-people hello';
            expect(process(text)).toEqual(text);
        });

        it('does nothing if enlarge flag is set to false', () => {
            expect(enlargeSingleEmoji(crazy, false)).toEqual(crazy);
        });
    });

});
