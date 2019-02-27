#!/bin/sh
set -euo pipefail

# Patch config file
echo "Patching config file..."
cd /usr/share/nginx/html/
if [ ! -z "$SALTYRTC_HOST" ]; then
    sed -i "s/SALTYRTC_HOST: null,/SALTYRTC_HOST: '${SALTYRTC_HOST}',/g" dist/app.js
fi
sed -i "s/SALTYRTC_PORT: [^,]*,/SALTYRTC_PORT: ${SALTYRTC_PORT},/g" dist/app.js
sed -i "s/SALTYRTC_SERVER_KEY: '[^']*',/SALTYRTC_SERVER_KEY: '${SALTYRTC_SERVER_KEY}',/g" dist/app.js

echo "Starting Threema Web..."
exec nginx -g 'daemon off;'
