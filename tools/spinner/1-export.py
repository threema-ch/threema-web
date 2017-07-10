#!/usr/bin/env python3
"""
Export spinner as GIF.

Dependencies:

 - Python 3.5+
 - Inkscape

"""
import subprocess
import tempfile


FRAMES = 30


def create_png(rotation: int) -> None:
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8',
                                     prefix='threema-web-spinner-', suffix='.svg') as f:
        # Write rotated SVG to temporary file
        f.write(svg.replace('rotate(132,15,15)', 'rotate(%d,15,15)' % rotation))
        f.flush()

        # Convert to PNG
        filename = 'spinner-{:0>3}.png'.format(rotation)
        print('Creating %s...' % filename)
        result = subprocess.run([
            'inkscape',
            '-z',
            '-e', filename,
            '-w', '30',
            '-h', '30',
            '-b', 'white',
            f.name,
        ])
        result.check_returncode()


if __name__ == '__main__':
    with open('spinner.svg', 'r') as f:
        svg = f.read()

    for i in range(FRAMES):
        create_png(int(360 / FRAMES * i))
