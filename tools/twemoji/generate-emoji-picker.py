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
        print('            ', end='')
        print('<span class="em em-{}-{}"'.format(category['id'], emoji['twemoji_codepoint'].lower()), end='')
        print(' role="option" tabindex="0"', end='')
        print(' data-c="{}"'.format(emoji['codepoint'].lower()), end='')
        print(' data-s="{}"'.format(emoji['shortname']), end='')
        if 'skins' in emoji:
            print(' data-t="0"', end='')
        if 'skintone' in emoji:
            print(' data-t="{}"'.format(emoji['skintone']), end='')
        print(' title="{}"'.format(emoji['shortname']), end='')
        if emoji['representation'] == 'text-default':
            hex_codepoint = emoji['codepoint'].lower() + '-fe0f'
        else:
            hex_codepoint = emoji['codepoint'].lower()
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
