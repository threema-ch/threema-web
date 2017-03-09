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

import {TrustedKeyStoreService} from '../services/keystore';
import {StateService} from "../services/state";
import {WebClientService} from "../services/webclient";
import {PushService} from "../services/push";
import {BrowserService} from "../services/browser";
import BrowserMinVersions = threema.BrowserMinVersions;
import {ControllerService} from "../services/controller";

class DialogController {
    // TODO: This is also used in partials/messenger.ts. We could somehow
    // extract it into a separate file.
    public static $inject = ['$mdDialog'];

    public $mdDialog;

    constructor($mdDialog) {
        this.$mdDialog = $mdDialog;
    }

    public cancel() {
        this.$mdDialog.cancel();
    }
}

class WelcomeController {

    private static REDIRECT_DELAY = 500;

    // Angular services
    private $scope: ng.IScope;
    private $state: ng.ui.IStateService;
    private $timeout: ng.ITimeoutService;
    private $interval: ng.IIntervalService;
    private $log: ng.ILogService;
    private $window: ng.IWindowService;

    // Material design services
    private $mdDialog: ng.material.IDialogService;
    private $translate: ng.translate.ITranslateService;

    // Custom services
    private webClientService: WebClientService;
    private TrustedKeyStore: TrustedKeyStoreService;
    private pushService: PushService;
    private stateService: StateService;

    // Other
    public name = 'welcome';
    private mode: 'scan' | 'unlock';
    private qrCode;
    private password: string = '';

    public static $inject = [
        '$scope', '$state', '$stateParams', '$timeout', '$interval', '$log', '$window', '$mdDialog', '$translate',
        'WebClientService', 'TrustedKeyStore', 'StateService', 'PushService', 'BrowserService',
        'BROWSER_MIN_VERSIONS', 'ControllerService',
    ];
    constructor($scope: ng.IScope, $state: ng.ui.IStateService, $stateParams: threema.WelcomeStateParams,
                $timeout: ng.ITimeoutService, $interval: ng.IIntervalService,
                $log: ng.ILogService, $window: ng.IWindowService, $mdDialog: ng.material.IDialogService,
                $translate: ng.translate.ITranslateService,
                webClientService: WebClientService, TrustedKeyStore: TrustedKeyStoreService,
                stateService: StateService, pushService: PushService,
                browserService: BrowserService,
                minVersions: BrowserMinVersions,
                controllerService: ControllerService) {
        controllerService.setControllerName('welcome');
        // Angular services
        this.$scope = $scope;
        this.$state = $state;
        this.$timeout = $timeout;
        this.$interval = $interval;
        this.$log = $log;
        this.$window = $window;
        this.$mdDialog = $mdDialog;
        this.$translate = $translate;

        // Own services
        this.webClientService = webClientService;
        this.TrustedKeyStore = TrustedKeyStore;
        this.stateService = stateService;
        this.pushService = pushService;

        // Determine whether browser warning should be shown
        const browser = browserService.getBrowser();
        const version = parseFloat(browser.version);
        $log.debug('Detected browser:', browser.textInfo);
        if (isNaN(version)) {
            $log.warn('Could not determine browser version');
            this.showBrowserWarning();
        } else if (browser.chrome === true) {
            if (version < minVersions.CHROME) {
                $log.warn('Chrome is too old (' + version + ' < ' + minVersions.CHROME + ')');
                this.showBrowserWarning();
            }
        } else if (browser.firefox === true) {
            if (version < minVersions.FF) {
                $log.warn('Firefox is too old (' + version + ' < ' + minVersions.FF + ')');
                this.showBrowserWarning();
            }
        } else if (browser.opera === true) {
            if (version < minVersions.OPERA) {
                $log.warn('Opera is too old (' + version + ' < ' + minVersions.OPERA + ')');
                this.showBrowserWarning();
            }
        } else {
            $log.warn('Non-supported browser, please use Chrome, Firefox or Opera');
            this.showBrowserWarning();
        }

        // Determine whether local storage is available
        if (this.TrustedKeyStore.blocked === true) {
            $log.error('Cannot access local storage. Is it being blocked by a browser add-on?');
            this.showLocalStorageWarning();
        }

        // Clear cache
        this.webClientService.clearCache();

        // Determine connection mode
        if ($stateParams.initParams !== null) {
            this.mode = 'unlock';
            const keyStore = $stateParams.initParams.keyStore;
            const peerTrustedKey = $stateParams.initParams.peerTrustedKey;
            this.reconnect(keyStore, peerTrustedKey);
        } else if (TrustedKeyStore.hasTrustedKey()) {
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
     * Initiate a new session by scanning a new QR code.
     */
    private scan(): void {
        this.$log.info('Initialize session by scanning QR code...');

        // Initialize webclient with new keystore
        this.webClientService.init();

        // Initialize QR code params
        this.$scope.$watch(() => this.password, () => {
            const payload = this.webClientService.buildQrCodePayload(this.password.length > 0);
            this.qrCode = this.buildQrCode(payload);
        });

        // Start webclient
        this.start();
    }

    /**
     * Initiate a new session by unlocking a trusted key.
     */
    private unlock(): void {
        this.$log.info('Initialize session by unlocking trusted key...');
    }

    /**
     * Decrypt the keys and initiate the session.
     */
    private unlockConfirm(): void {
        const decrypted: threema.TrustedKeyStoreData = this.TrustedKeyStore.retrieveTrustedKey(this.password);
        if (decrypted === null) {
            return this.showDecryptionFailed();
        }

        // Instantiate new keystore
        const keyStore = new saltyrtcClient.KeyStore(decrypted.ownSecretKey);

        // Initialize push service
        if (decrypted.pushToken !== null) {
            this.pushService.init(decrypted.pushToken);
            this.$log.debug('Initialize push service');
        }

        // Reconnect
        this.reconnect(keyStore, decrypted.peerPublicKey);
    }

    /**
     * Reconnect using a specific keypair and peer public key.
     */
    private reconnect(keyStore: saltyrtc.KeyStore, peerTrustedKey: Uint8Array): void {
        this.webClientService.init(keyStore, peerTrustedKey);
        this.start();
    }

    /**
     * Show a browser warning dialog.
     */
    private showBrowserWarning(): void {
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
                window.location.replace('https://threema.ch/');
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
            // Force-stop the webclient
            const deleteStoredData = true;
            const resetPush = true;
            const redirect = false;
            this.webClientService.stop(true, deleteStoredData, resetPush, redirect);

            // Reset state
            this.stateService.updateConnectionBuildupState('new');

            // Go back to scan mode
            this.mode = 'scan';
            this.password = '';

            // Initiate scan
            this.scan();
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
            this.$log.error('QR Code payload too large: Is your SaltyRTC host string huge?');
            version = 40;
        }
        return {
            version: version,
            errorCorrectionLevel: 'L',
            size: 384,
            data: payload,
        };
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
                this.password = '';

                // Redirect to home
                this.$timeout(() => this.$state.go('messenger.home'), WelcomeController.REDIRECT_DELAY);
            },

            // If an error occurs...
            (error) => {
                this.$log.error('Error state:', error);
                // TODO: should probably show an error message instead
                this.$timeout(() => this.$state.reload(), WelcomeController.REDIRECT_DELAY);
            },
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

.config(['$stateProvider', ($stateProvider: ng.ui.IStateProvider) => {

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
