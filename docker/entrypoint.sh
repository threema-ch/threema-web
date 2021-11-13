#!/bin/sh
set -euo pipefail

# Patch config file
echo "Patching userconfig file..."
cd /usr/share/nginx/html/
if [[ ! -f userconfig.js ]]; then
    echo "Error: Userconfig not found"
    exit 1
fi
echo '// Overrides by entrypoint.sh' >> userconfig.js
if [ ! -z "${SALTYRTC_HOST:-}" ]; then
    echo "window.UserConfig.SALTYRTC_HOST = '${SALTYRTC_HOST}';" >> userconfig.js
fi
if [ ! -z "${SALTYRTC_PORT:-}" ]; then
    echo "window.UserConfig.SALTYRTC_PORT = ${SALTYRTC_PORT};" >> userconfig.js
fi
if [ ! -z "${SALTYRTC_SERVER_KEY:-}" ]; then
    echo "window.UserConfig.SALTYRTC_SERVER_KEY = '${SALTYRTC_SERVER_KEY}';" >> userconfig.js
fi

# Add nginx mime type for wasm
# See https://trac.nginx.org/nginx/ticket/1606
if ! grep -q application/wasm "/etc/nginx/mime.types"; then
    sed -i '2aapplication/wasm wasm;' /etc/nginx/mime.types
fi

echo "Starting Threema Web..."
exec nginx -g 'daemon off;'
