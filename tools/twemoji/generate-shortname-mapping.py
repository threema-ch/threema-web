#!/usr/bin/env python3
import json

GROUPS_JSON = '../../../twemoji-picker/generated/groups.json'

with open(GROUPS_JSON, 'r') as f:
    groups = json.loads(f.read())

print('const shortnames = {')
for emoji_list in groups.values():
    for emoji in emoji_list:
        for shortname in emoji['shortnames']:
            print("    '{}': '{}',".format(
                shortname.strip(':'),
                emoji['codepoint_fully_qualified']
            ))
print('}')
