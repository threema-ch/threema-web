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

/// <reference types="saltyrtc-task-webrtc" />
import * as SDPUtils from 'sdp';
import {isNullOrUndefined} from 'util';
import {PeerConnectionStatsService} from './peerconnection_stats';

/**
 * Wrapper around the WebRTC PeerConnection.
 *
 * TODO: Convert to regular service?
 */
export class PeerConnectionHelper {

    private static SELECTED_CANDIDATE_PAIR_STATS_INTERVAL = 10000; // in milliseconds

    private logTag: string = '[PeerConnectionHelper]';

    // Angular services
    private $log: ng.ILogService;
    private $q: ng.IQService;
    private $interval: ng.IIntervalService;
    private $timeout: ng.ITimeoutService;
    private $rootScope: ng.IRootScopeService;

    // WebRTC
    private pc: RTCPeerConnection;
    private webrtcTask: saltyrtc.tasks.webrtc.WebRTCTask;

    // Stats service & related attributes
    private statsService: PeerConnectionStatsService;
    private selectedCandidatePairStatsTimer: ng.IPromise<any>;

    // Calculated connection state
    public connectionState: threema.RTCConnectionState = 'new';
    public onConnectionStateChange: (state: threema.RTCConnectionState) => void = null;

    // Internal callback when connection closes
    private onConnectionClosed: () => void = null;

    // Debugging
    private censorCandidates: boolean;

