# Dockerfile for Threema Web, based on the nginx alpine image.
#
# WARNING: This Dockerfile does not include TLS termination. Make sure to run
#          the container behind a reverse proxy (e.g. Nginx) that does proper
#          TLS termination.

# First, build Threema Web in a node container

FROM docker.io/node:14 AS builder
ENV NODE_ENV=production

COPY . /opt/threema-web/
WORKDIR /opt/threema-web/

RUN sed -i "s/SELF_HOSTED: [^,]*,/SELF_HOSTED: true,/g" src/config.ts

RUN npm ci
RUN npm run dist -- d

# Then, transfer the build artifacts to a minimal nginx container

FROM docker.io/nginx:1.21-alpine

RUN apk add --update bash

RUN rm /usr/share/nginx/html/*
COPY --from=builder /opt/threema-web/release/threema-web-* /usr/share/nginx/html/
COPY docker/entrypoint.sh /usr/local/bin/

EXPOSE 80

# Set better defaults for production
ENV VISUALIZE_STATE=false \
    CONSOLE_LOG_LEVEL=info

CMD ["/bin/bash", "/usr/local/bin/entrypoint.sh"]
