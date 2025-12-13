# Threema Web

[![Build status](https://img.shields.io/circleci/build/github/threema-ch/threema-web/master)](https://circleci.com/gh/threema-ch/threema-web)
[![License](https://img.shields.io/badge/License-AGPLv3-blue.svg)](https://github.com/threema-ch/threema-web/blob/master/LICENSE.txt)
[![Docker Image](https://img.shields.io/badge/docker%20image-threema%2Fthreema--web-yellow.svg)](https://hub.docker.com/r/threema/threema-web)

> :warning: **Note:** Threema Web is in maintenance mode while we are working
> on [Threema for Desktop 2.0](https://three.ma/md), which should resolve some
> of the long-standing issues we were having with Threema Web. We will still do
> regular maintenance and fix critical bugs, but for now there will be no major
> new features or non-critical bugfixes. See
> https://github.com/threema-ch/threema-web/pull/996 for more details.

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

If you find a bug in Threema Web, feel free to [open an
issue](https://github.com/threema-ch/threema-web/issues/new) on GitHub. Please
make sure that your bug report hasn’t already been filed by using the search
function.

Note that Threema Web is in maintenance mode while we are working on a new
solution that should resolve some of the long-standing issues we were having
with Threema Web. We will still do regular maintenance and fix critical bugs,
but for now there will be no major new features or non-critical bugfixes.  See
https://github.com/threema-ch/threema-web/pull/996 for details.


## Beta Testing

We may occasionally deploy experimental branches on
[https://web-beta.threema.ch](https://web-beta.threema.ch) which you are
encouraged to test. If you encounter problems, please
[open an issue](https://github.com/threema-ch/threema-web/issues/new) and
include the experiment’s version number (e.g. `1.2.3-experiment-beta4`).


## Translating

If you want to help translate Threema Web to your language, please check out
[`TRANSLATING.md`](./TRANSLATING.md)!


## Protocol

The protocol used to communicate between the Threema app and Threema Web
is documented [here](https://threema-ch.github.io/app-remote-protocol/).


## Development

Threema Web is written using [TypeScript](https://www.typescriptlang.org/) and
[AngularJS 1](https://www.angularjs.org/). Dependencies are managed with
[npm](https://www.npmjs.com/). You currently need Node.js 24 to build Threema
Web. (Note that Node.js is only a build dependency, the result is plain old
client-side JavaScript.)

If your default NodeJS version is not 24, use nvm to install it:

    nvm install
    nvm use

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

To run unit tests:

    npm run build:unittests && npm run testserver
    firefox http://localhost:7777/tests/testsuite.html

To run UI tests:

    npm run build  # Required for CSS to be rebuilt
    npm run test:ui <browser>

For example:

    npm run test:ui firefox
    npm run test:ui chrome

You can also filter the test cases:

    npm run test:ui firefox emoji

To run linting checks:

    npm run lint

You can also install a pre-push hook to do the linting:

    echo -e '#!/bin/sh\nnpm run lint' > .git/hooks/pre-push
    chmod +x .git/hooks/pre-push


## Configuration

The configuration of Threema Web can be tweaked in
[`src/config.ts`](src/config.ts) and [`src/userconfig.js`](src/userconfig.js) /
[`src/userconfig.overrides.js`](src/userconfig.overrides.js) (see
[`src/userconfig.overrides.js.example`](src/userconfig.overrides.js.example).
The config variables are defined at build time, and the userconfig variables
can be modified at runtime. Please refer to those files for documentation on
what variables exist and how to configure them.

In the Docker image, all userconfig variables can be overridden using env
variables. See [`docs/docker.md`](docs/docker.md) for more information.


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

The public key can be found [on Keybase](https://keybase.io/threema).

If you discover a security issue in Threema, please adhere to the coordinated
vulnerability disclosure model. To be eligible for a bug bounty, please [file a
report on GObugfree](https://app.gobugfree.com/programs/threema) (where all the
details, including the bounty levels, are listed). If you’re not interested in
the bug bounty program, you can contact us via Threema or by email; for contact
details, see [threema.ch/contact](https://threema.ch/en/contact) (section
“Security”).


## License

Threema Web license:

    Threema Web.

    Copyright © 2016-2025 Threema GmbH (https://threema.ch/).

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