    constructor($log: ng.ILogService, $q: ng.IQService,
                $interval: ng.IIntervalService, $timeout: ng.ITimeoutService, $rootScope: ng.IRootScopeService,
                statsService: PeerConnectionStatsService,
                webrtcTask: saltyrtc.tasks.webrtc.WebRTCTask,
                iceServers: RTCIceServer[],
                censorCandidates: boolean = true) {
        this.$log = $log;
        this.$log.info(this.logTag, 'Initialize WebRTC PeerConnection');
        this.$log.debug(this.logTag, 'ICE servers used:', [].concat(...iceServers.map((c) => c.urls)).join(', '));
        this.$q = $q;
        this.$interval = $interval;
        this.$timeout = $timeout;
        this.$rootScope = $rootScope;

        this.statsService = statsService;
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
                        this.requestSelectedCandidatePairStats();
                        this.setConnectionState('new');
                        break;
                    case 'checking':
                    case 'disconnected':
                        this.requestSelectedCandidatePairStats();
                        this.setConnectionState('connecting');
                        break;
                    case 'connected':
                    case 'completed':
                        this.requestSelectedCandidatePairStats();
                        this.setConnectionState('connected');
                        break;
                    case 'failed':
                    case 'closed':
                        this.clearSelectedCandidatePairStats();
                        this.setConnectionState('disconnected');
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
            for (let candidateInit of e.data) {
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
        let offer: RTCSessionDescriptionInit = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        this.$log.debug(this.logTag, 'Created offer, set local description');
        this.webrtcTask.sendOffer(offer);

        // Receive answer
        let receiveAnswer: () => Promise<saltyrtc.tasks.webrtc.Answer> = () => {
            return new Promise((resolve) => {
                this.webrtcTask.once('answer', (e: saltyrtc.tasks.webrtc.AnswerEvent) => {
                    resolve(e.data);
                });
            });
        };
        let answer: RTCSessionDescriptionInit = await receiveAnswer();
        await this.pc.setRemoteDescription(answer);
        this.$log.debug(this.logTag, 'Received answer, set remote description');
    }

    /**
     * Create a new secure data channel.
     */
    public createSecureDataChannel(label: string, onopenHandler?): saltyrtc.tasks.webrtc.SecureDataChannel {
        const dc: RTCDataChannel = this.pc.createDataChannel(label);
        dc.binaryType = 'arraybuffer';
        const sdc: saltyrtc.tasks.webrtc.SecureDataChannel = this.webrtcTask.wrapDataChannel(dc);
        if (onopenHandler !== undefined) {
            sdc.onopen = onopenHandler;
        }
        return sdc;
    }

    /**
     * Set the connection state and update listeners.
     */
    private setConnectionState(state: threema.RTCConnectionState) {
        if (state !== this.connectionState) {
            this.connectionState = state;
            if (this.onConnectionStateChange !== null) {
                this.$timeout(() => this.onConnectionStateChange(state), 0);
            }
            if (this.onConnectionClosed !== null && state === 'disconnected') {
                this.$timeout(() => this.onConnectionClosed(), 0);
            }
        }
    }

    /**
     * Close the peer connection.
     *
     * Return a promise that resolves once the connection is actually closed.
     */
    public close(): ng.IPromise<{}> {
        return this.$q((resolve, reject) => {
            const signalingClosed = this.pc.signalingState as string === 'closed'; // Legacy
            const connectionClosed = this.pc.connectionState === 'closed';
            if (!signalingClosed && !connectionClosed) {

                // If connection state is not yet "disconnected", register a callback
                // for the disconnect event.
                if (this.connectionState !== 'disconnected') {
                    // Disconnect timeout
                    let timeout: ng.IPromise<any>;

                    // Handle connection closed event
                    this.onConnectionClosed = () => {
                        this.$timeout.cancel(timeout);
                        this.onConnectionClosed = null;
                        resolve();
                    };

                    // Launch timeout
                    timeout = this.$timeout(() => {
                        this.onConnectionClosed = null;
                        reject('Timeout');
                    }, 2000);
                }

                // Close connection
                setTimeout(() => {
                    this.pc.close();
                }, 0);

                // If connection state is already "disconnected", resolve immediately.
                if (this.connectionState === 'disconnected') {
                    resolve();
                }
            } else {
                resolve();
            }
        });
    }

    /**
     * Request updating the selected candidate pair and queue further updates.
     * Will update the internally stored stats service.
     */
    private requestSelectedCandidatePairStats(): void {
        // Query updating selected now
        this._getSelectedCandidatePairStats();

        // Start timer (if not already started)
        if (isNullOrUndefined(this.selectedCandidatePairStatsTimer)) {
            this.selectedCandidatePairStatsTimer = this.$interval(() => {
                this._getSelectedCandidatePairStats();
            }, PeerConnectionHelper.SELECTED_CANDIDATE_PAIR_STATS_INTERVAL);
        }
    }

    /**
     * Stop the timer to query the selected candidate pair stats.
     */
    private clearSelectedCandidatePairStats(): void {
        // Stop timer (if already started)
        if (!isNullOrUndefined(this.selectedCandidatePairStatsTimer)) {
            this.$interval.cancel(this.selectedCandidatePairStatsTimer);
            this.selectedCandidatePairStatsTimer = null;
        }

        // Clear selected pair
        this.statsService.setSelectedCandidatePair(null);
    }

    private _getSelectedCandidatePairStats(): void {
        // TODO: 'report' should be of type 'RTCStatsReport' but the methods 'get' and 'values' are not defined for
        //       the types
        this.peerConnection.getStats().then((report: any) => {
            let selectedCandidatePair = null;

            for (let stats of report.values()) {
                let pair: RTCIceCandidatePairStats = null;
                if (stats.type === 'transport') {
                    pair = report.get(stats.selectedCandidatePairId);
                }

                // As not all implementations have a 'transport' stats object (looking at you, Firefox), we need to
                // look at candidate pairs which could have a proprietary element 'selected'.
                if (stats.type === 'candidate-pair' && stats.selected) {
                    pair = stats;
                }

                if (pair) {
                    const local = report.get(pair.localCandidateId);
                    const remote = report.get(pair.remoteCandidateId);
                    if (local && remote) {
                        selectedCandidatePair = [pair, local, remote];
                    }
                    break;
                }
            }

            // Update pair
            this.$rootScope.$apply(() => {
                this.statsService.setSelectedCandidatePair(selectedCandidatePair);
            });
        }).catch((reason) => {
            console.warn('Unable to retrieve peer connection stats, reason:', reason);
        });
    }

    /**
     * Censor an ICE candidate's address and port (unless censoring is disabled).
     *
     * Return the censored ICE candidate.
     */
    private censorCandidate(candidateInit: string): string {
        let candidate = SDPUtils.parseCandidate(candidateInit);
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
