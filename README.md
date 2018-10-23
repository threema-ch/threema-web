# Threema Web

[![Build status](https://circleci.com/gh/threema-ch/threema-web.svg?style=shield&circle-token=:circle-token)](https://circleci.com/gh/threema-ch/threema-web)
[![License](https://img.shields.io/badge/License-AGPLv3-blue.svg)](https://github.com/threema-ch/threema-web/blob/master/LICENSE.txt)

Threema Web is a web client for Threema, a privacy-focussed end-to-end
encrypted mobile messenger hosted and developed in Switzerland. With Threema
Web, you can use Threema on your Desktop without compromising security.

[https://web.threema.ch/](https://web.threema.ch/)

![Screenshot](https://threema.ch/images/webclient_header.png)

Threema Web establishes a connection between Desktop and mobile device using
[WebRTC](https://webrtc.org/) (Android) or encrypted WebSockets (iOS).
Signaling and data is end-to-end encrypted with [SaltyRTC](https://saltyrtc.org/).

For more information, see the [Threema Cryptography
Whitepaper](https://threema.ch/press-files/2_documentation/cryptography_whitepaper.pdf).


## Bug Reports and Feature Requests

If you find a bug in Threema Web or want to request a new feature, feel free to
[open an issue](https://github.com/threema-ch/threema-web/issues/new) on
GitHub. Please make sure that your bug report or feature request hasn't already
been filed by using the search function.

Express your personal opinion regarding priority by reacting with :+1: in a
particular issue, such as [this one](https://github.com/threema-ch/threema-web/issues/58).
We will factor this in when scheduling what to do next.


## Development

Threema Web is written using [TypeScript](https://www.typescriptlang.org/) and
[AngularJS 1](https://www.angularjs.org/). Dependencies are managed with
[npm](https://www.npmjs.com/). You currently need Node.js 8 or later to build
Threema Web. (Note that Node.js is only a build dependency, the result is plain
old client-side JavaScript.)

Install development dependencies:

    npm install

Run the dev server:

    npm run devserver

Then open the URL in your browser:

    firefox http://localhost:9966

*(Note that this setup should not be used in production. To run Threema
Web on a server, please follow the instructions at
[docs/self_hosting.md](docs/self_hosting.md).)*


## Testing

To run tests:

    npm run build && npm run build:tests
    firefox tests/testsuite.html

To run linting checks:

    npm run lint

You can also install a pre-push hook to do the linting:

    echo -e '#!/bin/sh\nnpm run lint' > .git/hooks/pre-push
    chmod +x .git/hooks/pre-push


## Configuration

The configuration of Threema Web can be tweaked in `src/config.ts`:

**General**

- `SELF_HOSTED`: Set this to `true` if this instance of Threema Web isn't being
  hosted on `web.threema.ch`.
- `PREV_PROTOCOL_LAST_VERSION`: When the Threema Web protocol version changes,
  this can be set to the last version of Threema Web that supported  the
  previous protocol version. If set to something different than `null`, a
  message will be shown to the user if reconnecting fails.

**SaltyRTC**

- `SALTYRTC_HOST`: Set this to the hostname of the SaltyRTC server that you
  want to use. If set to `null`, the hostname will be constructed based on the
  `SALTYRTC_HOST_PREFIX` and the `SALTYRTC_HOST_SUFFIX` values.
- `SALTYRTC_PORT`: The port of the SaltyRTC server to be used.
- `SALTYRTC_SERVER_KEY`: The public permanent key of the SaltyRTC server. Set
  this value to `null` if your server does not provide a public permanent key,
  or if you don't want to verify it.

**ICE**

- `ICE_SERVERS`: Configuration object for the WebRTC STUN and ICE servers.

**Push**

- `PUSH_URL`: The server URL used to deliver push notifications to the app.


## Self Hosting

For instructions on how to host your own version of Threema Web, please refer
to [docs/self_hosting.md](docs/self_hosting.md).


## Contributing

Contributions to Threema Web are welcome! Please open a pull request with your
proposed changes.


## Security

Every Threema Web release will be tagged. The git tags are cryptographically
signed using the following PGP key:

    pub   rsa4096 2016-09-06 [SC] [expires: 2026-09-04]
          E7AD D991 4E26 0E8B 35DF  B506 65FD E935 573A CDA6
    uid           Threema Signing Key <dev@threema.ch>

If you discover a security issue in the Threema Web, please follow responsible
disclosure and report it directly to `security@threema.ch` instead of opening
an issue on Github.

    pub   rsa4096 2017-02-08 [SC] [expires: 2022-02-07]
          677E 0E97 1669 53B3 2620  D95C 71B9 C6BA C55A 9855
    uid           Threema Security <security@threema.ch>

You can find both public keys and their proofs [on
keybase](https://keybase.io/threema).


## License

Threema Web license:

    Threema Web.

    Copyright © 2016-2018 Threema GmbH (https://threema.ch/).

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program. If not, see <http://www.gnu.org/licenses/>.

For third party library licenses, see `LICENSE-3RD-PARTY.txt`.
