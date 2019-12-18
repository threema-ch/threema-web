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

// tslint:disable:no-reference

/// <reference path="../types/broadcastchannel.d.ts" />

import {Logger} from 'ts-log';

import {
    StateProvider as UiStateProvider,
    StateService as UiStateService,
} from '@uirouter/angularjs';

import {DialogController} from '../controllers/dialog';
import {BrowserInfo} from '../helpers/browser_info';
import {scorePassword, Strength} from '../helpers/password_strength';
import {BrowserService} from '../services/browser';
import {ControllerService} from '../services/controller';
import {TrustedKeyStoreService} from '../services/keystore';
import {LogService} from '../services/log';
import {PushService} from '../services/push';
import {SettingsService} from '../services/settings';
import {StateService} from '../services/state';
import {TimeoutService} from '../services/timeout';
import {VersionService} from '../services/version';
import {WebClientService} from '../services/webclient';

import GlobalConnectionState = threema.GlobalConnectionState;
import DisconnectReason = threema.DisconnectReason;

class WelcomeController {
    private static BROADCAST_DELAY = 100;
    private static REDIRECT_DELAY = 500;

    // Angular services
    private $scope: ng.IScope;
    private $window: ng.IWindowService;
    private $state: UiStateService;

    // Material design services
    private $mdDialog: ng.material.IDialogService;
    private $translate: ng.translate.ITranslateService;

    // Custom services
    private webClientService: WebClientService;
    private trustedKeyStore: TrustedKeyStoreService;
    private pushService: PushService;
    private stateService: StateService;
    private settingsService: SettingsService;
    private timeoutService: TimeoutService;
    private config: threema.Config;

    // Logging
    private readonly log: Logger;

    // Other
    public name = 'welcome';
    private mode: 'scan' | 'unlock';
    private qrCode;
    private password: string = '';
    private passwordStrength: {score: number, strength: Strength} = {score: 0, strength: Strength.BAD};
    private formLocked: boolean = false;
    private pleaseUpdateAppMsg: string = null;
    private browser: BrowserInfo;
    private browserWarningShown: boolean = false;

