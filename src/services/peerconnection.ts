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

import TaskConnectionState = threema.TaskConnectionState;
import {Logger} from 'ts-log';

import {ConfidentialIceCandidate} from '../helpers/confidential';
import {LogService} from './log';
import {TimeoutService} from './timeout';

/**
 * Wrapper around the WebRTC PeerConnection.
 */
export class PeerConnectionHelper {
    private static readonly CONNECTION_FAILED_TIMEOUT_MS = 15000;

    // Angular services
    private readonly log: Logger;
    private readonly $q: ng.IQService;
    private readonly $rootScope: ng.IRootScopeService;

    // Custom services
    private readonly timeoutService: TimeoutService;

        // WebRTC
    private readonly pc: RTCPeerConnection;
    private readonly webrtcTask: saltyrtc.tasks.webrtc.WebRTCTask;
    private connectionFailedTimer: ng.IPromise<void> | null = null;

    // Calculated connection state
    public connectionState: TaskConnectionState = TaskConnectionState.New;
    public onConnectionStateChange: (state: TaskConnectionState) => void = null;

    constructor($q: ng.IQService, $rootScope: ng.IRootScopeService,
                logService: LogService, timeoutService: TimeoutService,
                webrtcTask: saltyrtc.tasks.webrtc.WebRTCTask, iceServers: RTCIceServer[]) {
        this.log = logService.getLogger('PeerConnection', 'color: #fff; background-color: #3333ff');
        this.log.info('Initialize WebRTC PeerConnection');
        this.log.debug('ICE servers used:', [].concat(...iceServers.map((c) => c.urls)));
        this.$q = $q;
        this.$rootScope = $rootScope;

        this.timeoutService = timeoutService;
        this.webrtcTask = webrtcTask;

        // Set up peer connection
        this.pc = new RTCPeerConnection({iceServers: iceServers});
        this.pc.onnegotiationneeded = () => {
            this.log.debug('RTCPeerConnection: negotiation needed');
            this.initiatorFlow()
                .then(() => this.log.debug('Initiator flow done'));
        };

        // Handle state changes
        this.pc.onconnectionstatechange = () => {
            this.log.debug('Connection state change:', this.pc.connectionState);
        };
        this.pc.onsignalingstatechange = () => {
            this.log.debug('Signaling state change:', this.pc.signalingState);
        };

        // Set up ICE candidate handling
        this.setupIceCandidateHandling();

        // Log incoming data channels
        this.pc.ondatachannel = (e: RTCDataChannelEvent) => {
            this.log.debug('New data channel was created:', e.channel.label);
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
        this.log.debug('Setting up ICE candidate handling');
        this.pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
            if (e.candidate) {
                this.log.debug('Gathered local ICE candidate:', new ConfidentialIceCandidate(e.candidate.candidate));
                this.webrtcTask.sendCandidate({
                    candidate: e.candidate.candidate,
                    sdpMid: e.candidate.sdpMid,
                    sdpMLineIndex: e.candidate.sdpMLineIndex,
                });
            } else {
                this.log.debug('No more local ICE candidates');
            }
        };
        this.pc.onicecandidateerror = (e: RTCPeerConnectionIceErrorEvent) => {
            this.log.error('ICE candidate error:', e);
        };
        this.pc.oniceconnectionstatechange = () => {
            this.log.debug('ICE connection state change:', this.pc.iceConnectionState);
            this.$rootScope.$apply(() => {
                // Cancel connection failed timer
                if (this.connectionFailedTimer !== null) {
                    this.timeoutService.cancel(this.connectionFailedTimer);
                    this.connectionFailedTimer = null;
                }

                // Handle state
                switch (this.pc.iceConnectionState) {
                    case 'new':
                        this.setConnectionState(TaskConnectionState.New);
                        break;
                    case 'checking':
                    case 'disconnected':
                        this.setConnectionState(TaskConnectionState.Connecting);

                        // Setup connection failed timer
                        // Note: There is no guarantee that we will end up in the 'failed' state, so we need to set up
                        // our own timer as well.
                        this.connectionFailedTimer = this.timeoutService.register(() => {
                            // Closing the peer connection to prevent "SURPRISE, the connection works after all!"
                            // situations which certainly would lead to ugly race conditions.
                            this.connectionFailedTimer = null;
                            this.log.debug('ICE connection considered failed');
                            this.pc.close();
                        }, PeerConnectionHelper.CONNECTION_FAILED_TIMEOUT_MS, true, 'connectionFailedTimer');
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
                        this.log.warn('Ignored ICE connection state change to',
                                       this.pc.iceConnectionState);
                }
            });
        };
        this.pc.onicegatheringstatechange = () => {
            this.log.debug('ICE gathering state change:', this.pc.iceGatheringState);
        };
        this.webrtcTask.on('candidates', (e: saltyrtc.tasks.webrtc.CandidatesEvent) => {
            for (const candidateInit of e.data) {
                if (candidateInit) {
                    this.log.debug('Adding remote ICE candidate:',
                        new ConfidentialIceCandidate(candidateInit.candidate));
                } else {
                    this.log.debug('No more remote ICE candidates');
                }
                this.pc.addIceCandidate(candidateInit)
                    .catch((error) => this.log.warn('Unable to add ice candidate:', error));
            }
        });
    }

    private async initiatorFlow(): Promise<void> {
        // Send offer
        const offer: RTCSessionDescriptionInit = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        this.log.debug('Created offer, set local description');
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
        this.log.debug('Received answer, set remote description');
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
                this.onConnectionStateChange(state);
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
}
