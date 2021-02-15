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

import {Logger} from 'ts-log';

import {StateService as UiStateService} from '@uirouter/angularjs';

import {ControllerService} from '../services/controller';
import {LogService} from '../services/log';
import {StateService} from '../services/state';
import {TimeoutService} from '../services/timeout';
import {WebClientService} from '../services/webclient';

import GlobalConnectionState = threema.GlobalConnectionState;
import DisconnectReason = threema.DisconnectReason;

/**
 * This controller handles state changes globally.
 *
 * It also controls auto-reconnecting and the connection status indicator bar.
 *
 * Status updates should be done through the state service.
 */
export class StatusController {
    // Logging
    private readonly log: Logger;

    // Config
    private config: threema.Config;

    // State variable
    private state = GlobalConnectionState.Error;
    private unreadCount = 0;

    // Expanded status bar
    public expandStatusBar = false;
    private expandStatusBarTimer: ng.IPromise<void> | null = null;
    private expandStatusBarTimeout = 3000;

    // Reconnect
    private reconnectTimeout: ng.IPromise<void>;

    // Angular services
    private $timeout: ng.ITimeoutService;
    private $state: UiStateService;

    // Custom services
    private controllerService: ControllerService;
    private stateService: StateService;
    private timeoutService: TimeoutService;
    private webClientService: WebClientService;

    public static $inject = [
        '$scope', '$timeout', '$state',
        'CONFIG',
        'ControllerService', 'StateService', 'LogService', 'TimeoutService', 'WebClientService',
    ];
    constructor($scope, $timeout: ng.ITimeoutService, $state: UiStateService,
                config: threema.Config,
                controllerService: ControllerService, stateService: StateService, logService: LogService,
                timeoutService: TimeoutService, webClientService: WebClientService) {

        // Logging
        this.log = logService.getLogger('Status-C', 'color: #000; background-color: #ffff99');

        // Config
        this.config = config;

        // Angular services
        this.$timeout = $timeout;
        this.$state = $state;

        // Custom services
        this.controllerService = controllerService;
        this.stateService = stateService;
        this.timeoutService = timeoutService;
        this.webClientService = webClientService;

        // Register event handlers
        this.stateService.evtGlobalConnectionStateChange.attach(
            (stateChange: threema.GlobalConnectionStateChange) => {
                $scope.$apply(() => {
                    this.onStateChange(stateChange.state, stateChange.prevState);
                });
            },
        );
        this.stateService.evtUnreadCountChange.attach(
            (count: number) => {
                this.unreadCount = count;
            },
        );
    }

    /**
     * Return the prefixed status.
     */
    public get statusClass(): string {
        const classes = [
            `status-task-${this.webClientService.chosenTask}`,
            `status-${this.state}`,
        ];
        if (this.config.VISUALIZE_STATE) {
            classes.push(`visualize-state`);
        }
        return classes.join(' ');
    }

