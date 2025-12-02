FROM node:20-alpine3.22

# Security labels
LABEL org.opencontainers.image.title="Threema Web Devcontainer"
LABEL security.non-root="true"

# Install development tools
RUN apk add --update \
    bash \
    curl \
    gcompat \
    git \
    neovim \
    openssl-dev \
    openssh-client \
    pkgconfig \
    ripgrep

# Create workspace directory with default ownership
# Note: VS Code Dev Containers will automatically adjust UID/GID via updateRemoteUserUID
RUN mkdir -p /code && chown node:node /code

# Switch to non-root user
USER node
ENTRYPOINT ["/bin/bash"]
