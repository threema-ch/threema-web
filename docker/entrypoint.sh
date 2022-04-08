#!/usr/bin/env bash
set -euo pipefail

# Patch a UserConfig variable based on an env var.
#
# Args: <var> <type>
#   var: The name of the config variable (e.g. `SALTYRTC_HOST`)
#   type: One of `string`, `number` or `boolean`
function patch_var() {
    var=$1
    type=$2
    if [ -n "${!var:-}" ]; then
        echo " > Patching $var"
        if [ "$type" = "string" ]; then
            echo "window.UserConfig.$var = '${!var}';" >> userconfig.overrides.js
        elif [ "$type" = "number" ] || [ "$type" = "boolean" ]; then
            echo "window.UserConfig.$var = ${!var};" >> userconfig.overrides.js
        else
            echo "[entrypoint.sh] Error: Invalid type \"$type\""
            exit 1
        fi
    fi
}

# Patch config file
echo "Patching userconfig file..."
cd /usr/share/nginx/html/
if [[ ! -f userconfig.overrides.js ]]; then
    echo "Error: Userconfig not found"
    exit 1
fi
echo '// Overrides by entrypoint.sh' >> userconfig.overrides.js

# SaltyRTC
patch_var "SALTYRTC_HOST" string
patch_var "SALTYRTC_PORT" number
patch_var "SALTYRTC_SERVER_KEY" string

# ICE
if [ -n "${ICE_SERVER_URLS:-}" ]; then
    IFS=',' read -ra urls <<< "${ICE_SERVER_URLS}"
    echo " > Patching ICE_SERVERS"
    echo "window.UserConfig.ICE_SERVERS = [{" >> userconfig.overrides.js
    echo "    urls: [" >> userconfig.overrides.js
    for url in "${urls[@]}"; do
        echo "        '$url'," >> userconfig.overrides.js
    done
    echo "    ]," >> userconfig.overrides.js
    if [ -n "${ICE_SERVER_USERNAME:-}" ]; then
        echo "    username: '${ICE_SERVER_USERNAME}'," >> userconfig.overrides.js
    fi
    if [ -n "${ICE_SERVER_CREDENTIAL:-}" ]; then
        echo "    credential: '${ICE_SERVER_CREDENTIAL}'," >> userconfig.overrides.js
    fi
    echo "}];" >> userconfig.overrides.js
fi

# Push
patch_var "PUSH_URL" string

# Fonts
patch_var "FONT_CSS_URL" string

# Logging/debugging
patch_var "LOG_TAG_PADDING" number
patch_var "CONSOLE_LOG_LEVEL" string
patch_var "REPORT_LOG_LEVEL" string
patch_var "REPORT_LOG_LIMIT" number
patch_var "COMPOSE_AREA_LOG_LEVEL" string
patch_var "SALTYRTC_LOG_LEVEL" string
patch_var "TIMER_LOG_LEVEL" string
patch_var "ARP_LOG_LEVEL" string
patch_var "ARP_LOG_TRACE" boolean
patch_var "MSGPACK_LOG_TRACE" boolean
patch_var "TRANSPORT_LOG_LEVEL" string
patch_var "VISUALIZE_STATE" boolean

echo "Starting Threema Web..."
exec nginx -g 'daemon off;'
