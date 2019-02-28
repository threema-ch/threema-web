# Running Threema Web with Docker


## Building the Image

To build the Docker image:

    $ docker build . -t example/threema-web:latest


## Running the Image

To run the Docker image:

    $ docker run --rm -p 8080:80 threema/threema-web

Now you can open `http://localhost:8080/` in your browser to use Threema Web.

**IMPORTANT:** Note that this Dockerfile does not contain TLS termination. Make
sure to serve Threema Web only via https, behind a reverse proxy like Nginx. We
also recommend to enable HSTS, HPKP, CSP and other available security
mechanisms in your web server.


## Config Variables

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `SALTYRTC_HOST` | null | The SaltyRTC signaling server hostname |
| `SALTYRTC_PORT` | 443 | The SaltyRTC signaling server port |
| `SALTYRTC_SERVER_KEY` | "b1337fc8402f7db8ea639e05ed05d65463e24809792f91eca29e88101b4a2171" | The SaltyRTC signaling server public key |
