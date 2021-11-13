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
also recommend to enable HSTS, HPKP, CSP and other available security
mechanisms in your web server.


## Config Variables

All these config variables are optional, and will fall back to the default
values used by Threema if not set.

- `SALTYRTC_HOST`: The SaltyRTC signaling server hostname
- `SALTYRTC_PORT`: The SaltyRTC signaling server port
- `SALTYRTC_SERVER_KEY`: The SaltyRTC signaling server public key
- `PUSH_URL`: The server URL used to deliver push notifications to the app
- `FONT_CSS_URL`: The Lab Grotesque font URL, to be used if you bought your own
  font license
- `ICE_SERVER_URLS`: A comma separated list of ICE URLs, prefixed by either
  `turn:` or `turns:`
- `ICE_SERVER_USERNAME`: The ICE username
- `ICE_SERVER_CREDENTIAL`: The ICE password
