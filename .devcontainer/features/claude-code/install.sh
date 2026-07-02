#!/usr/bin/env bash
set -euo pipefail

# Feature options
CLAUDE_CODE_VERSION="${VERSION:-latest}"

echo "Installing Claude Code as non-root user..."
su -s /bin/bash "$_REMOTE_USER" -c "bash $(pwd)/claudecode-install.sh $CLAUDE_CODE_VERSION"
