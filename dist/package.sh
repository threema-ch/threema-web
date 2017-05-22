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

VERSION=$(grep "\"version\"" package.json  | sed 's/\s*\"version\": \"\([^\"]*\).*/\1/')
DIR="release/threema-web-$VERSION"

echo "+ Create release directory..."
mkdir -p $DIR/{dist,partials,directives,node_modules,partials/messenger.receiver,troubleshoot}

echo "+ Copy code..."
cp -R index.html $DIR/
cp -R dist/app.js $DIR/dist/
cp -R public/* $DIR/
cp -R troubleshoot/* $DIR/troubleshoot/
cp -R src/partials/*.html $DIR/partials/
cp -R src/partials/messenger.receiver/*.html $DIR/partials/messenger.receiver/
cp -R src/directives/*.html $DIR/directives/

echo "+ Copy dependencies..."
targets=(
    angular/angular.js
    angular/angular-csp.css
    angular-aria/angular-aria.min.js
    angular-animate/angular-animate.min.js
    angular-sanitize/angular-sanitize.min.js
    angular-route/angular-route.min.js
    babel-es6-polyfill/browser-polyfill.min.js
    msgpack-lite/dist/msgpack.min.js
    tweetnacl/nacl-fast.min.js
    file-saver/FileSaver.min.js
    js-sha256/build/sha256.min.js
    chunked-dc/dist/chunked-dc.es5.js
    saltyrtc-client/dist/saltyrtc-client.es5.js
    saltyrtc-task-webrtc/dist/saltyrtc-task-webrtc.es5.js
    webrtc-adapter/out/adapter_no_edge.js
    webrtc-adapter/out/adapter.js
    qrcode-generator/js/qrcode.js
    angular-qrcode/angular-qrcode.js
    angularjs-scroll-glue/src/scrollglue.js
    angular-material/angular-material.min.js
    angular-material/angular-material.min.css
    croppie/croppie.min.js
    croppie/croppie.css
    autolinker/dist/Autolinker.min.js
    angular-ui-router/release/angular-ui-router.min.js
    messageformat/messageformat.min.js
    angular-translate/dist/angular-translate.min.js
    angular-translate/dist/angular-translate-loader-static-files/angular-translate-loader-static-files.min.js
    angular-translate/dist/angular-translate-interpolation-messageformat/angular-translate-interpolation-messageformat.min.js
    angular-messages/angular-messages.min.js
    sdp/sdp.js
)

for target in "${targets[@]}"; do
    install -D "node_modules/$target" "$DIR/node_modules/$target"
done

echo "+ Update version number..."
sed -i "s/\[\[VERSION\]\]/${VERSION}/g" $DIR/index.html $DIR/troubleshoot/index.html $DIR/dist/app.js $DIR/version.txt $DIR/libs/emojione/emojione.sprites.32.css

echo "+ Update permissions..."
find $DIR/ -type f -exec chmod 644 {} \;
find $DIR/ -type d -exec chmod 755 {} \;

echo "+ Put everything in an archive..."
cd release
tar cfz "../dist/threema-web-$VERSION.tar.gz" $(basename "$DIR")
cd ..

echo -e "\nDone."
