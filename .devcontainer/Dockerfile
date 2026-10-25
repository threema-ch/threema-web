FROM docker.io/node:24-trixie-slim

# Install development dependencies
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get -y install --no-install-recommends \
    build-essential pkg-config musl-tools ca-certificates \
    neovim less git curl wget unzip ripgrep locales file procps net-tools \
    bubblewrap socat \
    libicu76 \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# Locale setup
RUN echo 'en_US.UTF-8 UTF-8' > /etc/locale.gen \
 && locale-gen en_US.UTF-8 \
 && update-locale LANG=en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# Install CycloneDX CLI (requires libicu)
RUN case "$(dpkg --print-architecture)" in \
      amd64) arch=x64; sha256=bfc8b2538da86fe239bc53658bbb63c1c8c510a293c1e6891aa5bea5d3c58746 ;; \
      arm64) arch=arm64; sha256=b2e9fdf9665ef49868a2ec012171c6e785dcd69745bc5869e53e4f4bfb096a5f ;; \
      *) echo "Unsupported architecture: $(dpkg --print-architecture)"; exit 1 ;; \
    esac \
 && curl --proto '=https' --tlsv1.2 -LSsf -o /usr/local/bin/cyclonedx \
    "https://github.com/CycloneDX/cyclonedx-cli/releases/download/v0.33.1/cyclonedx-linux-${arch}" \
 && echo "${sha256}  /usr/local/bin/cyclonedx" | sha256sum -c - \
 && chmod +x /usr/local/bin/cyclonedx

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
