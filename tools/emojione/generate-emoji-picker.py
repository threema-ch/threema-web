#!/usr/bin/env python3
from collections import defaultdict
import json


# Load and group emoji data

with open('emoji.json', 'r') as f:
    emoji_data = json.loads(f.read())

groups = defaultdict(list)
for k, details in emoji_data.items():
    groups[details['category']].append((k, details))


# Define category order

category_order = [
    {'id': 'people', 'name': 'Smileys &amp; People', 'icon': '1f604'},
    {'id': 'nature', 'name': 'Animals &amp; Nature', 'icon': '1f426'},
    {'id': 'food', 'name': 'Food &amp; Drink', 'icon': '1f354'},
    {'id': 'activity', 'name': 'Activity', 'icon': '26bd'},
    {'id': 'travel', 'name': 'Travel &amp; Places', 'icon': '2708'},
    {'id': 'objects', 'name': 'Objects', 'icon': '1f4a1'},
    {'id': 'symbols', 'name': 'Symbols', 'icon': '1f523'},
    {'id': 'flags', 'name': 'Flags', 'icon': '1f1ec-1f1e7'},
]


# Helper functions

def make_hexchar(codepoint):
    return '&#x%s;' % codepoint.replace('-', ';&#x')


# Generate HTML

print('<div class="emojione-picker">')
for i, category in enumerate(category_order):
    print('    <div class="tab">')
    print('        <input type="radio" id="tab-%d" name="tabs"%s>' % (i, ' checked' if i == 0 else ''))
    print('        <label for="tab-%d" title="%s">' % (i, category['name']))
    print('            <span class="e1 e1-{0} _{1}">{2}</span>'.format(category['id'], category['icon'], make_hexchar(category['icon'])))
    print('        </label>')
    print('        <div class="content">')
    for emoji in groups[category['id']]:
        print('            <span class="e1 e1-{0} _{1}" data-c="{2}" data-s="{3}" title="{4}">{5}</span>'.format(
            category['id'] if not emoji[1]['diversity'] else 'diversity',
            emoji[0],
            emoji[1]['code_points']['greedy_matches'][0],
            emoji[1]['shortname'],
            emoji[1]['shortname'],
            make_hexchar(emoji[1]['code_points']['greedy_matches'][0]),
        ))
    print('        </div>')
    print('   </div>')
print('</div>')