    /**
     * Handle state changes.
     */
    private onStateChange(newValue: threema.GlobalConnectionState,
                          oldValue: threema.GlobalConnectionState): void {
        this.log.debug('State change:', oldValue, '->', newValue);
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
                this.webClientService.clearIsTypingFlags();
                if (isRelayedData) {
                    this.reconnectIos();
                }
                break;
            case 'error':
                if (isWebrtc) {
                    this.reconnectAndroid();
                }
                if (this.stateService.attempt === 0 && isRelayedData) {
                    this.reconnectIos();
                }
                break;
            default:
                this.log.error('Invalid state change: From', oldValue, 'to', newValue);
        }
    }

    /**
     * Show full status bar with a certain delay.
     */
    private scheduleStatusBar(): void {
        this.expandStatusBarTimer = this.timeoutService.register(() => {
            this.expandStatusBar = true;
        }, this.expandStatusBarTimeout, true, 'expandStatusBar');
    }

    /**
     * Collapse the status bar if expanded.
     */
    private collapseStatusBar(): void {
        this.expandStatusBar = false;
        if (this.expandStatusBarTimer !== null) {
            this.timeoutService.cancel(this.expandStatusBarTimer);
        }
    }

    /**
     * Attempt to reconnect an Android device after a connection loss.
     */
    private reconnectAndroid(): void {
        this.log.info(`Connection lost (Android). Reconnect attempt #${this.stateService.attempt + 1}`);

        // Show expanded status bar (if on 'messenger')
        if (this.$state.includes('messenger')) {
            this.scheduleStatusBar();
        }

        // Get original keys
        const originalKeyStore = this.webClientService.salty.keyStore;
        const originalPeerPermanentKeyBytes = this.webClientService.salty.peerPermanentKeyBytes;

        // Soft reconnect: Does not reset the loaded data
        this.webClientService.stop({
            reason: DisconnectReason.SessionStopped,
            send: true,
            close: false,
        });
        this.webClientService.init({
            keyStore: originalKeyStore,
            peerTrustedKey: originalPeerPermanentKeyBytes,
            resume: true,
        });

        // Show device unreachable dialog if maximum attempts exceeded
        // Note: This will not be shown on 'welcome'
        const pause = this.stateService.attempt >= WebClientService.MAX_CONNECT_ATTEMPTS;
        if (pause) {
            this.webClientService.showDeviceUnreachableDialog();
        }

        // Start
        this.webClientService.start(pause)
            .then(
                () => { /* ignored */ },
                (error) => {
                    this.log.error('Error state:', error);
                    // Note: The web client service has already been stopped at
                    // this point.
                },
                (progress: threema.ConnectionBuildupStateChange) => {
                    this.log.debug('Connection buildup advanced:', progress);
                },
            )
            .finally(() => {
                // Hide expanded status bar
                this.collapseStatusBar();
            });
        ++this.stateService.attempt;
    }

    /**
     * Attempt to reconnect an iOS device after a connection loss.
     */
    private reconnectIos(): void {
        this.log.info(`Connection lost (iOS). Reconnect attempt #${++this.stateService.attempt}`);

        // Get original keys
        const originalKeyStore = this.webClientService.salty.keyStore;
        const originalPeerPermanentKeyBytes = this.webClientService.salty.peerPermanentKeyBytes;

        // Delay connecting a bit to wait for old websocket to close
        // TODO: Make this more robust and hopefully faster
        const startTimeout = 500;
        this.log.debug('Stopping old connection');
        this.webClientService.stop({
            reason: DisconnectReason.SessionStopped,
            send: true,
            close: false,
            connectionBuildupState: 'push',
        });

        // Only send a push...
        const push = ((): { send: boolean, reason?: string } => {
            // ... if never left the 'welcome' page.
            if (this.$state.includes('welcome')) {
                return {
                    send: true,
                    reason: 'still on welcome page',
                };
            }

            // ... if there is at least one unacknowledged wire message.
            const pendingWireMessages = this.webClientService.unacknowledgedWireMessages;
            if (pendingWireMessages > 0) {
                return {
                    send: true,
                    reason: `${pendingWireMessages} unacknowledged wire messages`,
                };
            }

            // ... otherwise, don't push!
            return {
                send: false,
            };
        })();

        this.$timeout.cancel(this.reconnectTimeout);
        this.reconnectTimeout = this.$timeout(() => {
            if (push.send) {
                this.log.debug(`Starting new connection with push, reason: ${push.reason}`);
            } else {
                this.log.debug('Starting new connection without push');
            }
            this.webClientService.init({
                keyStore: originalKeyStore,
                peerTrustedKey: originalPeerPermanentKeyBytes,
                resume: true,
            });

            this.webClientService.start(!push.send).then(
                () => { /* ignored */ },
                (error) => {
                    this.log.error('Error state:', error);
                    // Note: The web client service has already been stopped at
                    // this point.
                },
                (progress: threema.ConnectionBuildupStateChange) => {
                    this.log.debug('Connection buildup advanced:', progress);
                },
            );
        }, startTimeout);
    }

    public showMessenger(): boolean {
        return this.controllerService.getControllerName() !== undefined
            && this.controllerService.getControllerName() === 'messenger';
    }

    /**
     * Return the favicon filename.
     */
    public get faviconFilename(): string {
        switch (this.state) {
            case GlobalConnectionState.Ok:
                if (this.unreadCount > 0) {
                    return 'favicon-32x32-unread.png';
                } else {
                    return 'favicon-32x32.png';
                }
                break;
            case GlobalConnectionState.Warning:
                const isRelayedData = this.webClientService.chosenTask === threema.ChosenTask.RelayedData;
                if (isRelayedData) {
                    // iOS devices are regularly disconnected, but this is normal behavior.
                    return 'favicon-32x32.png';
                } else {
                    return 'favicon-32x32-warning.png';
                }
                break;
            case GlobalConnectionState.Error:
                return 'favicon-32x32-error.png';
                break;
        }
    }
}