    public static $inject = [
        '$scope', '$state', '$window', '$mdDialog', '$translate',
        'LogService', 'WebClientService', 'TrustedKeyStore', 'StateService', 'PushService', 'BrowserService',
        'VersionService', 'SettingsService', 'TimeoutService', 'ControllerService',
        'BROWSER_MIN_VERSIONS', 'CONFIG',
    ];
    constructor($scope: ng.IScope, $state: UiStateService,
                $window: ng.IWindowService, $mdDialog: ng.material.IDialogService,
                $translate: ng.translate.ITranslateService,
                logService: LogService,
                webClientService: WebClientService, trustedKeyStore: TrustedKeyStoreService,
                stateService: StateService, pushService: PushService,
                browserService: BrowserService,
                versionService: VersionService,
                settingsService: SettingsService,
                timeoutService: TimeoutService,
                controllerService: ControllerService,
                minVersions: threema.BrowserMinVersions,
                config: threema.Config) {
        controllerService.setControllerName('welcome');
        // Angular services
        this.$scope = $scope;
        this.$state = $state;
        this.$window = $window;
        this.$mdDialog = $mdDialog;
        this.$translate = $translate;

        // Own services
        this.webClientService = webClientService;
        this.trustedKeyStore = trustedKeyStore;
        this.stateService = stateService;
        this.pushService = pushService;
        this.settingsService = settingsService;
        this.timeoutService = timeoutService;
        this.config = config;

        // Logging
        this.log = logService.getLogger('Welcome-C');

        // TODO: Allow to trigger below behaviour by using state parameters

        // Determine whether browser warning should be shown
        this.browser = browserService.getBrowser();
        const version = this.browser.version;
        this.log.debug('Detected browser:', this.browser.description());
        if (!this.browser.wasDetermined()) {
            this.log.warn('Could not determine browser version');
            this.showBrowserWarning();
        } else if (this.browser.name === threema.BrowserName.Chrome) {
            if (version < minVersions.CHROME) {
                this.log.warn('Chrome is too old (' + version + ' < ' + minVersions.CHROME + ')');
                this.showBrowserWarning();
            }
        } else if (this.browser.name === threema.BrowserName.Firefox) {
            if (version < minVersions.FF) {
                this.log.warn('Firefox is too old (' + version + ' < ' + minVersions.FF + ')');
                this.showBrowserWarning();
            }
        } else if (this.browser.name === threema.BrowserName.Opera) {
            if (version < minVersions.OPERA) {
                this.log.warn('Opera is too old (' + version + ' < ' + minVersions.OPERA + ')');
                this.showBrowserWarning();
            }
        } else if (this.browser.name === threema.BrowserName.Safari) {
            if (version < minVersions.SAFARI) {
                this.log.warn('Safari is too old (' + version + ' < ' + minVersions.SAFARI + ')');
                this.showBrowserWarning();
            }
        } else {
            this.log.warn('Non-supported browser, please use Chrome, Firefox or Opera');
            this.showBrowserWarning();
        }

        // Clean up local storage
        // TODO: Remove this in future version
        this.settingsService.removeUntrustedKeyValuePair('v2infoShown');

        // Determine whether local storage is available
        if (this.trustedKeyStore.blocked === true) {
            this.log.error('Cannot access local storage. Is it being blocked by a browser add-on?');
            this.showLocalStorageWarning();
        }

        // Determine current version
        versionService.initVersion();

        // Determine last version with previous protocol version
        if (this.config.PREV_PROTOCOL_LAST_VERSION !== null) {
            this.pleaseUpdateAppMsg = this.$translate.instant('troubleshooting.PLEASE_UPDATE_APP');
            if (!this.config.SELF_HOSTED) {
                this.pleaseUpdateAppMsg += ' ' + this.$translate.instant('troubleshooting.USE_ARCHIVE_VERSION', {
                    archiveUrl: `https://web.threema.ch/archive/${this.config.PREV_PROTOCOL_LAST_VERSION}/`,
                });
            }
        }

        // Clear cache
        this.webClientService.clearCache();

        // Determine whether trusted key is available
        let hasTrustedKey = null;
        try {
            hasTrustedKey = this.trustedKeyStore.hasTrustedKey();
        } catch (e) {
            this.log.error('Exception while accessing local storage:', e);
            this.showLocalStorageException(e);
        }

        // Determine connection mode
        if (hasTrustedKey) {
            this.mode = 'unlock';
            this.unlock();
        } else {
            this.mode = 'scan';
            this.scan();
        }
    }

    /**
     * Whether or not to show the loading indicator.
     */
    public get showLoadingIndicator(): boolean {
        switch (this.stateService.connectionBuildupState) {
            case 'push':
            case 'peer_handshake':
            case 'loading':
            case 'done':
                return true;
            default:
                return false;
        }
    }

    /**
     * Getter for connection buildup state.
     *
     * Only to be used by the template.
     */
    public get state(): threema.ConnectionBuildupState {
        return this.stateService.connectionBuildupState;
    }

    /**
     * Getter for connection buildup progress.
     *
     * Only to be used by the template.
     */
    public get progress(): number {
        return this.stateService.progress;
    }

    /**
     * Getter for slow connect status.
     *
     * Only to be used by the template.
     */
    public get slowConnect(): boolean {
        return this.stateService.slowConnect;
    }

    /**
     * Whether to show troubleshooting hints related to WebRTC.
     */
    public get showWebrtcTroubleshooting(): boolean {
        return this.webClientService.chosenTask === threema.ChosenTask.WebRTC;
    }

