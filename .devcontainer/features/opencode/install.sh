#!/usr/bin/env bash
set -euo pipefail

# Feature options
OPENCODE_VERSION="${VERSION:-latest}"
OPENCODE_ARCH="${ARCHITECTURE:-auto}"
OPENCODE_BINARY_TYPE="${BINARYTYPE:-musl}"

echo "Installing OpenCode..."

# Determine architecture
if [ "$OPENCODE_ARCH" = "auto" ]; then
    case "$(uname -m)" in
        x86_64)
            OPENCODE_ARCH="x64"
            ;;
        aarch64 | arm64)
            OPENCODE_ARCH="arm64"
            ;;
        *)
            echo "Unsupported architecture: $(uname -m)"
            exit 1
            ;;
    esac
fi
echo "Detected/selected architecture: $OPENCODE_ARCH"

# Determine binary type suffix
if [ "$OPENCODE_BINARY_TYPE" = "musl" ]; then
    BINARY_SUFFIX="-musl"
else
    BINARY_SUFFIX=""
fi
echo "Binary type: $OPENCODE_BINARY_TYPE"

# Resolve latest version if needed
if [ "$OPENCODE_VERSION" = "latest" ]; then
    echo "Fetching latest version..."
    OPENCODE_VERSION=$(curl --proto '=https' --tlsv1.3 -LSsf "https://api.github.com/repos/sst/opencode/releases/latest" | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/')
    if [ -z "$OPENCODE_VERSION" ]; then
        echo "Failed to determine latest version"
        exit 1
    fi
fi
echo "Installing OpenCode version: $OPENCODE_VERSION"

# Download and install
TARBALL_NAME="opencode-linux-${OPENCODE_ARCH}${BINARY_SUFFIX}.tar.gz"
DOWNLOAD_URL="https://github.com/sst/opencode/releases/download/v${OPENCODE_VERSION}/${TARBALL_NAME}"
echo "Downloading from: $DOWNLOAD_URL"

curl --proto '=https' --tlsv1.3 -OLSsf "$DOWNLOAD_URL" \
    && tar xfvz "$TARBALL_NAME" -C /usr/local/bin/ \
    && rm -f "$TARBALL_NAME"

# Verify installation
if command -v opencode &> /dev/null; then
    echo "OpenCode installed successfully!"
    opencode --version || true
else
    echo "OpenCode installation failed"
    exit 1
fi
