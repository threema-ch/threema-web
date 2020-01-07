/**
 * Create peer connection and bind events to be logged.
 * @param role The role (offerer or answerer).
 * @returns {RTCPeerConnection}
 */
function createPeerConnection(role) {
    // Detect safari
    const uagent = window.navigator.userAgent.toLowerCase();

    // Determine ICE servers
    const iceServers = [
        'turn:turn-ff.threema.ch:443?transport=udp',
        'turn:turn-ff.threema.ch:443?transport=tcp',
        'turns:turn-ff.threema.ch:443',
    ];
    console.debug('Using ICE servers: ' + iceServers);
    const configuration = {iceServers: [{
        urls: iceServers,
        username: 'threema-angular-test',
        credential: 'VaoVnhxKGt2wD20F9bTOgiew6yHQmj4P7y7SE4lrahAjTQC0dpnG32FR4fnrlpKa',
    }]};

    // Create peer connection
    const pc = new RTCPeerConnection(configuration);
    pc.addEventListener('negotiationneeded', async () => {
        console.info(role, 'Negotiation needed');
    });
    pc.addEventListener('signalingstatechange', () => {
        console.debug(role, 'Signaling state:', pc.signalingState);
    });
    pc.addEventListener('iceconnectionstatechange', () => {
        console.debug(role, 'ICE connection state:', pc.iceConnectionState);
    });
    pc.addEventListener('icegatheringstatechange', () => {
        console.debug(role, 'ICE gathering state:', pc.iceGatheringState);
    });
    pc.addEventListener('connectionstatechange', () => {
        console.debug(role, 'Connection state:', pc.connectionState);
    });
    pc.addEventListener('icecandidate', (event) => {
        console.debug(role, 'ICE candidate:', event.candidate);
    });
    pc.addEventListener('icecandidateerror', (event) => {
        console.error(role, 'ICE candidate error:', event);
    });
    pc.addEventListener('datachannel', (event) => {
        console.info(role, 'Incoming data channel:', event.channel.label);
    });
    return pc;
}

/**
 * Create a data channel and bind events to be logged.
 * @param pc The peer connection instance.
 * @param role The role (offerer or answerer).
 * @param label The label of the data channel.
 * @param options The options passed to the RTCDataChannel instance.
 * @returns {RTCDataChannel}
 */
function createDataChannel(pc, role, label, options) {
    // Create data channel and bind events
    const dc = pc.createDataChannel(label, options);
    dc.addEventListener('open', () => {
        console.info(role, label, 'open');
    });
    dc.addEventListener('close', () => {
        console.info(role, label, 'closed');
    });
    dc.addEventListener('error', () => {
        console.error(role, label, 'error:', error);
    });
    dc.addEventListener('bufferedamountlow', () => {
        console.debug(role, label, 'buffered amount low:', dc.bufferedAmount);
    });
    dc.addEventListener('message', (event) => {
        console.debug(role, label, `incoming message:`, event.data);
    });
    return dc;
}

/**
 * Connect the peer connection instances to each other.
 * @param offerer The offerer's peer connection instance.
 * @param answerer The answerer's peer connection instance.
 * @returns {Promise<void>} resolves once connected.
 */
