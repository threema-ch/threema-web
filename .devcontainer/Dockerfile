FROM docker.io/node:24-trixie-slim

# Install development dependencies
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get -y install --no-install-recommends \
    build-essential pkg-config musl-tools ca-certificates \
    neovim less git curl wget unzip ripgrep locales file procps net-tools \
    bubblewrap socat \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# Locale setup
RUN echo 'en_US.UTF-8 UTF-8' > /etc/locale.gen \
 && locale-gen en_US.UTF-8 \
 && update-locale LANG=en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# Create directories with user ownership
# Note: VS Code Dev Containers will automatically adjust UID/GID via updateRemoteUserUID
RUN mkdir -p /code && chown node:node /code

# Switch to non-root user
USER node

# Create persistent config directory with default ownership
RUN mkdir -p ~/.config-persistent/

# Create Claude Code directories with default ownership
RUN mkdir -p ~/.config/claude/

# Create OpenCode directories with default ownership
RUN mkdir -p ~/.config/opencode/ \
 && mkdir -p ~/.local/share/opencode/

ENTRYPOINT ["/bin/bash"]
