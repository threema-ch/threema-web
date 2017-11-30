# Self Hosting

Some users might want to host their own Threema Web instance. Here is a quick
overview on how to achieve that.

The following components can be self-hosted:

- Threema Web
- SaltyRTC Server
- STUN / TURN Server

The push relay server could in theory be self-hosted too, but it won't help as
the GCM API Key required to dispatch push notifications is not public.

If you have questions, please [open an
issue](https://github.com/threema-ch/threema-web/issues) on Github.

## Threema Web

Threema Web is a web application written in TypeScript with AngularJS 1. All
that is required to host it is a web server that can deliver static content via
https. We recommend using Nginx. Additionally, to build the release version
yourself, a recent version of npm is required.

### Building

You can get the source code from Github:

    git clone https://github.com/threema-ch/threema-web.git

First, adjust the configuration in `src/config.ts`:

- Set `SELF_HOSTED` to `true`
- If you host your own SaltyRTC server, adjust the `SALTYRTC_*` variables
- If you host your own STUN / TURN server, adjust the `ICE_SERVERS` variable

Then, build the release version of Threema Web:

    npm install --production
    npm run dist

Finally, unpack the `dist/threema-web-[VERSION].tar.gz` archive to your web server directory.
Make sure to serve Threema Web only via https. We also recommend to enable
HSTS, HPKP, CSP and other available security mechanisms in your web server.

### Downloading pre-built version

If you don't want to build Threema Web yourself, you can also [download a
pre-built release](https://github.com/threema-ch/threema-web/releases) with the
`SELF_HOSTED` variable set to `true`, configured to use the Threema
SaltyRTC/STUN/TURN servers.

Cryptographic signatures are provided for the downloads.

## SaltyRTC Server

For instructions on how to run your own SaltyRTC server, see
https://github.com/saltyrtc/saltyrtc-server-python

## STUN / TURN Server

You can run any WebRTC-compliant STUN / TURN server, e.g.
[coturn](https://coturn.github.io).

## Push Relay

While you could in theory host your own version of the push server, it won't
help much since the GCM API Key required to dispatch push notifications to the
Threema Android app is not public.

You can review the code on Github though: https://github.com/threema-ch/push-relay
