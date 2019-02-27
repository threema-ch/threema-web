# First, build Threema Web in a node container

FROM node:10 AS builder

COPY . /opt/threema-web/
WORKDIR /opt/threema-web/

ENV NODE_ENV=production
RUN npm ci
RUN npm run dist

# Then, transfer the build artifacts to a minimal nginx container

FROM nginx:1.15-alpine

RUN rm /usr/share/nginx/html/*
COPY --from=builder /opt/threema-web/release/threema-web-* /usr/share/nginx/html/
