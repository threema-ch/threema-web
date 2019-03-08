# Running Threema Web with Docker

A Docker image with Threema Web is published on Docker Hub at
[`threema/threema-web`](https://hub.docker.com/r/threema/threema-web).

Alternatively you can build the image yourself:

    $ docker build . -t threema/threema-web:v2.1

To run the Docker image:

    $ docker run --rm -p 8080:80 threema/threema-web

Now you can open `http://localhost:8080/` in your browser to use Threema Web.

**IMPORTANT:** Note that this Dockerfile does not contain TLS termination. Make
sure to serve Threema Web only via https, behind a reverse proxy like Nginx. We
also recommend to enable HSTS, HPKP, CSP and other available security
mechanisms in your web server.


## Config Variables

- `SALTYRTC_HOST`: The SaltyRTC signaling server hostname (default `null`)
- `SALTYRTC_PORT`: The SaltyRTC signaling server port (default `443`)
- `SALTYRTC_SERVER_KEY`: The SaltyRTC signaling server public key
  (default `"b1337fc8402f7db8ea639e05ed05d65463e24809792f91eca29e88101b4a2171"`)
