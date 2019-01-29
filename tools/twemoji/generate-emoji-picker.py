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

print('<div class="twemoji-picker">')
for i, category in enumerate(category_order):
    print('    <div class="tab">')
    print('        <input type="radio" id="tab-%d" name="tabs"%s>' % (i, ' checked' if i == 0 else ''))
    print('        <label for="tab-%d" title="%s">' % (i, category['name']))
    print('            <img src="emoji/{0}.svg" class="em-{0}" height="24" width="24" role="button" tabindex="0"></span>'.format(category['id']))
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
