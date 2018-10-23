/**
 * This file is part of Threema Web.
 *
 * Threema Web is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
 * General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Threema Web. If not, see <http://www.gnu.org/licenses/>.
 */

import * as SDPUtils from 'sdp';

import TaskConnectionState = threema.TaskConnectionState;

/**
 * Wrapper around the WebRTC PeerConnection.
 */
export class PeerConnectionHelper {
    private logTag: string = '[PeerConnectionHelper]';

    // Angular services
    private $log: ng.ILogService;
    private $q: ng.IQService;
    private $timeout: ng.ITimeoutService;
    private $rootScope: ng.IRootScopeService;

    // WebRTC
    private pc: RTCPeerConnection;
    private webrtcTask: saltyrtc.tasks.webrtc.WebRTCTask;

    // Calculated connection state
    public connectionState: TaskConnectionState = TaskConnectionState.New;
    public onConnectionStateChange: (state: TaskConnectionState) => void = null;

    // Debugging
    private censorCandidates: boolean;

    constructor($log: ng.ILogService, $q: ng.IQService,
                $timeout: ng.ITimeoutService, $rootScope: ng.IRootScopeService,
                webrtcTask: saltyrtc.tasks.webrtc.WebRTCTask,
                iceServers: RTCIceServer[],
                censorCandidates: boolean = true) {
        this.$log = $log;
        this.$log.info(this.logTag, 'Initialize WebRTC PeerConnection');
        this.$log.debug(this.logTag, 'ICE servers used:', [].concat(...iceServers.map((c) => c.urls)).join(', '));
        this.$q = $q;
        this.$timeout = $timeout;
        this.$rootScope = $rootScope;

        this.webrtcTask = webrtcTask;

        this.censorCandidates = censorCandidates;

        // Set up peer connection
        this.pc = new RTCPeerConnection({iceServers: iceServers});
        this.pc.onnegotiationneeded = (e: Event) => {
            this.$log.debug(this.logTag, 'RTCPeerConnection: negotiation needed');
            this.initiatorFlow().then(
                (_) => this.$log.debug(this.logTag, 'Initiator flow done'),
            );
        };

        // Handle state changes
        this.pc.onconnectionstatechange = (e: Event) => {
            $log.debug(this.logTag, 'Connection state change:', this.pc.connectionState);
        };
        this.pc.onsignalingstatechange = (e: Event) => {
            $log.debug(this.logTag, 'Signaling state change:', this.pc.signalingState);
        };

        // Set up ICE candidate handling
        this.setupIceCandidateHandling();

        // Log incoming data channels
        this.pc.ondatachannel = (e: RTCDataChannelEvent) => {
            $log.debug(this.logTag, 'New data channel was created:', e.channel.label);
        };
    }

    /**
     * Return the wrapped RTCPeerConnection instance.
     */
    public get peerConnection(): RTCPeerConnection {
        return this.pc;
    }