    /**
     * Initiate a new session by scanning a new QR code.
     */
    private scan(stopArguments?: threema.WebClientServiceStopArguments): void {
        this.log.info('Initialize session by scanning QR code...');

        // Initialize webclient with new keystore
        this.webClientService.stop(stopArguments !== undefined ? stopArguments : {
            reason: DisconnectReason.SessionStopped,
            send: false,
            close: 'welcome',
            connectionBuildupState: this.stateService.connectionBuildupState,
        });
        this.webClientService.init({
            resume: false,
        });

        // Initialize QR code params
        this.$scope.$watch(() => this.password, () => {
            const payload = this.webClientService.buildQrCodePayload(this.password.length > 0);
            this.qrCode = this.buildQrCode(payload);
            this.passwordStrength = scorePassword(this.password);
        });

        // Set up the broadcast channel that checks whether we're already connected in another tab
        this.setupBroadcastChannel(this.webClientService.salty.keyStore.publicKeyHex, 0)
            .then((result) => {
                this.$scope.$apply(() => {
                    switch (result) {
                        case 'already_open':
                            this.log.warn('Session already connected in another tab or window');
                            break;
                        case 'no_answer':
                            this.start();
                            break;
                    }
                });
            })
            .catch((error) => {
                this.$scope.$apply(() => {
                    this.log.warn('Unable to set up broadcast channel:', error);
                    this.start();
                });
            });
    }

    /**
     * Initiate a new session by unlocking a trusted key.
     */
    private unlock(): void {
        this.stateService.reset('new');
        this.log.info('Initialize session by unlocking trusted key...');
    }

    /**
     * Decrypt the keys and initiate the session.
     */
    private unlockConfirm(): void {
        // Lock form to prevent further input
        this.formLocked = true;

        const decrypted: threema.TrustedKeyStoreData = this.trustedKeyStore.retrieveTrustedKey(this.password);
        if (decrypted === null) {
            this.formLocked = false;
            return this.showDecryptionFailed();
        }

        // Instantiate new keystore
        const keyStore = new saltyrtcClient.KeyStore(decrypted.ownSecretKey);

        // Set up the broadcast channel that checks whether we're already connected in another tab
        this.setupBroadcastChannel(keyStore.publicKeyHex, WelcomeController.BROADCAST_DELAY)
            .then((result) => {
                this.$scope.$apply(() => {
                    switch (result) {
                        case 'already_open':
                            this.log.warn('Session already connected in another tab or window');
                            break;
                        case 'no_answer':
                            this.log.debug('No broadcast received indicating that a session is already open');
                            this.reconnect(keyStore, decrypted);
                            break;
                    }
                });
            })
            .catch((error) => {
                this.$scope.$apply(() => {
                    this.log.warn('Unable to set up broadcast channel:', error);
                    this.reconnect(keyStore, decrypted);
                });
            });
    }

    /**
     * Set up a `BroadcastChannel` to check if there are other tabs running on
     * the same session. Resolves when either an `already_connected` message has
     * been received or a timeout of `delayMs` has been elapsed.
     *
     * The `publicKeyHex` parameter is the hex-encoded public key of the keystore
     * used to establish the SaltyRTC connection.
     */
    private setupBroadcastChannel(publicKeyHex: string, delayMs: number): Future<'already_open' | 'no_answer'> {
        const future: Future<'already_open' | 'no_answer'> = new Future();

        // Check for broadcast support in the browser
        if (!('BroadcastChannel' in this.$window)) {
            future.reject('BroadcastChannel not supported in this browser');
            return future;
        }

        // Config constants
        const CHANNEL_NAME = 'session-check';
        const TYPE_PUBLIC_KEY = 'public-key';
        const TYPE_ALREADY_OPEN = 'already-open';

        // Set up new BroadcastChannel
        const channel = new BroadcastChannel(CHANNEL_NAME);

        // Register a message handler
        channel.onmessage = (event: MessageEvent) => {
            const message = JSON.parse(event.data);
            switch (message.type) {
                case TYPE_PUBLIC_KEY:
                    // Another tab is trying to connect to a session.
                    // Is it the same public key as the one we are using?
                    if (message.key === publicKeyHex
                            && (this.stateService.connectionBuildupState === 'loading'
                             || this.stateService.connectionBuildupState === 'done')) {
                        // Yes it is, notify them that the session is already active
                        this.log.debug('Another tab is trying to connect to our session. Respond with a broadcast.');
                        channel.postMessage(JSON.stringify({
                            type: TYPE_ALREADY_OPEN,
                            key: publicKeyHex,
                        }));
                    }
                    break;
                case TYPE_ALREADY_OPEN:
                    // Another tab notified us that the session we're trying to connect to
                    // is already active.
                    if (message.key === publicKeyHex && this.stateService.connectionBuildupState !== 'done') {
                        future.resolve('already_open');
                        this.timeoutService.register(() => {
                            this.stateService.updateConnectionBuildupState('already_connected');
                            this.stateService.state = GlobalConnectionState.Error;
                        }, 500, true, 'alreadyConnected');
                    }
                    break;
                default:
                    this.log.warn('Unknown broadcast message type:', message.type);
                    break;
            }
        };

        // Notify other tabs that we're trying to connect
        this.log.debug('Checking if the session is already open in another tab or window');
        channel.postMessage(JSON.stringify({
            type: TYPE_PUBLIC_KEY,
            key: publicKeyHex,
        }));

        // Resolve after the specified delay without an `already_connected` response
        setTimeout(() => future.resolve('no_answer'), delayMs);
        return future;
    }

