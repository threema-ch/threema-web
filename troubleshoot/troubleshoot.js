var app = angular.module('troubleshoot', ['ngSanitize']);

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
    this.resultPc = {
        state: 'unknown',
        showLogs: false,
    };
    this.resultDc = {
        state: 'unknown',
        showLogs: false,
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

    // Helper: Local storage
    function localStorageAvailable() {
        var test = 'test';
        try {
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch(e) {
            return false;
        }
    }

    // Helper: Desktop notifications
    function desktopNotificationsAvailable() {
        return 'Notification' in window;
    }

    // Helper: Peer connection
    function peerConnectionAvailable() {
        return window.RTCPeerConnection;
    }

    // Helper: Data channel
    function dataChannelAvailable() {
        return window.RTCPeerConnection && (new RTCPeerConnection()).createDataChannel;
    }

    // Run all the checks and update results
    this.doChecks = () => {
        // Check for JS
        this.resultJs.state = 'yes';

        // Check for LocalStorage
        if (localStorageAvailable()) {
            this.resultLs.state = 'yes';
        } else {
            this.resultLs.state = 'no';
        }

        // Check for desktop notifications
        if (desktopNotificationsAvailable()) {
            this.resultDn.state = 'yes';
        } else {
            this.resultDn.state = 'no';
        }

        // Check for RTCPeerConnection
        if (peerConnectionAvailable()) {
            this.resultPc.state = 'yes';
        } else {
            this.resultPc.state = 'no';
        }

        // Check for RTCDataChannel
        if (dataChannelAvailable()) {
            this.resultDc.state = 'yes';
            this.resultTurn.state = 'loading';
        } else {
            this.resultDc.state = 'no';
            this.resultTurn.state = 'no';
        }

        // Check for WebSocket connectivity
        const subprotocol = 'v1.saltyrtc.org';
        const path = 'ffffffffffffffff00000000000000000000000000000000ffffffffffffffff';
        this.resultWs.showLogs = true;
        const ws = new WebSocket('wss://saltyrtc-ff.threema.ch/' + path, subprotocol);
        ws.binaryType = 'arraybuffer';
        ws.addEventListener('open', (event) => {
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
            let valid;
            if (bytes.length < 81) {
                valid = false;
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
        ws.addEventListener('close', (event) => {
            $scope.$apply(() => {
                this.resultWs.logs.push('Connection closed');
            });
        });
        this.resultWs.logs.push('Connecting');

        // Check for TURN connectivity
        let timeout = null;
        const testTurn = () => {
            timeout = $timeout(() => this.turnSuccess = 'no', 10000);
            const noop = () => {};

            // Detect safari
            const uagent = window.navigator.userAgent.toLowerCase();
            const isSafari  = /safari/.test(uagent) && /applewebkit/.test(uagent) && !/chrome/.test(uagent);

            // Determine ICE servers
            let iceServers;
            if (isSafari) {
                iceServers = [
                    'turn:turn.threema.ch:443?transport=udp',
                    'turn:turn.threema.ch:443?transport=tcp',
                    'turns:turn.threema.ch:443',
                ];
            } else {
                iceServers = [
                    'turn:ds-turn.threema.ch:443?transport=udp',
                    'turn:ds-turn.threema.ch:443?transport=tcp',
                    'turns:ds-turn.threema.ch:443',
                ];
            }
            console.debug('Using ICE servers: ' + iceServers);

            const pc = new RTCPeerConnection({iceServers: [{
                urls: iceServers,
                username: 'threema-angular-test',
                credential: 'VaoVnhxKGt2wD20F9bTOgiew6yHQmj4P7y7SE4lrahAjTQC0dpnG32FR4fnrlpKa',
            }]});

            this.resultTurn.showLogs = true;

            pc.createDataChannel('test');

            this.resultTurn.logs.push('Creating offer...');
            pc.createOffer(function(sdp) { pc.setLocalDescription(sdp, noop, noop) }, noop);

            pc.onicecandidate = (ice) => {
                $scope.$apply(() => {
					if (ice.candidate === null) {
						this.resultTurn.logs.push('Done collecting candidates.');
                        if (this.resultTurn.state === 'loading') {
                            this.resultTurn.state = 'no';
                            $timeout.cancel(timeout);
                        }
					} else if (ice.candidate.candidate) {
						const candidate = SDPUtils.parseCandidate(ice.candidate.candidate);
						console.debug(candidate);

                        let info = `[${candidate.type}] ${candidate.ip}:${candidate.port}`;
                        if (candidate.relatedAddress) {
                            info += ` via ${candidate.relatedAddress}`;
                        }
                        info += ` (${candidate.protocol})`;
                        this.resultTurn.logs.push(info);

						if (candidate.type === 'relay') {
                            this.resultTurn.state = 'yes';
                            $timeout.cancel(timeout);
						}
					} else {
						console.warn('Invalid candidate:', ice.candidate.candidate);
						this.resultTurn.logs.push('Invalid candidate (see debug log)');
					}
                });
            }
        }
        testTurn();
    };

});