async function connectPeerConnections(offerer, answerer) {
    const pcs = [offerer, answerer];

    // Forward ICE candidates to each other
    for (const [me, other] of [pcs, pcs.slice().reverse()]) {
        me.addEventListener('icecandidate', (event) => {
            if (event.candidate !== null) {
                other.addIceCandidate(event.candidate);
            }
        });
    }

    // Promise for the peer connections being connected
    const [offererConnected, answererConnected] = pcs.map((pc) => {
        return new Promise((resolve, reject) => {
            pc.addEventListener('iceconnectionstatechange', () => {
                switch (pc.iceConnectionState) {
                    case 'connected':
                    case 'completed':
                        resolve(pc.iceConnectionState);
                        break;
                    case 'closed':
                    case 'failed':
                        reject(pc.iceConnectionState);
                        break;
                }
            });
        });
    });

    // Start the offer/answer dance
    const signalingDone = new Promise((resolve, reject) => {
        offerer.addEventListener('negotiationneeded', async () => {
            try {
                console.debug('Start signaling');
                const offer = await offerer.createOffer();
                await offerer.setLocalDescription(offer);
                await answerer.setRemoteDescription(offer);
                const answer = await answerer.createAnswer();
                await answerer.setLocalDescription(answer);
                await offerer.setRemoteDescription(answer);
                console.debug('Signaling complete');
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });

    // Wait until all is done
    await Promise.all([
        offererConnected,
        answererConnected,
        signalingDone,
    ]);
}

// Here beginneth the Angular stuff
const app = angular.module('troubleshoot', ['ngSanitize']);

app.filter('osName', function() {
    return function(id) {
        switch (id) {
            case 'android':
                return 'Android';
            case 'ios':
                return 'iOS';
            default:
                return '?';
        }
    }
});

app.component('check', {
    bindings: {
        result: '<',
        textNo: '@',
    },
    template: `
        <div class="status status-no" ng-if="$ctrl.result.state === 'no'">
            <i class="material-icons md-36" aria-label="No">error</i> <span class="text">No</span>
            <p class="small" ng-if="$ctrl.textNo" ng-bind-html="$ctrl.textNo"></p>
        </div>
        <div class="status status-yes" ng-if="$ctrl.result.state === 'yes'">
            <i class="material-icons md-36" aria-label="Yes">check_circle</i> <span class="text">Yes</span>
        </div>
        <div class="status status-unknown" ng-if="$ctrl.result.state === 'unknown'">
            <i class="material-icons md-36" aria-label="Unknown">help</i> <span class="text">Unknown</span>
        </div>
        <div class="status status-test" ng-if="$ctrl.result.state === 'loading'">
            <img src="loading.gif" alt="Loading..." aria-label="Loading">
        </div>
        <div class="logs" ng-if="$ctrl.result.showLogs">
            <p>Results:</p>
            <div class="log-data">
                <p ng-repeat="log in $ctrl.result.logs">{{ log }}</p>
            </div>
        </div>
    `,
});

const SIGNALING_DATA_CHANNEL_LABEL = 'saltyrtc';
const APP_DATA_CHANNEL_LABEL = 'therme';

app.controller('ChecksController', function($scope, $timeout) {
    // Initialize state
    this.state = 'init';  // Either 'init' or 'check'
    this.os = null;  // Either 'android' or 'ios'

    // Initialize results
    // Valid states: yes, no, unknown, loading
    this.resultJs = {
        state: 'unknown',
        showLogs: false,
    };
    this.resultLs = {
        state: 'unknown',
        showLogs: false,
    };
    this.resultDn = {
        state: 'unknown',
        showLogs: false,
    };
    this.resultWs = {
        state: 'unknown',
        showLogs: false,
        logs: [],
    };
    this.resultDc = {
        state: 'unknown',
        showLogs: false,
        logs: [],
    };
    this.resultTurn = {
        state: 'unknown',
        showLogs: false,
        logs: [],
    };

    // Start checks
    this.start = (os) => {
        this.os = os;
        this.state = 'check';
        this.doChecks();
    };

    // Local store can be used
    const localStorageAvailable = () => {
        const test = 'test';
        try {
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            this.resultLs.state = 'yes';
        } catch(e) {
            this.resultLs.state = 'no';
        }
    };

    // The desktop notification API is available
    const desktopNotificationsAvailable = () => {
        this.resultDn.state = 'Notification' in window ? 'yes' : 'no';
    };

    // A WebSocket connection can be established to the SaltyRTC server
    const canEstablishWebSocket = () => {
        const subprotocol = 'v1.saltyrtc.org';
        const path = 'ffffffffffffffff00000000000000000000000000000000ffffffffffffffff';
        this.resultWs.showLogs = true;
        const ws = new WebSocket('wss://saltyrtc-ff.threema.ch/' + path, subprotocol);
        ws.binaryType = 'arraybuffer';
        ws.addEventListener('open', () => {
            $scope.$apply(() => {
                this.resultWs.logs.push('Connected');
            });
        });
        ws.addEventListener('message', (event) => {
            console.log('Message from server ', event.data);

            const success = () => {
                $scope.$apply(() => {
                    this.resultWs.state = 'yes';
                    this.resultWs.logs.push('Received server-hello message');
                });
                ws.close(1000);
            };
            const fail = (msg) => {
                $scope.$apply(() => {
                    this.resultWs.state = 'no';
                    console.error(msg);
                    this.resultWs.logs.push(`Invalid server-hello message (${msg})`);
                });
                ws.close(1000);
            };

            // This should be the SaltyRTC server-hello message.
            const bytes = new Uint8Array(event.data);
            console.log('Message bytes:', bytes);

            // Validate length
            if (bytes.length < 81) {
                return fail(`Invalid length: ${bytes.length}`);
            }

            // Split up message
            const nonce = bytes.slice(0, 24);
            const data = bytes.slice(24);

            // Validate nonce
            if (nonce[16] !== 0) {
                return fail('Invalid nonce (source != 0)');
            }
            if (nonce[17] !== 0) {
                return fail('Invalid nonce (destination != 0)');
            }
            if (nonce[18] !== 0 || nonce[19] !== 0) {
                return fail('Invalid nonce (overflow != 0)');
            }

            // Data should start with 0x82 (fixmap with 2 entries) followed by a string
            // with either the value "type" or "key".
            if (data[0] !== 0x82) {
                return fail('Invalid data (does not start with 0x82)');
            }
            if (data[1] === 0xa3 && data[2] === 'k'.charCodeAt(0) && data[3] === 'e'.charCodeAt(0) && data[4] === 'y'.charCodeAt(0)) {
                return success();
            }
            if (data[1] === 0xa4 && data[2] === 't'.charCodeAt(0) && data[3] === 'y'.charCodeAt(0) && data[4] === 'p'.charCodeAt(0) && data[5] === 'e'.charCodeAt(0)) {
                return success();
            }

            return fail('Invalid data (bad map key)');
        });
        ws.addEventListener('error', (event) => {
            console.error('WS error:', event);
            $scope.$apply(() => {
                this.resultWs.state = 'no';
                this.resultWs.logs.push('Error');
            });
        });
        ws.addEventListener('close', () => {
            $scope.$apply(() => {
                this.resultWs.logs.push('Connection closed');
            });
        });
        this.resultWs.logs.push('Connecting');
    };

    // A peer-to-peer connection can be established and a data channel can be
    // used to send data.
    const canEstablishDataChannels = () => {
        this.resultDc.showLogs = true;

        // Check for the RTCPeerConnecton object
        if (window.RTCPeerConnection) {
            this.resultDc.logs.push('RTCPeerConnection available');
        } else {
            this.resultDc.state = 'no';
            this.resultDc.logs.push('RTCPeerConnection unavailable');
            return;
        }

        // Check for the RTCDataChannel object
        if (window.RTCPeerConnection && (new RTCPeerConnection()).createDataChannel) {
            this.resultDc.logs.push('RTCDataChannel available');
        } else {
            this.resultDc.state = 'no';
            this.resultDc.logs.push('RTCDataChannel unavailable');
            return;
        }

        // Create two peer connection instances
        let offerer, answerer;
        try {
            [offerer, answerer] = [
                createPeerConnection('Offerer'),
                createPeerConnection('Answerer'),
            ];
        } catch (error) {
            this.resultDc.state = 'no';
            this.resultDc.logs.push(`Peer connection could not be created (${error.toString()})`);
            return;
        }

        // Async phase begins
        this.resultDc.state = 'loading';
        const done = (success, message) => {
            if (this.resultDc.state === 'loading') {
                this.resultDc.state = success ? 'yes' : 'no';
            }
            this.resultDc.logs.push(message);
            offerer.close();
            answerer.close();
        };

        // Connect the peer connection instances to each other
        let peerConnectionsEstablished;
        try {
            peerConnectionsEstablished = connectPeerConnections(offerer, answerer);
        } catch (error) {
            return done(false, `Peer connections could not be connected (${error.toString()})`);
        }
        peerConnectionsEstablished
            .then(() => {
                $scope.$apply(() => this.resultDc.logs.push('Connected'));
            })
            .catch((error) => {
                $scope.$apply(() => done(false, `Cannot connect (error: ${error.toString()})`));
            });

        // Create data channels for each peer connection instance. We mimic
        // what SaltyRTC and the web client would do here:
        //
        // - create a negotiated data channel with id 0 and send once open, and
        // - create a data channel for the ARP on the offerer's side.
        const canUseDataChannel = (role, dc, resolve, reject) => {
            dc.addEventListener('open', () => {
                $scope.$apply(() => {
                    this.resultDc.logs.push(`${role}: Channel '${dc.label}' open`);
                    try {
                        dc.send('hello!');
                    } catch (error) {
                        this.resultDc.logs.push(
                            `${role}: Channel '${dc.label}' was unable to send (${error.toString()})`);
                        reject();
                    }
                });
            });
            dc.addEventListener('close', () => {
                $scope.$apply(() => {
                    if (this.resultDc.state  === 'loading') {
                        this.resultDc.logs.push(`${role}: Channel '${dc.label}' closed`);
                        reject();
                    }
                });
            });
            dc.addEventListener('error', () => {
                $scope.$apply(() => {
                    this.resultDc.logs.push(`${role}: Channel '${dc.label}' error (${error.message})`);
                    reject();
                });
            });
            dc.addEventListener('message', (event) => {
                $scope.$apply(() => {
                    if (event.data === 'hello!') {
                        this.resultDc.logs.push(`${role}: Channel '${dc.label}' working`);
                        resolve();
                    } else {
                        this.resultDc.logs.push(
                            `${role}: Channel '${dc.label}' received an unexpected message ('${event.data}')`);
                        reject();
                    }
                });
            });
        };
        try {
            Promise.all([
                new Promise((resolve, reject) => {
                    const dc = createDataChannel(
                        offerer, 'Offerer', SIGNALING_DATA_CHANNEL_LABEL, {id: 0, negotiated: true});
                    canUseDataChannel('Offerer', dc, resolve, reject);
                }),
                new Promise((resolve, reject) => {
                    const dc = createDataChannel(
                        answerer, 'Answerer', SIGNALING_DATA_CHANNEL_LABEL, {id: 0, negotiated: true});
                    canUseDataChannel('Answerer', dc, resolve, reject);
                }),
                // Mimic handover by waiting until the peer connection has
                // been established (and an additional second).
                peerConnectionsEstablished
                    .then(() => new Promise((resolve) => setTimeout(resolve, 1000)))
                    .then(() => new Promise((resolve, reject) => {
                        const dc = createDataChannel(offerer, 'Offerer', APP_DATA_CHANNEL_LABEL);
                        canUseDataChannel('Offerer', dc, resolve, reject);
                    })),
                new Promise((resolve, reject) => {
                    answerer.addEventListener('datachannel', (event) => {
                        $scope.$apply(() => {
                            const dc = event.channel;
                            if (dc.label !== APP_DATA_CHANNEL_LABEL) {
                                return done(false, `Unexpected 'datachannel' event (channel: ${dc.label})`);
                            } else {
                                canUseDataChannel('Answerer', dc, resolve, reject);
                            }
                        });
                    });
                }),
            ])
                .then(() => {
                    $scope.$apply(() => done(true, 'Data channels open and working'));
                })
                .catch((error) => {
                    $scope.$apply(() => done(false, `Cannot connect (error: ${error.toString()})`));
                });
        } catch (error) {
            return done(false, `Data channels could not be created (${error.toString()})`);
        }
    };

    const haveTurnCandidates = () => {
        this.resultTurn.showLogs = true;

        // Create a peer connection instance
        let pc;
        try {
            pc = createPeerConnection('TURN');
        } catch (error) {
            this.resultTurn.state = 'no';
            this.resultTurn.logs.push(`Peer connection could not be created (${error.toString()})`);
            return;
        }

        // Async phase begins
        this.resultTurn.state = 'loading';
        const done = (success, message) => {
            if (this.resultTurn.state === 'loading') {
                this.resultTurn.state = success ? 'yes' : 'no';
            }
            this.resultTurn.logs.push(message);
            pc.close();
        };

        // Just trigger negotiation...
        try {
            pc.createDataChannel('kick-the-peer-connection-to-life');
        } catch (error) {
            return done(false, `Data channel could not be created (${error.toString()})`);
        }

        // Create timeout
        const timer = $timeout(() => this.resultTurn.state = 'no', 10000);

        // Create and apply local offer (async)
        (async () => {
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
            } catch (error) {
                $scope.$apply(() => done(false, `Offer could not be created (${error.toString()})`));
            }
        })();

        // Check for TURN ICE candidates
        pc.addEventListener('icecandidate', (event) => {
            $scope.$apply(() => {
                // Check for end-of-candidates indicator
                if (event.candidate === null) {
                    $timeout.cancel(timer);
                    return done(false, 'Done');
                }

                // Handle ICE candidate
                if (event.candidate.candidate) {
                    const candidate = SDPUtils.parseCandidate(event.candidate.candidate);
                    let info = `[${candidate.type}] ${candidate.ip}:${candidate.port}`;
                    if (candidate.relatedAddress) {
                        info += ` via ${candidate.relatedAddress}`;
                    }
                    info += ` (${candidate.protocol})`;

                    // Relay candidate found: Cancel timer
                    if (candidate.type === 'relay') {
                        $timeout.cancel(timer);
                        return done(true, info);
                    }

                    // Normal candidate: Log and continue
                    this.resultTurn.logs.push(info);
                } else {
                    this.resultTurn.logs.push(`Invalid candidate (${event.candidate.candidate})`);
                }
            });
        });
    };

    // Run all the checks and update results
    this.doChecks = () => {
        // Check for JS
        this.resultJs.state = 'yes';

        // Check for LocalStorage
        localStorageAvailable();

        // Check for desktop notifications
        desktopNotificationsAvailable();

        // Check for data channel connectivity
        canEstablishDataChannels();

        // Check for WebSocket connectivity
        canEstablishWebSocket();

        // Check for TURN connectivity
        haveTurnCandidates();
    };

});