    /**
     * Reconnect using a specific keypair and the decrypted data from the trusted keystore.
     */
    private reconnect(keyStore: saltyrtc.KeyStore, decrypted: threema.TrustedKeyStoreData): void {
        // Reset state
        this.webClientService.stop({
            reason: DisconnectReason.SessionStopped,
            send: false,
            close: 'welcome',
            connectionBuildupState: this.stateService.connectionBuildupState,
        });

        // Initialize push service
        if (decrypted.pushToken !== null && decrypted.pushTokenType !== null) {
            this.webClientService.updatePushToken(decrypted.pushToken, decrypted.pushTokenType);
            this.pushService.init(decrypted.pushToken, decrypted.pushTokenType);
        }

        // Initialize webclient service
        this.webClientService.init({
            keyStore: keyStore,
            peerTrustedKey: decrypted.peerPublicKey,
            resume: false,
        });

        this.start();
    }

    /**
     * Show a browser warning dialog.
     */
    private showBrowserWarning(): void {
        this.browserWarningShown = true;
        this.$translate.onReady().then(() => {
            const confirm = this.$mdDialog.confirm()
                .title(this.$translate.instant('welcome.BROWSER_NOT_SUPPORTED'))
                .htmlContent(this.$translate.instant('welcome.BROWSER_NOT_SUPPORTED_DETAILS'))
                .ok(this.$translate.instant('welcome.CONTINUE_ANYWAY'))
                .cancel(this.$translate.instant('welcome.ABORT'));
            this.$mdDialog.show(confirm).then(() => {
                // do nothing
            }, () => {
                // Redirect to Threema website
                window.location.replace('https://threema.ch/threema-web');
            });
        });
    }

    /**
     * Show a dialog indicating that local storage is not available.
     */
    private showLocalStorageWarning(): void {
        this.$translate.onReady().then(() => {
            const confirm = this.$mdDialog.alert()
                .title(this.$translate.instant('common.ERROR'))
                .htmlContent(this.$translate.instant('welcome.LOCAL_STORAGE_MISSING_DETAILS'))
                .ok(this.$translate.instant('common.OK'));
            this.$mdDialog.show(confirm);
        });
    }

    /**
     * Show a dialog indicating that local storage cannot be accessed.
     */
    private showLocalStorageException(e: Error): void {
        this.$translate.onReady().then(() => {
            const confirm = this.$mdDialog.alert()
                .title(this.$translate.instant('common.ERROR'))
                .htmlContent(this.$translate.instant('welcome.LOCAL_STORAGE_EXCEPTION_DETAILS', {
                    errorMsg: e.name,
                }))
                .ok(this.$translate.instant('common.OK'));
            this.$mdDialog.show(confirm);
        });
    }

    /**
     * Show the "decryption failed" dialog.
     */
    private showDecryptionFailed(): void {
        this.$mdDialog.show({
            controller: DialogController,
            controllerAs: 'ctrl',
            templateUrl: 'partials/dialog.unlockfailed.html',
            parent: angular.element(document.body),
            clickOutsideToClose: true,
            fullscreen: true,
        });
    }

