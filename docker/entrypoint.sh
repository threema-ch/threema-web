#!/bin/sh
set -euo pipefail

# Patch config file
echo "Patching config file..."
cd /usr/share/nginx/html/
if [ ! -z "$SALTYRTC_HOST" ]; then
    sed -i -E "s/SALTYRTC_HOST:\s*null,/SALTYRTC_HOST:'${SALTYRTC_HOST}',/g" *.bundle.js
fi
sed -i -E "s/SALTYRTC_PORT:\s*[^,]*,/SALTYRTC_PORT:${SALTYRTC_PORT},/g" *.bundle.js
sed -i -E "s/SALTYRTC_SERVER_KEY:\s*\"[^\"]*\",/SALTYRTC_SERVER_KEY:\"${SALTYRTC_SERVER_KEY}\",/g" *.bundle.js

echo "Starting Threema Web..."
exec nginx -g 'daemon off;'
