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

import {StateService as UiStateService} from '@uirouter/angularjs';

import {ControllerService} from '../services/controller';
import {StateService} from '../services/state';
import {WebClientService} from '../services/webclient';

import GlobalConnectionState = threema.GlobalConnectionState;

/**
 * This controller handles state changes globally.
 *
 * It also controls auto-reconnecting and the connection status indicator bar.
 *
 * Status updates should be done through the status service.
 */
export class StatusController {

    private logTag: string = '[StatusController]';

    // State variable
    private state = GlobalConnectionState.Error;

    // Expanded status bar
    public expandStatusBar = false;
    private expandStatusBarTimer: ng.IPromise<void> | null = null;
    private expandStatusBarTimeout = 3000;

    // Reconnect
    private reconnectTimeout: ng.IPromise<void>;

    // Angular services
    private $timeout: ng.ITimeoutService;
    private $log: ng.ILogService;
    private $state: UiStateService;

    // Custom services
    private stateService: StateService;
    private webClientService: WebClientService;
    private controllerService: ControllerService;

    public static $inject = ['$scope', '$timeout', '$log', '$state', 'StateService',
        'WebClientService', 'ControllerService'];
    constructor($scope, $timeout: ng.ITimeoutService, $log: ng.ILogService, $state: UiStateService,
                stateService: StateService, webClientService: WebClientService,
                controllerService: ControllerService) {

        // Angular services
        this.$timeout = $timeout;
        this.$log = $log;
        this.$state = $state;

        // Custom services
        this.stateService = stateService;
        this.webClientService = webClientService;
        this.controllerService = controllerService;

        // Register event handlers
        this.stateService.evtGlobalConnectionStateChange.attach(
            (stateChange: threema.GlobalConnectionStateChange) => {
                this.onStateChange(stateChange.state, stateChange.prevState);
            },
        );
    }

    /**
     * Return the prefixed status.
     */
    public get statusClass(): string {
        return 'status-task-' + this.webClientService.chosenTask + ' status-' + this.state;
    }

    /**
     * Handle state changes.
     */
    private onStateChange(newValue: threema.GlobalConnectionState,
                          oldValue: threema.GlobalConnectionState): void {
        this.$log.debug(this.logTag, 'State change:', oldValue, '->', newValue);
        if (newValue === oldValue) {
            return;
        }
        this.state = newValue;

        const isWebrtc = this.webClientService.chosenTask === threema.ChosenTask.WebRTC;
        const isRelayedData = this.webClientService.chosenTask === threema.ChosenTask.RelayedData;

        switch (newValue) {
            case 'ok':
                this.collapseStatusBar();
                break;
            case 'warning':
                if (oldValue === 'ok' && isWebrtc) {
                    this.scheduleStatusBar();
                }
                if (this.stateService.wasConnected) {
                    this.webClientService.clearIsTypingFlags();
                }
                if (this.stateService.wasConnected && isRelayedData) {
                    this.reconnectIos();
                }
                break;
            case 'error':
                if (this.stateService.wasConnected && isWebrtc) {
                    if (oldValue === 'ok') {
                        this.scheduleStatusBar();
                    }
                    this.reconnectAndroid();
                }
                break;
            default:
                this.$log.error(this.logTag, 'Invalid state change: From', oldValue, 'to', newValue);
        }
    }

    /**
     * Show full status bar with a certain delay.
     */
    private scheduleStatusBar(): void {
        this.expandStatusBarTimer = this.$timeout(() => {
            this.expandStatusBar = true;
        }, this.expandStatusBarTimeout);
    }

    /**
     * Collapse the status bar if expanded.
     */
    private collapseStatusBar(): void {
        this.expandStatusBar = false;
        if (this.expandStatusBarTimer !== null) {
            this.$timeout.cancel(this.expandStatusBarTimer);
        }
    }

