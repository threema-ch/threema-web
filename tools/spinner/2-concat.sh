#!/bin/bash
# Create animated GIF.
#
# Dependencies:
#
#  - Imagemagick

duration=1100
framecount=30
delay=$(bc -l <<< "$duration / $framecount / 10")

convert -delay $delay -loop 0 -colors 24 spinner-*.png spinner.gif
