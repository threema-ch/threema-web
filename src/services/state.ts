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

export class StateService {

    // Angular services
    private $log: ng.ILogService;
    private $interval: ng.IIntervalService;

    // WebRTC states
    public signalingConnectionState: saltyrtc.SignalingState;
    public rtcConnectionState: threema.RTCConnectionState;

    // Connection buildup state
    public connectionBuildupState: threema.ConnectionBuildupState = 'connecting';
    public progress = 0;
    private progressInterval: ng.IPromise<any> = null;
    public slowConnect = false;

    // Global connection state
    public stage: 'signaling' | 'rtc';
    public state: threema.GlobalConnectionState;
    public wasConnected: boolean;

    public static $inject = ['$log', '$interval'];
    constructor($log: ng.ILogService, $interval: ng.IIntervalService) {
        this.$log = $log;
        this.$interval = $interval;
        this.reset();
    }

    /**
     * Signaling connection state.
     */
    public updateSignalingConnectionState(state: saltyrtc.SignalingState): void {
        const prevState = this.signalingConnectionState;
        this.signalingConnectionState = state;
        if (this.stage === 'signaling') {
            this.$log.debug('[StateService] Signaling connection state:', prevState, '=>', state);
            switch (state) {
                case 'new':
                case 'ws-connecting':
                case 'server-handshake':
                case 'peer-handshake':
                    this.state = 'warning';
                    break;
                case 'task':
                    this.state = 'warning';
                    this.stage = 'rtc';
                    break;
                case 'closing':
                case 'closed':
                    this.state = 'error';
                    break;
                default:
                    this.$log.warn('[StateService] Ignored signaling connection state change to', state);
            }
        } else {
            this.$log.debug('[StateService] Ignored signaling connection state to "' + state + '"');
        }
    }

    /**
     * RTC connection state.
     */
    public updateRtcConnectionState(state: threema.RTCConnectionState): void {
        const prevState = this.rtcConnectionState;
        this.rtcConnectionState = state;
        if (this.stage === 'rtc') {
            this.$log.debug('[StateService] RTC connection state:', prevState, '=>', state);
            switch (state) {
                case 'new':
                case 'connecting':
                    this.state = 'warning';
                    break;
                case 'connected':
                    this.state = 'ok';
                    this.wasConnected = true;
                    break;
                case 'disconnected':
                    this.state = 'error';
                    break;
                default:
                    this.$log.warn('[StateService] Ignored RTC connection state change to', state);
            }
        } else {
            this.$log.debug('[StateService] Ignored RTC connection state change to "' + state + '"');
        }
    }

    /**
     * Connection buildup state.
     */
    public updateConnectionBuildupState(state: threema.ConnectionBuildupState): void {
        if (this.connectionBuildupState === state) {
            return;
        }
        this.$log.debug('[StateService] Connection buildup state:', this.connectionBuildupState, '=>', state);

        // Update state
        this.connectionBuildupState = state;

        // Cancel progress interval if present
        if (this.progressInterval !== null) {
            this.$interval.cancel(this.progressInterval);
            this.progressInterval = null;
        }

        // Reset slow connect state
        this.slowConnect = false;

        // Update progress
        switch (state) {
            case 'new':
                this.progress = 0;
                break;
            case 'push':
                this.progress = 0;
                this.progressInterval = this.$interval(() => {
                    if (this.progress < 12) {
                        this.progress += 1;
                    } else {
                        this.slowConnect = true;
                    }
                }, 800);
                break;
            case 'manual_start':
                this.progress = 0;
                break;
            case 'connecting':
                this.progress = 13;
                break;
            case 'waiting':
                this.progress = 14;
                break;
            case 'peer_handshake':
                this.progress = 15;
                this.progressInterval = this.$interval(() => {
                    if (this.progress < 40) {
                        this.progress += 5;
                    } else if (this.progress < 55) {
                        this.progress += 3;
                    } else if (this.progress < 60) {
                        this.progress += 1;
                    } else {
                        this.slowConnect = true;
                    }
                }, 500);
                break;
            case 'loading':
                this.progress = 60;
                this.progressInterval = this.$interval(() => {
                    if (this.progress < 80) {
                        this.progress += 5;
                    } else if (this.progress < 90) {
                        this.progress += 2;
                    } else if (this.progress < 99) {
                        this.progress += 1;
                    } else {
                        this.slowConnect = true;
                    }
                }, 500);
                break;
            case 'done':
                this.progress = 100;
                break;
            default:
                this.progress = 0;
                break;
        }
    }

    /**
     * Reset all states.
     */
    public reset(): void {
        this.$log.debug('[StateService] Reset');

        // Reset state
        this.signalingConnectionState = 'new';
        this.rtcConnectionState = 'new';
        this.stage = 'signaling';
        this.state = 'error';
        this.wasConnected = false;
        this.connectionBuildupState = 'connecting';
    }
}