    /**
     * Attempt to reconnect an Android device after a connection loss.
     */
    private reconnectAndroid(): void {
        this.$log.warn(this.logTag, 'Connection lost (Android). Attempting to reconnect...');

        // Get original keys
        const originalKeyStore = this.webClientService.salty.keyStore;
        const originalPeerPermanentKeyBytes = this.webClientService.salty.peerPermanentKeyBytes;

        // Timeout durations
        const TIMEOUT1 = 20 * 1000; // Duration per step for first reconnect
        const TIMEOUT2 = 20 * 1000; // Duration per step for second reconnect

        // Reconnect state
        let reconnectTry: 1 | 2 = 1;

        // Handler for failed reconnection attempts
        const reconnectionFailed = () => {
            // Collapse status bar
            this.collapseStatusBar();

            // Reset state
            this.stateService.reset();

            // Redirect to welcome page
            this.$state.go('welcome', {
                initParams: {
                    keyStore: originalKeyStore,
                    peerTrustedKey: originalPeerPermanentKeyBytes,
                },
            });
        };

        // Handlers for reconnecting timeout
        const reconnect2Timeout = () => {
            // Give up
            this.$log.error(this.logTag, 'Reconnect timeout 2. Going back to initial loading screen...');
            reconnectionFailed();
        };
        const reconnect1Timeout = () => {
            // Could not connect so far.
            this.$log.error(this.logTag, 'Reconnect timeout 1. Retrying...');
            reconnectTry = 2;
            this.reconnectTimeout = this.$timeout(reconnect2Timeout, TIMEOUT2);
            doSoftReconnect();
        };

        // Function to soft-reconnect. Does not reset the loaded data.
        const doSoftReconnect = () => {
            this.webClientService.stop(threema.DisconnectReason.SessionStopped, {
                send: true,
                close: false,
                redirect: false,
            });
            this.webClientService.init(originalKeyStore, originalPeerPermanentKeyBytes, true);
            this.webClientService.start().then(
                () => {
                    // Cancel timeout
                    this.$timeout.cancel(this.reconnectTimeout);

                    // Hide expanded status bar
                    this.collapseStatusBar();
                },
                (error) => {
                    this.$log.error(this.logTag, 'Error state:', error);
                    this.$timeout.cancel(this.reconnectTimeout);
                    reconnectionFailed();
                },
                (progress: threema.ConnectionBuildupStateChange) => {
                    if (progress.state === 'peer_handshake' || progress.state === 'loading') {
                        this.$log.debug(this.logTag, 'Connection buildup advanced, resetting timeout');
                        // Restart timeout
                        this.$timeout.cancel(this.reconnectTimeout);
                        if (reconnectTry === 1) {
                            this.reconnectTimeout = this.$timeout(reconnect1Timeout, TIMEOUT1);
                        } else if (reconnectTry === 2) {
                            this.reconnectTimeout = this.$timeout(reconnect2Timeout, TIMEOUT2);
                        } else {
                            throw new Error('Invalid reconnectTry value: ' + reconnectTry);
                        }
                    }
                },
            );
        };

        // Start timeout
        this.reconnectTimeout = this.$timeout(reconnect1Timeout, TIMEOUT1);

        // Start reconnecting process
        doSoftReconnect();

        // TODO: Handle server closing state
    }

    /**
     * Attempt to reconnect an iOS device after a connection loss.
     */
    private reconnectIos(): void {
        this.$log.warn(this.logTag, 'Connection lost (iOS). Attempting to reconnect...');

        // Get original keys
        const originalKeyStore = this.webClientService.salty.keyStore;
        const originalPeerPermanentKeyBytes = this.webClientService.salty.peerPermanentKeyBytes;

        // Handler for failed reconnection attempts
        const reconnectionFailed = () => {
            // Reset state
            this.stateService.reset();

            // Redirect to welcome page
            this.$state.go('welcome', {
                initParams: {
                    keyStore: originalKeyStore,
                    peerTrustedKey: originalPeerPermanentKeyBytes,
                },
            });
        };

        const skipPush = true;
        // Delay connecting a bit to wait for old websocket to close
        // TODO: Make this more robust and hopefully faster
        const startTimeout = 500;
        this.$log.debug(this.logTag, 'Stopping old connection');
        this.webClientService.stop(threema.DisconnectReason.SessionStopped, {
            send: true,
            close: false,
            redirect: false,
        });
        this.$timeout(() => {
            this.$log.debug(this.logTag, 'Starting new connection');
            this.webClientService.init(originalKeyStore, originalPeerPermanentKeyBytes, true);
            this.webClientService.start(skipPush).then(
                () => { /* ok */ },
                (error) => {
                    this.$log.error(this.logTag, 'Error state:', error);
                    reconnectionFailed();
                },
                // Progress
                (progress: threema.ConnectionBuildupStateChange) => {
                    this.$log.debug(this.logTag, 'Connection buildup advanced:', progress);
                },
            );
        }, startTimeout);
    }

    public wide(): boolean {
        return this.controllerService.getControllerName() !== undefined
            && this.controllerService.getControllerName() === 'messenger';
    }
}
