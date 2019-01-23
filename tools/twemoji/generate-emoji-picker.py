#!/usr/bin/env python3
import json


GROUPS_JSON = '../../../twemoji-picker/generated/groups.json'


# Load and group emoji data

with open(GROUPS_JSON, 'r') as f:
    groups = json.loads(f.read())


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

print('<div class="twemoji-picker">')
for i, category in enumerate(category_order):
    print('    <div class="tab">')
    print('        <input type="radio" id="tab-%d" name="tabs"%s>' % (i, ' checked' if i == 0 else ''))
    print('        <label for="tab-%d" title="%s">' % (i, category['name']))
    print('            <span class="em em-{0} em-{0}-{1}"></span>'.format(category['id'], category['icon']))
    print('        </label>')
    print('        <div class="content">')
    for emoji in groups[category['id']]:
        print('            <span class="em em-{3}-{0}" data-c="{0}" data-s="{1}" title="{2}">{4}</span>'.format(
            emoji['codepoint'].lower(),
            emoji['shortname'],
            emoji['name'],
            category['id'],
            make_hexchar(emoji['codepoint_fully_qualified']),
        ))
    print('        </div>')
    print('   </div>')
print('</div>')
