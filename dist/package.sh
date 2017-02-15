#!/usr/bin/env bash

set -euo pipefail

echo -e " _____ _                         _ _ _     _     "
echo -e "|_   _| |_ ___ ___ ___ _____ ___| | | |___| |_   "
echo -e "  | | |   |  _| -_| -_|     | .'| | | | -_| . | \e[32m_\e[0m "
echo -e "  |_| |_|_|_| |___|___|_|_|_|__,|_____|___|___|\e[32m|_|\e[0m\n"

echo -e "Creating release distribution for Threema Web\n"

# Test whether we're in the root dir
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found."
    echo "Please run this script from the root directory of this repository."
    exit 1
fi

# Clean up release directory
if [ -e "release" ]; then
    while true; do
        read -r -p "Release directory exists. Delete it? (y/n) " input
        case $input in
            y|Y ) echo -e "\n+ Delete release directory..."; rm -r release; break;;
            n|N ) echo "Aborting."; exit 1;;
            * ) echo "Invalid input.";;
        esac
    done
fi

echo "+ Create release directory..."
mkdir -p release/{dist,partials,directives,node_modules,partials/messenger.receiver,files}

echo "+ Copy code..."
cp -R index.html dist/ release/
cp -R public/* release/
cp -R src/partials/*.html release/partials/
cp -R src/partials/messenger.receiver/*.html release/partials/messenger.receiver/
cp -R src/directives/*.html release/directives/

echo "+ Copy dependencies..."
mkdir -p release/node_modules/angular/
cp node_modules/angular/angular.js release/node_modules/angular/
cp node_modules/angular/angular-csp.css release/node_modules/angular/
mkdir -p release/node_modules/angular-aria/
cp node_modules/angular-aria/angular-aria.min.js release/node_modules/angular-aria/
mkdir -p release/node_modules/angular-animate/
cp node_modules/angular-animate/angular-animate.min.js release/node_modules/angular-animate/
mkdir -p release/node_modules/angular-sanitize/
cp node_modules/angular-sanitize/angular-sanitize.min.js release/node_modules/angular-sanitize/
mkdir -p release/node_modules/angular-route/
cp node_modules/angular-route/angular-route.min.js release/node_modules/angular-route/
mkdir -p release/node_modules/babel-es6-polyfill/
cp node_modules/babel-es6-polyfill/browser-polyfill.min.js release/node_modules/babel-es6-polyfill/
mkdir -p release/node_modules/msgpack-lite/dist/
cp node_modules/msgpack-lite/dist/msgpack.min.js release/node_modules/msgpack-lite/dist/
mkdir -p release/node_modules/tweetnacl/
cp node_modules/tweetnacl/nacl-fast.min.js release/node_modules/tweetnacl/
mkdir -p release/node_modules/file-saver/
cp node_modules/file-saver/FileSaver.min.js release/node_modules/file-saver/
mkdir -p release/node_modules/js-sha256/build/
cp node_modules/js-sha256/build/sha256.min.js release/node_modules/js-sha256/build/
mkdir -p release/node_modules/chunked-dc/dist/
cp node_modules/chunked-dc/dist/chunked-dc.es5.js release/node_modules/chunked-dc/dist/
mkdir -p release/node_modules/saltyrtc-client/dist/
cp node_modules/saltyrtc-client/dist/saltyrtc-client.es5.js release/node_modules/saltyrtc-client/dist/
mkdir -p release/node_modules/saltyrtc-task-webrtc/dist/
cp node_modules/saltyrtc-task-webrtc/dist/saltyrtc-task-webrtc.es5.js release/node_modules/saltyrtc-task-webrtc/dist/
mkdir -p release/node_modules/webrtc-adapter/out/
cp node_modules/webrtc-adapter/out/adapter_no_edge.js release/node_modules/webrtc-adapter/out/
mkdir -p release/node_modules/qrcode-generator/js/
cp node_modules/qrcode-generator/js/qrcode.js release/node_modules/qrcode-generator/js/
mkdir -p release/node_modules/angular-qrcode/
cp node_modules/angular-qrcode/angular-qrcode.js release/node_modules/angular-qrcode/
mkdir -p release/node_modules/angularjs-scroll-glue/src/
cp node_modules/angularjs-scroll-glue/src/scrollglue.js release/node_modules/angularjs-scroll-glue/src/
mkdir -p release/node_modules/angular-material/
cp node_modules/angular-material/angular-material.min.js release/node_modules/angular-material/
cp node_modules/angular-material/angular-material.min.css release/node_modules/angular-material/
mkdir -p release/node_modules/croppie/
cp node_modules/croppie/croppie.min.js release/node_modules/croppie/
cp node_modules/croppie/croppie.css release/node_modules/croppie/
mkdir -p release/node_modules/autolinker/dist/
cp node_modules/autolinker/dist/Autolinker.min.js release/node_modules/autolinker/dist/
mkdir -p release/node_modules/angular-ui-router/release/
cp node_modules/angular-ui-router/release/angular-ui-router.min.js release/node_modules/angular-ui-router/release/
mkdir -p release/node_modules/messageformat/
cp node_modules/messageformat/messageformat.min.js release/node_modules/messageformat/
mkdir -p release/node_modules/angular-translate/dist/{.,angular-translate-loader-static-files,angular-translate-interpolation-messageformat}
cp node_modules/angular-translate/dist/angular-translate.min.js release/node_modules/angular-translate/dist/
cp node_modules/angular-translate/dist/angular-translate-loader-static-files/angular-translate-loader-static-files.min.js release/node_modules/angular-translate/dist/angular-translate-loader-static-files/
cp node_modules/angular-translate/dist/angular-translate-interpolation-messageformat/angular-translate-interpolation-messageformat.min.js release/node_modules/angular-translate/dist/angular-translate-interpolation-messageformat/
mkdir -p release/node_modules/angular-inview/
cp node_modules/angular-inview/angular-inview.js release/node_modules/angular-inview/
mkdir -p release/node_modules/angular-messages/
cp node_modules/angular-messages/angular-messages.min.js release/node_modules/angular-messages/

echo "+ Update version number..."
VERSION=$(grep "\"version\"" package.json  | sed 's/\s*\"version\": \"\([^\"]*\).*/\1/')
sed -i "s/\[\[VERSION\]\]/${VERSION}/g" release/index.html release/dist/app.js

echo "+ Update permissions..."
find release/ -type f -exec chmod 644 {} \;
find release/ -type d -exec chmod 755 {} \;

echo "+ Put everything in an archive..."
tar cfz dist/release.tar.gz release/

echo -e "\nDone."
