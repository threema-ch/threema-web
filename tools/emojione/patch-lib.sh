#!/bin/sh
set -e
BASEPATH=../../public/libs/emojione
sed -i "s/emojione-32-/e1-/g" $BASEPATH/emojione-sprite-32.min.css
sed -i "s/emojione emojione-'+size+\"-\"/e1 e1-'/g" $BASEPATH/emojione.min.js
sed -i "s/\"emojione/\"e1/g" $BASEPATH/emojione.min.js
