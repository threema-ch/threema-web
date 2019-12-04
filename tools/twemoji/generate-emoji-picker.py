#!/usr/bin/env python3
import json


GROUPS_JSON = '../../../twemoji-picker/generated/groups.json'


# Load and group emoji data

with open(GROUPS_JSON, 'r') as f:
    groups = json.loads(f.read())


# Define category order

category_order = [
    {'id': 'people', 'name': 'Smileys &amp; People'},
    {'id': 'nature', 'name': 'Animals &amp; Nature'},
    {'id': 'food', 'name': 'Food &amp; Drink'},
    {'id': 'activity', 'name': 'Activity'},
    {'id': 'travel', 'name': 'Travel &amp; Places'},
    {'id': 'objects', 'name': 'Objects'},
    {'id': 'symbols', 'name': 'Symbols'},
    {'id': 'flags', 'name': 'Flags'},
]


# Helper functions

def make_hexchar(codepoint):
    return '&#x%s;' % codepoint.replace('-', ';&#x')


# Data extracted from http://xahlee.info/comp/text_vs_emoji.html
text_default_codepoints = [
    '1f004', '1f170', '1f171', '1f17e', '1f17f', '1f202', '1f237', '1f321',
    '1f324', '1f325', '1f326', '1f327', '1f328', '1f329', '1f32a', '1f32b',
    '1f32c', '1f336', '1f37d', '1f396', '1f397', '1f399', '1f39a', '1f39b',
    '1f39e', '1f39f', '1f3cb', '1f3cc', '1f3cd', '1f3ce', '1f3d4', '1f3d5',
    '1f3d6', '1f3d7', '1f3d8', '1f3d9', '1f3da', '1f3db', '1f3dc', '1f3dd',
    '1f3de', '1f3df', '1f3f3', '1f3f5', '1f3f7', '1f43f', '1f441', '1f4fd',
    '1f549', '1f54a', '1f56f', '1f570', '1f573', '1f574', '1f575', '1f576',
    '1f577', '1f578', '1f579', '1f587', '1f58a', '1f58b', '1f58c', '1f58d',
    '1f590', '1f5a5', '1f5a8', '1f5b1', '1f5b2', '1f5bc', '1f5c2', '1f5c3',
    '1f5c4', '1f5d1', '1f5d2', '1f5d3', '1f5dc', '1f5dd', '1f5de', '1f5e1',
    '1f5e3', '1f5e8', '1f5ef', '1f5f3', '1f5fa', '1f6cb', '1f6cd', '1f6ce',
    '1f6cf', '1f6e0', '1f6e1', '1f6e2', '1f6e3', '1f6e4', '1f6e5', '1f6e9',
    '1f6f0', '1f6f3', '203c', '2049', '2122', '2139', '2196', '2197', '2198',
    '2199', '21a9', '21aa', '2328', '23cf', '23ed', '23ee', '23ef', '23f1',
    '23f2', '23f8', '23f9', '23fa', '24c2', '25ab', '25fb', '25fc', '2600',
    '2602', '2603', '2604', '2618', '2620', '2622', '2623', '2626', '262e',
    '2640', '2642', '265f', '2668', '267b', '267e', '2692', '2694', '2695',
    '2696', '2697', '2699', '269b', '269c', '26a0', '26b0', '26b1', '26c8',
    '26cf', '26d1', '26d3', '26e9', '26f0', '26f1', '26f4', '26f7', '26f8',
    '26f9', '2934', '2935', '2b05', '2b06', '2b07', '2b50', '3030', '303d',
    '3297', '3299', 'a9', 'ae',
]


def is_text_default(codepoint):
    """
    Temporary hack, see https://github.com/milesj/emojibase/issues/37.

    """
    return codepoint in text_default_codepoints


# Generate HTML

print('<div class="twemoji-picker" data-skintone="0">')
for i, category in enumerate(category_order):
    print('    <div class="tab">')
    print('        <input type="radio" id="tab-%d" name="tabs"%s>' % (i, ' checked' if i == 0 else ''))
    print('        <label for="tab-{0}" title="{1}" aria-label="{1} Emoji">'.format(i, category['name']))
    print('            <img src="emoji/{0}.svg" class="em-{0}" height="24" width="24" role="button" tabindex="0"></span>'.format(category['id']))
    print('        </label>')
    print('        <div class="content" role="listbox">')

    def print_emoji(emoji):
        if emoji['representation'] == 'text-default' or is_text_default(emoji['codepoint']):
            hex_codepoint = emoji['codepoint'].lower() + '-fe0f'
        else:
            hex_codepoint = emoji['codepoint'].lower()
        print('            ', end='')
        print('<span class="em em-{}-{}"'.format(category['id'], emoji['codepoint'].lower()), end='')
        print(' role="option" tabindex="0"', end='')
        print(' data-c="{}"'.format(emoji['codepoint'].lower()), end='')
        print(' data-s="{}"'.format(emoji['shortname']), end='')
        if 'skins' in emoji:
            print(' data-t="0"', end='')
        if 'skintone' in emoji:
            print(' data-t="{}"'.format(emoji['skintone']), end='')
        print(' title="{}"'.format(emoji['name']), end='')
        print('>{}</span>'.format(make_hexchar(hex_codepoint)))

    for emoji in groups[category['id']]:
        if 'gender' in emoji and emoji['gender'] is None:
            # Skip gender-neutral emoji if gendered versions are available
            continue
        print_emoji(emoji)

    print('        </div>')
    print('   </div>')
print('    <div class="skins">')
print('        <img src="emoji/tone0.svg" width="24" height="24" data-tone="0" title="No Skin Tone" role="option" tabindex="0">')
print('        <img src="emoji/tone1.svg" width="24" height="24" data-tone="1" title="Light Skin Tone" role="option" tabindex="0">')
print('        <img src="emoji/tone2.svg" width="24" height="24" data-tone="2" title="Medium-Light Skin Tone" role="option" tabindex="0">')
print('        <img src="emoji/tone3.svg" width="24" height="24" data-tone="3" title="Medium Skin Tone" role="option" tabindex="0">')
print('        <img src="emoji/tone4.svg" width="24" height="24" data-tone="4" title="Medium-Dark Skin Tone" role="option" tabindex="0">')
print('        <img src="emoji/tone5.svg" width="24" height="24" data-tone="5" title="Dark Skin Tone" role="option" tabindex="0">')
print('    </div>')
print('</div>')
