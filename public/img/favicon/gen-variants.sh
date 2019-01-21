#!/bin/bash
# Generate favicon variants.
# Requirements: bash, python3, imagemagick, optipng.
set -euo pipefail

COLOR_RED='#f44336'
COLOR_YELLOW='#ff9800'
COLOR_BLUE='#1b81e4'
WIDTH=0.1875
OFFSET=0.0625
WIDTHS=(16 32)

circle() {
    offset_abs=$(python3 -c "print(int($1 * $OFFSET))")
    x=$(python3 -c "print(int($1 - $1 * $WIDTH - $offset_abs))")
    xx=$(python3 -c "print(int($1 - $offset_abs))")
    y=$(python3 -c "print(int($1 * $WIDTH + $offset_abs))")
    echo "circle $x,$y $xx,$y"
}


for w in ${WIDTHS[@]}; do
    echo "Red ${w}x${w}"
    magick favicon-${w}x${w}.png \
        -fill $COLOR_RED \
        -draw "$(circle $w)" \
        favicon-${w}x${w}-error.png
    optipng -o6 favicon-${w}x${w}-error.png

    echo "Yellow ${w}x${w}"
    magick favicon-${w}x${w}.png \
        -fill $COLOR_YELLOW \
        -draw "$(circle $w)" \
        favicon-${w}x${w}-warning.png
    optipng -o6 favicon-${w}x${w}-warning.png

    echo "Blue ${w}x${w}"
    magick favicon-${w}x${w}.png \
        -fill $COLOR_BLUE \
        -draw "$(circle $w)" \
        favicon-${w}x${w}-unread.png
    optipng -o6 favicon-${w}x${w}-unread.png
done
