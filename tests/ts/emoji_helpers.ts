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

import twemoji from 'twemoji';
import {emojify, emojifyNew, enlargeSingleEmoji, shortnameToUnicode} from '../../src/helpers/emoji';


const textVariantSelector = '\ufe0e';
const emojiVariantSelector = '\ufe0f';

const beer = '\ud83c\udf7b';
const bird = '\ud83d\udc26';

function makeEmoji(emojiString: string, codepoint?: string, imgCodepoint?: string): threema.EmojiInfo {
    if (codepoint === undefined) {
        codepoint = twemoji.convert.toCodePoint(emojiString);
    }
    const imgPath = imgCodepoint === undefined
        ? `emoji/png32/${codepoint}.png`
        : `emoji/png32/${imgCodepoint}.png`;
    return {
        emojiString: emojiString,
        imgPath: imgPath,
        codepoint: codepoint,
    }
}


describe('Emoji Helpers', () => {
    describe('emojify', () => {
        it('emojifies with img tag', function() {
            expect(emojify('hello 🐦'))
                .toEqual('hello <img class="em" draggable="false" '
                       + 'alt="🐦" src="emoji/png32/1f426.png" data-c="1f426"/>');
        });

        it('ignores certain codepoints', function() {
            expect(emojify('©')).toEqual('©');
            expect(emojify('®')).toEqual('®');
            expect(emojify('™')).toEqual('™');
        });
    });

    describe('emojifyNew', () => {
        it('returns text unmodified', function() {
            expect(emojifyNew('hello world')).toEqual(['hello world']);
        });

        it('emojifies single emoji', function() {
            expect(emojifyNew(bird))
                .toEqual([makeEmoji(bird)]);
        });

        it('emojifies multiple emoji', function() {
            expect(emojifyNew(`${beer}${bird}`))
                .toEqual([makeEmoji(beer), makeEmoji(bird)]);
        });

        it('emojifies mixed content', function() {
            expect(emojifyNew(`hi ${bird}`))
                .toEqual(['hi ', makeEmoji(bird)]);
            expect(emojifyNew(`${bird} bird`))
                .toEqual([makeEmoji(bird), ' bird']);
            expect(emojifyNew(`hi ${bird} bird`))
                .toEqual(['hi ', makeEmoji(bird), ' bird']);
            expect(emojifyNew(`hi ${bird}${beer}`))
                .toEqual(['hi ', makeEmoji(bird), makeEmoji(beer)]);
        });

        it('ignores certain codepoints', function() {
            expect(emojifyNew('©')).toEqual(['©']);
            expect(emojifyNew('®')).toEqual(['®']);
            expect(emojifyNew('™')).toEqual(['™']);
        });

        it('properly handles variant selectors (text-default)', function() {
            // Copyright: Text-default
            const copy = '©';
            expect(emojifyNew(copy))
                .toEqual([copy]);
            expect(emojifyNew(copy + textVariantSelector))
                .toEqual([copy + textVariantSelector]);
            expect(emojifyNew(copy + emojiVariantSelector))
                .toEqual([makeEmoji(copy + emojiVariantSelector, 'a9-fe0f', 'a9')]);
        });

        it('properly handles variant selectors (emoji-default)', function() {
            // Exclamation mark: Emoji-default
            const exclamation = '\u2757';
            expect(emojifyNew(exclamation))
                .toEqual([makeEmoji(exclamation, '2757', '2757')]);
            expect(emojifyNew(exclamation + textVariantSelector))
                .toEqual([exclamation + textVariantSelector]);
            expect(emojifyNew(exclamation + emojiVariantSelector))
                .toEqual([makeEmoji(exclamation + emojiVariantSelector, '2757', '2757')]);
        });
    });

    describe('shortnameToUnicode', () => {
        it('converts valid shortnames', function() {
            expect(shortnameToUnicode('+1')).toEqual('\ud83d\udc4d\ufe0f');
            expect(shortnameToUnicode('thumbup')).toEqual('\ud83d\udc4d\ufe0f');
            expect(shortnameToUnicode('thumbsup')).toEqual('\ud83d\udc4d\ufe0f');
        });

        it('returns null for unknown shortcodes', function() {
            expect(shortnameToUnicode('sömbsöp')).toBeNull();
        });

        it('handles multi-codepoint emoji', function() {
            expect(shortnameToUnicode('ch')).toEqual('\ud83c\udde8\ud83c\udded');
        });
    });

    describe('enlargeSingleEmoji', function() {
        const process = (text) => {
            return enlargeSingleEmoji(text, true)
        };

        const singleEmojiClassName = 'large-emoji';
        const crazy = '<img class="em" draggable="false"'
            + ' alt="🤪" src="emoji/png32/1f92a.png" data-c="1f92a">';
        const crazyLarge = '<img class="em ' + singleEmojiClassName
            + '" draggable="false" alt="🤪" src="emoji/png64/1f92a.png" data-c="1f92a">';
        const copyright = '<img class="em anotherclass" draggable="false"'
            + ' alt="©️" src="emoji/png32/a9.png" data-c="a9">';
        const copyrightLarge = '<img class="em ' + singleEmojiClassName
            + ' anotherclass" draggable="false" alt="©️" src="emoji/png64/a9.png" data-c="a9">';

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