    /**
     * Show the "already connected" dialog.
     */
    private showAlreadyConnected(): void {
        this.$translate.onReady().then(() => {
            const confirm = this.$mdDialog.alert()
                .title(this.$translate.instant('welcome.ALREADY_CONNECTED'))
                .htmlContent(this.$translate.instant('welcome.ALREADY_CONNECTED_DETAILS'))
                .ok(this.$translate.instant('common.OK'));
            this.$mdDialog.show(confirm);
        });
    }

    /**
     * Forget trusted keys.
     */
    private deleteSession(ev) {
        const confirm = this.$mdDialog.confirm()
             .title(this.$translate.instant('common.SESSION_DELETE'))
             .textContent(this.$translate.instant('common.CONFIRM_DELETE_BODY'))
             .targetEvent(ev)
             .ok(this.$translate.instant('common.YES'))
             .cancel(this.$translate.instant('common.CANCEL'));

        this.$mdDialog.show(confirm).then(() =>  {
            // Go back to scan mode
            this.mode = 'scan';
            this.clearPassword();
            this.formLocked = false;

            // Force-stop the webclient and initiate scan
            this.scan({
                reason: DisconnectReason.SessionDeleted,
                send: true,
                close: 'welcome',
            });
        }, () => {
            // do nothing
        });
    }

    private buildQrCode(payload: string) {
        // To calculate version and error correction, refer to this table:
        // http://www.thonky.com/qr-code-tutorial/character-capacities
        // The qr generator uses byte mode, therefore for 92 characters with
        // error correction level 'M' we need version 6.
        const len = payload.length;
        let version: number;
        if (len <= 134) {
            version = 6;
        } else if (len <= 154) {
            version = 7;
        } else if (len <= 192) {
            version = 8;
        } else if (len <= 230) {
            version = 9;
        } else if (len <= 271) {
            version = 10;
        } else if (len <= 321) {
            version = 11;
        } else if (len <= 367) {
            version = 12;
        } else if (len <= 425) {
            version = 13;
        } else if (len <= 458) {
            version = 14;
        } else if (len <= 520) {
            version = 15;
        } else if (len <= 586) {
            version = 16;
        } else {
            this.log.error('QR Code payload too large: Is your SaltyRTC host string huge?');
            version = 40;
        }
        return {
            version: version,
            errorCorrectionLevel: 'L',
            size: 384,
            data: payload,
        };
    }

    private clearPassword() {
        this.password = '';
        this.passwordStrength = {score: 0, strength: Strength.BAD};
    }

    /**
     * Actually start the webclient.
     *
     * It must be initialized before calling this method.
     */
    private start() {
        this.webClientService.start().then(
            // If connection buildup is done...
            () => {
                // Pass password to webclient service
                this.webClientService.setPassword(this.password);

                // Clear local password variable
                this.clearPassword();
                this.formLocked = false;

                // Redirect to home
                this.timeoutService.register(
                    () => this.$state.go('messenger.home'),
                    WelcomeController.REDIRECT_DELAY,
                    true,
                    'redirectToHome',
                );
            },

            // If an error occurs...
            (error) => {
                this.log.error('Error state:', error);
                // Note: On rejection, the web client service will already
                //       redirect to 'welcome' and show a protocol error.
            },

            // State updates
            (progress: threema.ConnectionBuildupStateChange) => { /* ignored */ },
        );
    }

    /**
     * Reload the page.
     */
    public reload() {
        this.$window.location.reload();
    }
}

angular.module('3ema.welcome', [])

.config(['$stateProvider', ($stateProvider: UiStateProvider) => {

    $stateProvider
        .state('welcome', {
            url: '/welcome',
            templateUrl: 'partials/welcome.html',
            controller: 'WelcomeController',
            controllerAs: 'ctrl',
            params: {initParams: null},
        });

}])

.controller('WelcomeController', WelcomeController);
