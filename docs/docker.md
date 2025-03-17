# Running Threema Web with Docker

A Docker image with Threema Web is published on Docker Hub at
[`threema/threema-web`](https://hub.docker.com/r/threema/threema-web).

Alternatively you can build the image yourself:

    $ docker build . -t threema/threema-web:master

To run the Docker image:

    $ docker run --rm -p 8080:80 threema/threema-web:master

Now you can open `http://localhost:8080/` in your browser to use Threema Web.

**IMPORTANT:** Note that this Dockerfile does not contain TLS termination. Make
sure to serve Threema Web only via https, behind a reverse proxy like Nginx. We
also recommend to enable HSTS, CSP and other available security
mechanisms in your web server.


## Config Variables

### Env Vars

All userconfig variables (as documented in the README) can be overridden with
env variables. They are all optional, and will fall back to the default values
used by Threema if not set.

*Note:* While most variables hold "simple" values like strings or integers, there
are some exceptions:

- `ICE_SERVERS`: This configuration object can be configured with the following three env vars:
  - `ICE_SERVER_URLS`: A comma separated list of ICE URLs, prefixed by either
    `turn:` or `turns:`
  - `ICE_SERVER_USERNAME`: The ICE username
  - `ICE_SERVER_CREDENTIAL`: The ICE password

### Userconfig Overrides

Alternatively, mount a JS file to
`/usr/share/nginx/html/userconfig.overrides.js`. This file may override config
variables, see `src/userconfig.overrides.js.example`. If you use a userconfig
override file, env variables will be ignored.
