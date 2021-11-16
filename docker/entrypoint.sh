#!/usr/bin/env bash
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
if [ ! -z "${PUSH_URL:-}" ]; then
    echo "window.UserConfig.PUSH_URL = '${PUSH_URL}';" >> userconfig.js
fi
if [ ! -z "${FONT_CSS_URL:-}" ]; then
    echo "window.UserConfig.FONT_CSS_URL = '${FONT_CSS_URL}';" >> userconfig.js
fi
if [ ! -z "${ICE_SERVER_URLS:-}" ]; then
    IFS=',' read -ra urls <<< "${ICE_SERVER_URLS}"
    echo "window.UserConfig.ICE_SERVERS = [{" >> userconfig.js
    echo "    urls: [" >> userconfig.js
    for url in "${urls[@]}"; do
        echo "        '$url'," >> userconfig.js
    done
    echo "    ]," >> userconfig.js
    if [ ! -z "${ICE_SERVER_USERNAME:-}" ]; then
        echo "    username: '${ICE_SERVER_USERNAME}'," >> userconfig.js
    fi
    if [ ! -z "${ICE_SERVER_CREDENTIAL:-}" ]; then
        echo "    credential: '${ICE_SERVER_CREDENTIAL}'," >> userconfig.js
    fi
    echo "}];" >> userconfig.js
fi

# Add nginx mime type for wasm
# See https://trac.nginx.org/nginx/ticket/1606
if ! grep -q application/wasm "/etc/nginx/mime.types"; then
    sed -i '2aapplication/wasm wasm;' /etc/nginx/mime.types
fi

echo "Starting Threema Web..."
exec nginx -g 'daemon off;'
