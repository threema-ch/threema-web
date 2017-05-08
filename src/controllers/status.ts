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

import {ControllerService} from '../services/controller';
import {StateService} from '../services/state';
import {WebClientService} from '../services/webclient';

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
    private state: threema.GlobalConnectionState = 'error';

    // Expanded status bar
    public expandStatusBar = false;
    private expandStatusBarTimer: ng.IPromise<void> | null = null;
    private expandStatusBarTimeout = 3000;

    // Reconnect
    private reconnectTimeout: ng.IPromise<void>;

    // Angular services
    private $timeout: ng.ITimeoutService;
    private $state: ng.ui.IStateService;
    private $log: ng.ILogService;

    // Custom services
    private stateService: StateService;
    private webClientService: WebClientService;
    private controllerService: ControllerService;

    public static $inject = ['$scope', '$timeout', '$log', '$state', 'StateService',
        'WebClientService', 'ControllerService'];
    constructor($scope, $timeout: ng.ITimeoutService, $log: ng.ILogService, $state: ng.ui.IStateService,
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

        // Watch state changes
        $scope.$watch(
            () => stateService.state,
            (newValue: threema.GlobalConnectionState, oldValue: threema.GlobalConnectionState) => {
                if (oldValue !== newValue) {
                    this.onStateChange(newValue, oldValue);
                }
            },
        );
    }

    /**
     * Return the prefixed status.
     */
    public get statusClass(): string {
        return 'status-' + this.state;
    }

    /**
     * Handle state changes.
     */
    private onStateChange(newValue: threema.GlobalConnectionState,
                          oldValue: threema.GlobalConnectionState): void {
        if (newValue === oldValue) {
            return;
        }
        this.state = newValue;
        switch (newValue) {
            case 'ok':
                this.collapseStatusBar();
                break;
            case 'warning':
                if (oldValue === 'ok') {
                    this.scheduleStatusBar();
                }
                break;
            case 'error':
                if (this.stateService.wasConnected) {
                    if (oldValue === 'ok') {
                        this.scheduleStatusBar();
                    }
                    this.reconnect();
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
     * Attempt to reconnect after a connection loss.
     */
    private reconnect(): void {
        this.$log.warn(this.logTag, 'Connection lost. Attempting to reconnect...');

        // Get original keys
        let originalKeyStore = this.webClientService.salty.keyStore;
        let originalPeerPermanentKeyBytes = this.webClientService.salty.peerPermanentKeyBytes;

        // Timeout durations
        const TIMEOUT1 = 20 * 1000; // Duration per step for first reconnect
        const TIMEOUT2 = 20 * 1000; // Duration per step for second reconnect

        // Reconnect state
        let reconnectTry: 1 | 2 = 1;

        // Handler for failed reconnection attempts
        let reconnectionFailed = () => {
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
        let doSoftReconnect = () => {
            const deleteStoredData = false;
            const resetPush = false;
            const redirect = false;
            this.webClientService.stop(true, deleteStoredData, resetPush, redirect);
            this.webClientService.init(originalKeyStore, originalPeerPermanentKeyBytes, false);
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

    public wide(): boolean {
        return this.controllerService.getControllerName() !== undefined
            && this.controllerService.getControllerName() === 'messenger';
    }
}
