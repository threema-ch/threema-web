#!/usr/bin/env python3
import json

GROUPS_JSON = '../../../twemoji-picker/generated/groups.json'

with open(GROUPS_JSON, 'r') as f:
    groups = json.loads(f.read())

mappings = []

for emoji_list in groups.values():
    for emoji in emoji_list:
        for shortname in emoji['shortnames']:
            mappings.append((shortname.strip(':'), emoji['codepoint_fully_qualified']))

print('const shortnames = {')
for (k, v) in sorted(mappings):
    print("    '{}': '{}',".format(k, v))
print('}')