    /**
     * Set up receiving / sending of ICE candidates.
     */
    private setupIceCandidateHandling() {
        this.$log.debug(this.logTag, 'Setting up ICE candidate handling');
        this.pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
            if (e.candidate) {
                this.$log.debug(this.logTag, 'Gathered local ICE candidate:',
                    this.censorCandidate(e.candidate.candidate));
                this.webrtcTask.sendCandidate({
                    candidate: e.candidate.candidate,
                    sdpMid: e.candidate.sdpMid,
                    sdpMLineIndex: e.candidate.sdpMLineIndex,
                });
            } else {
                this.$log.debug(this.logTag, 'No more local ICE candidates');
            }
        };
        this.pc.onicecandidateerror = (e: RTCPeerConnectionIceErrorEvent) => {
            this.$log.error(this.logTag, 'ICE candidate error:', e);
        };
        this.pc.oniceconnectionstatechange = (e: Event) => {
            this.$log.debug(this.logTag, 'ICE connection state change:', this.pc.iceConnectionState);
            this.$rootScope.$apply(() => {
                switch (this.pc.iceConnectionState) {
                    case 'new':
                        this.setConnectionState(TaskConnectionState.New);
                        break;
                    case 'checking':
                    case 'disconnected':
                        this.setConnectionState(TaskConnectionState.Connecting);
                        break;
                    case 'connected':
                    case 'completed':
                        this.setConnectionState(TaskConnectionState.Connected);
                        break;
                    case 'failed':
                    case 'closed':
                        this.setConnectionState(TaskConnectionState.Disconnected);
                        break;
                    default:
                        this.$log.warn(this.logTag, 'Ignored ICE connection state change to',
                                       this.pc.iceConnectionState);
                }
            });
        };
        this.pc.onicegatheringstatechange = (e: Event) => {
            this.$log.debug(this.logTag, 'ICE gathering state change:', this.pc.iceGatheringState);
        };
        this.webrtcTask.on('candidates', (e: saltyrtc.tasks.webrtc.CandidatesEvent) => {
            for (const candidateInit of e.data) {
                if (candidateInit) {
                    this.$log.debug(this.logTag, 'Adding remote ICE candidate:',
                        this.censorCandidate(candidateInit.candidate));
                } else {
                    this.$log.debug(this.logTag, 'No more remote ICE candidates');
                }
                this.pc.addIceCandidate(candidateInit);
            }
        });
    }

    private async initiatorFlow(): Promise<void> {
        // Send offer
        const offer: RTCSessionDescriptionInit = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        this.$log.debug(this.logTag, 'Created offer, set local description');
        this.webrtcTask.sendOffer(offer);

        // Receive answer
        const receiveAnswer: () => Promise<saltyrtc.tasks.webrtc.Answer> = () => {
            return new Promise((resolve) => {
                this.webrtcTask.once('answer', (e: saltyrtc.tasks.webrtc.AnswerEvent) => {
                    resolve(e.data);
                });
            });
        };
        const answer: RTCSessionDescriptionInit = await receiveAnswer();
        await this.pc.setRemoteDescription(answer);
        this.$log.debug(this.logTag, 'Received answer, set remote description');
    }

    /**
     * Create a new secure data channel.
     */
    public createSecureDataChannel(label: string): saltyrtc.tasks.webrtc.SecureDataChannel {
        const dc: RTCDataChannel = this.pc.createDataChannel(label);
        dc.binaryType = 'arraybuffer';
        return this.webrtcTask.wrapDataChannel(dc);
    }

    /**
     * Set the connection state and update listeners.
     */
    private setConnectionState(state: TaskConnectionState) {
        if (state !== this.connectionState) {
            this.connectionState = state;
            if (this.onConnectionStateChange !== null) {
                this.$timeout(() => this.onConnectionStateChange(state), 0);
            }
        }
    }

    /**
     * Unbind all event handler and abruptly close the peer connection.
     */
    public close(): void {
        this.webrtcTask.off();
        this.pc.onnegotiationneeded = null;
        this.pc.onconnectionstatechange = null;
        this.pc.onsignalingstatechange = null;
        this.pc.onicecandidate = null;
        this.pc.onicecandidateerror = null;
        this.pc.oniceconnectionstatechange = null;
        this.pc.onicegatheringstatechange = null;
        this.pc.ondatachannel = null;
        this.pc.close();
    }

    /**
     * Censor an ICE candidate's address and port (unless censoring is disabled).
     *
     * Return the censored ICE candidate.
     */
    private censorCandidate(candidateInit: string): string {
        const candidate = SDPUtils.parseCandidate(candidateInit);
        if (this.censorCandidates) {
            if (candidate.type !== 'relay') {
                candidate.ip = '***';
                candidate.port = 1;
            }
            candidate.relatedAddress = '***';
            candidate.relatedPort = 2;
        }
        return SDPUtils.writeCandidate(candidate);
    }
}
