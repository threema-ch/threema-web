#!/usr/bin/env bash

set -euo pipefail

LICENSE_FILES=(
    'angular' 'node_modules/angular/LICENSE.md'
    'angular-animate' 'node_modules/angular-animate/LICENSE.md'
    'angular-aria' 'node_modules/angular-aria/LICENSE.md'
    'angular-inview' 'node_modules/angular-inview/LICENSE'
    'angular-material' 'node_modules/angular-material/LICENSE'
    'angular-messages' 'node_modules/angular-messages/LICENSE.md'
    'angular-qrcode' '.licenses/angular-qrcode'
    'angular-route' 'node_modules/angular-route/LICENSE.md'
    'angular-sanitize' 'node_modules/angular-sanitize/LICENSE.md'
    'angular-translate' 'node_modules/angular-translate/LICENSE'
    'angular-ui-router' 'node_modules/angular-ui-router/LICENSE'
    'angularjs-scroll-glue' '.licenses/angularjs-scroll-glue'
    'autolinker' 'node_modules/autolinker/LICENSE'
    'babel-es6-polyfill' '.licenses/babel-es6-polyfill'
    'babel-preset-es2015' '.licenses/babel-preset-es2015'
    'babelify' 'node_modules/babelify/LICENSE'
    'browserify' 'node_modules/browserify/LICENSE'
    'browserify-header' '.licenses/browserify-header'
    'croppie' 'node_modules/croppie/LICENSE'
    'file-saver' 'node_modules/file-saver/LICENSE.md'
    'js-sha256' 'node_modules/js-sha256/LICENSE.txt'
    'messageformat' 'node_modules/messageformat/LICENSE'
    'msgpack-lite' 'node_modules/msgpack-lite/LICENSE'
    'node-sass' 'node_modules/node-sass/LICENSE'
    'saltyrtc-client' 'node_modules/saltyrtc-client/LICENSE.md'
    'saltyrtc-task-webrtc' 'node_modules/saltyrtc-task-webrtc/LICENSE.md'
    'ts-events' 'node_modules/ts-events/LICENSE'
    'tsify' '.licenses/tsify'
    'tweetnacl' 'node_modules/tweetnacl/LICENSE'
    'typescript' 'node_modules/typescript/LICENSE.txt'
    'webrtc-adapter' 'node_modules/webrtc-adapter/LICENSE.md'
)
FILE=LICENSE-3RD-PARTY.txt

echo -e "Licenses for third party libraries in Threema Web:\n\n\n\n" > $FILE
for i in ${!LICENSE_FILES[@]}; do
    if (( $i % 2 == 0 )); then
        echo -e "----------" >> $FILE
        echo -e "License for ${LICENSE_FILES[$i]}" >> $FILE
        echo -e "----------\n" >> $FILE
    else
        cat "${LICENSE_FILES[$i]}" >> $FILE
        echo -e "\n\n\n" >> $FILE
    fi
done
