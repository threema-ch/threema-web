#!/usr/bin/env python3
import json
import re

GROUPS_JSON = '../../../twemoji-picker/generated/groups.json'

with open(GROUPS_JSON, 'r') as f:
    groups = json.loads(f.read())

text_default = []

for emoji_list in groups.values():
    for emoji in emoji_list:
        if emoji['representation'] == 'text-default':
            text_default.append(emoji['codepoint'])
            text_default.append(re.sub(r'-fe0[ef]$', '', emoji['codepoint']))

print('// Generated with tools/twemoji/generate-textdefault-emoji.py')
print('const TEXT_DEFAULT_EMOJI = [')
for codepoint in sorted(set(text_default)):
    print("    '{}',".format(codepoint))
print('];')
