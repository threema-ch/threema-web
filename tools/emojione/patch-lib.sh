#!/bin/sh
set -e
BASEPATH=../../public/libs/emojione
EMOJIONE_VERSION=3.1

# Spritemaps
sed -i "s/emojione-32-/e1-/g" $BASEPATH/emojione-sprite-32.min.css
sed -i "s/url(\([^)]*\.png\))/url(\1?v=${EMOJIONE_VERSION})/g" $BASEPATH/emojione-sprite-32.min.css

# Javascript
sed -i "s/emojione emojione-'+size+\"-\"/e1 e1-'/g" $BASEPATH/emojione.min.js
sed -i "s/\"emojione/\"e1/g" $BASEPATH/emojione.min.js
