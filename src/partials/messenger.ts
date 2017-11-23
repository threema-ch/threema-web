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

import {ContactControllerModel} from '../controller_model/contact';
import {supportsPassive, throttle} from '../helpers';
import {ContactService} from '../services/contact';
import {ControllerService} from '../services/controller';
import {ControllerModelService} from '../services/controller_model';
import {ExecuteService} from '../services/execute';
import {FingerPrintService} from '../services/fingerprint';
import {TrustedKeyStoreService} from '../services/keystore';
import {MimeService} from '../services/mime';
import {NotificationService} from '../services/notification';
import {ReceiverService} from '../services/receiver';
import {SettingsService} from '../services/settings';
import {StateService} from '../services/state';
import {VersionService} from '../services/version';
import {WebClientService} from '../services/webclient';
import {ControllerModelMode} from '../types/enums';

class DialogController {
    public static $inject = ['$mdDialog'];

    public $mdDialog: ng.material.IDialogService;
    public activeElement: HTMLElement | null;

    constructor($mdDialog: ng.material.IDialogService) {
        this.$mdDialog = $mdDialog;
        this.activeElement = document.activeElement as HTMLElement;
    }

    public cancel(): void {
        this.$mdDialog.cancel();
        this.done();
    }

    protected hide(data: any): void {
        this.$mdDialog.hide(data);
        this.done();
    }

    private done(): void {
        if (this.resumeFocusOnClose() === true && this.activeElement !== null) {
            // reset focus
            this.activeElement.focus();
        }
    }

    /**
     * If true, the focus on the active element (before opening the dialog)
     * will be restored. Default `true`, override if desired.
     */
    protected resumeFocusOnClose(): boolean {
        return true;
    }
}

/**
 * Handle sending of files.
 */
class SendFileController extends DialogController {
    public caption: string;
    public sendAsFile: boolean = false;

    public send(): void {
        this.hide({
            caption: this.caption,
            sendAsFile: this.sendAsFile,
        });
    }

    public keypress($event: KeyboardEvent): void {
        if ($event.key === 'Enter') { // see https://developer.mozilla.org/de/docs/Web/API/KeyboardEvent/key/Key_Values
            this.send();
        }
    }
}

/**
 * Handle settings
 */
class SettingsController {

    public static $inject = ['$mdDialog', '$window', 'SettingsService', 'NotificationService'];

    public $mdDialog: ng.material.IDialogService;
    public $window: ng.IWindowService;
    public settingsService: SettingsService;
    private notificationService: NotificationService;
    public activeElement: HTMLElement | null;

    private desktopNotifications: boolean;
    private notificationApiAvailable: boolean;
    private notificationPermission: boolean;
    private notificationPreview: boolean;
    private notificationSound: boolean;

    constructor($mdDialog: ng.material.IDialogService,
                $window: ng.IWindowService,
                settingsService: SettingsService,
                notificationService: NotificationService) {
        this.$mdDialog = $mdDialog;
        this.$window = $window;
        this.settingsService = settingsService;
        this.notificationService = notificationService;
        this.activeElement = document.activeElement as HTMLElement;
        this.desktopNotifications = notificationService.getWantsNotifications();
        this.notificationApiAvailable = notificationService.isNotificationApiAvailable();
        this.notificationPermission = notificationService.getNotificationPermission();
        this.notificationPreview = notificationService.getWantsPreview();
        this.notificationSound = notificationService.getWantsSound();
    }

    public cancel(): void {
        this.$mdDialog.cancel();
        this.done();
    }

    protected hide(data: any): void {
        this.$mdDialog.hide(data);
        this.done();
    }

    private done(): void {
        if (this.activeElement !== null) {
            // Reset focus
            this.activeElement.focus();
        }
    }

    public setWantsNotifications(desktopNotifications: boolean) {
        this.notificationService.setWantsNotifications(desktopNotifications);
    }

    public setWantsPreview(notificationPreview: boolean) {
        this.notificationService.setWantsPreview(notificationPreview);
    }

    public setWantsSound(notificationSound: boolean) {
        this.notificationService.setWantsSound(notificationSound);
    }

}

class ConversationController {
    public name = 'navigation';
    private logTag: string = '[ConversationController]';

    // Angular services
    private $stateParams;
    private $timeout: ng.ITimeoutService;
    private $state: ng.ui.IStateService;
    private $log: ng.ILogService;
    private $scope: ng.IScope;
    private $filter: ng.IFilterService;

    // Own services
    private webClientService: WebClientService;
    private receiverService: ReceiverService;
    private stateService: StateService;
    private mimeService: MimeService;

    // Third party services
    private $mdDialog: ng.material.IDialogService;
    private $mdToast: ng.material.IToastService;

    // Controller model
    private controllerModel: threema.ControllerModel;

    // DOM Elements
    private domChatElement: HTMLElement;

    // Scrolling
    public showScrollJump: boolean = false;

    public receiver: threema.Receiver;
    public type: threema.ReceiverType;
    public message: string = '';
    public lastReadMsgId: number = 0;
    public msgReadReportPending = false;
    private hasMore = true;
    private latestRefMsgId: number = null;
    private messages: threema.Message[];
    public initialData: threema.InitialConversationData = {
        draft: '',
        initialText: '',
    };
    private $translate: ng.translate.ITranslateService;
    private locked = false;
    public maxTextLength: number;
    public isTyping = (): boolean => false;

    private uploading = {
        enabled: false,
        value1: 0,
        value2: 0,
    };

    public static $inject = [
        '$stateParams', '$state', '$timeout', '$log', '$scope', '$rootScope',
        '$mdDialog', '$mdToast', '$location', '$translate', '$filter',
        'WebClientService', 'StateService', 'ReceiverService', 'MimeService', 'VersionService',
        'ControllerModelService',
    ];
    constructor($stateParams: threema.ConversationStateParams,
                $state: ng.ui.IStateService,
                $timeout: ng.ITimeoutService,
                $log: ng.ILogService,
                $scope: ng.IScope,
                $rootScope: ng.IRootScopeService,
                $mdDialog: ng.material.IDialogService,
                $mdToast: ng.material.IToastService,
                $location,
                $translate: ng.translate.ITranslateService,
                $filter: ng.IFilterService,
                webClientService: WebClientService,
                stateService: StateService,
                receiverService: ReceiverService,
                mimeService: MimeService,
                versionService: VersionService,
                controllerModelService: ControllerModelService) {
        this.$stateParams = $stateParams;
        this.$timeout = $timeout;
        this.$log = $log;
        this.webClientService = webClientService;
        this.receiverService = receiverService;
        this.stateService = stateService;
        this.mimeService = mimeService;

        this.$state = $state;
        this.$scope = $scope;
        this.$filter = $filter;

        this.$mdDialog = $mdDialog;
        this.$mdToast = $mdToast;
        this.$translate = $translate;

        // Close any showing dialogs
        this.$mdDialog.cancel();

        this.maxTextLength = this.webClientService.getMaxTextLength();

        // On every navigation event, close all dialogs.
        // Note: Deprecated. When migrating ui-router ($state),
        // replace with transition hooks.
        $rootScope.$on('$stateChangeStart', () => this.$mdDialog.cancel());

        // Check for version updates
        versionService.checkForUpdate();

        // Redirect to welcome if necessary
        if (stateService.state === 'error') {
            $log.debug('ConversationController: WebClient not yet running, redirecting to welcome screen');
            $state.go('welcome');
            return;
        }

        if (!this.locked) {
            // Get DOM references
            this.domChatElement = document.querySelector('#conversation-chat') as HTMLElement;

            // Add custom event handlers
            this.domChatElement.addEventListener('scroll', throttle(() => {
                $rootScope.$apply(() => {
                    this.updateScrollJump();
                });
            }, 100, this), supportsPassive() ? {passive: true} as any : false);
        }

        // Set receiver and type
        try {
            this.receiver = webClientService.receivers.getData({type: $stateParams.type, id: $stateParams.id});
            this.type = $stateParams.type;

            if (this.receiver.type === undefined) {
                this.receiver.type = this.type;
            }

            // Initialize controller model
            const mode = ControllerModelMode.CHAT;
            switch (this.receiver.type) {
                case 'me':
                    $log.warn(this.logTag, 'Cannot chat with own contact');
                    $state.go('messenger.home');
                    return;
                case 'contact':
                    this.controllerModel = controllerModelService.contact(
                        this.receiver as threema.ContactReceiver, mode);
                    break;
                case 'group':
                    this.controllerModel = controllerModelService.group(
                        this.receiver as threema.GroupReceiver, mode);
                    break;
                case 'distributionList':
                    this.controllerModel = controllerModelService.distributionList(
                        this.receiver as threema.DistributionListReceiver, mode);
                    break;
                default:
                    $log.error(this.logTag, 'Cannot initialize controller model:',
                        'Invalid receiver type "' + this.receiver.type + '"');
                    $state.go('messenger.home');
                    return;
            }

            // Check if this receiver may be viewed
            if (this.controllerModel.canView() === false) {
                $log.warn(this.logTag, 'Cannot view this receiver, redirecting to home');
                $state.go('messenger.home');
                return;
            }

            // initial set locked state
            this.locked = this.receiver.locked;

            this.receiverService.setActive(this.receiver);

            if (!this.receiver.locked) {
                let latestHeight = 0;
                // update unread count
                this.webClientService.messages.updateFirstUnreadMessage(this.receiver);
                this.messages = this.webClientService.messages.register(
                    this.receiver,
                    this.$scope,
                    (e, allMessages: threema.Message[], hasMore: boolean) => {
                        this.messages = allMessages;
                        this.hasMore = hasMore;
                        if (this.latestRefMsgId !== null) {
                            // scroll to div..
                            this.domChatElement.scrollTop =
                                this.domChatElement.scrollHeight - latestHeight;
                            this.latestRefMsgId = null;
                        }
                        latestHeight = this.domChatElement.scrollHeight;
                    },
                );

                this.initialData = {
                    draft: webClientService.getDraft(this.receiver),
                    initialText: $stateParams.initParams ? $stateParams.initParams.text : '',
                };

                if (this.receiver.type === 'contact') {
                    this.isTyping = () => this.webClientService.isTyping(this.receiver as threema.ContactReceiver);
                }
            }

        } catch (error) {
            $log.error('Could not set receiver and type');
            $log.debug(error.stack);
            $state.go('messenger.home');
        }

        // reload controller if locked state was changed
        $scope.$watch(() => {
            return this.receiver.locked;
        }, () => {
            if (this.locked !== this.receiver.locked) {
                $state.reload();
            }
        });
    }

    public isEnabled(): boolean {
        return this.type !== 'group'
            || !(this.receiver as threema.GroupReceiver).disabled;
    }

    public isQuoting(): boolean {
        return this.getQuote() !== undefined;
    }

    public getQuote(): threema.Quote {
        return this.webClientService.getQuote(this.receiver);
    }

    public cancelQuoting(): void {
        // Clear current quote
        this.webClientService.setQuote(this.receiver);
    }

    public showError(errorMessage: string, toastLength = 4000) {
        if (errorMessage === undefined || errorMessage.length === 0) {
            errorMessage = this.$translate.instant('error.ERROR_OCCURRED');
        }

        this.$mdToast.show(
            this.$mdToast.simple()
                .textContent(errorMessage)
                .position('bottom center'));
    }
    /**
     * Submit function for input field. Can contain text or file data.
     * Return whether sending was successful.
     */
    public submit = (type: threema.MessageContentType, contents: threema.MessageData[]): Promise<any> => {
        // Validate whether a connection is available
        return new Promise((resolve, reject) => {
            if (this.stateService.state !== 'ok') {
                // Invalid connection, show toast and abort
                this.showError(this.$translate.instant('error.NO_CONNECTION'));
                return reject();
            }
            let success = true;
            let nextCallback = (index: number) => {
                if (index === contents.length - 1) {
                    if (success) {
                        resolve();
                    } else {
                        reject();
                    }
                }
            };

            switch (type) {
                case 'file':
                    // Determine file type
                    let showSendAsFileCheckbox = false;
                    let captionSupported = false;
                    for (let msg of contents as threema.FileMessageData[]) {
                        if (!msg.fileType) {
                            msg.fileType = 'application/octet-stream';
                        }
                        captionSupported = this.mimeService.isImage(msg.fileType);
                        if (this.mimeService.isImage(msg.fileType)
                            || this.mimeService.isAudio(msg.fileType)
                            || this.mimeService.isVideo(msg.fileType)) {
                            showSendAsFileCheckbox = true;
                            break;
                        }
                    }

                    // Eager translations
                    const title = this.$translate.instant('messenger.CONFIRM_FILE_SEND', {
                        senderName: (this.$filter('emojify') as any)
                            ((this.$filter('emptyToPlaceholder') as any)(this.receiver.displayName, '-')),
                    });
                    const placeholder = this.$translate.instant('messenger.CONFIRM_FILE_CAPTION');
                    const confirmSendAsFile = this.$translate.instant('messenger.CONFIRM_SEND_AS_FILE');

                    // Show confirmation dialog
                    this.$mdDialog.show({
                        clickOutsideToClose: false,
                        controller: 'SendFileController',
                        controllerAs: 'ctrl',
                        // tslint:disable:max-line-length
                        template: `
                            <md-dialog class="send-file-dialog">
                                <md-dialog-content class="md-dialog-content">
                                    <h2 class="md-title">${title}</h2>
                                    <md-input-container md-no-float class="input-caption md-prompt-input-container" ng-show="!${showSendAsFileCheckbox} || ctrl.sendAsFile || ${captionSupported}">
                                        <input maxlength="1000" md-autofocus ng-keypress="ctrl.keypress($event)" ng-model="ctrl.caption" placeholder="${placeholder}" aria-label="${placeholder}">
                                    </md-input-container>
                                    <md-input-container md-no-float class="input-send-as-file md-prompt-input-container" ng-show="${showSendAsFileCheckbox}">
                                        <md-checkbox ng-model="ctrl.sendAsFile" aria-label="${confirmSendAsFile}">
                                            ${confirmSendAsFile}
                                        </md-checkbox>
                                    </md-input-container>
                                </md-dialog-content>
                                <md-dialog-actions>
                                    <button class="md-primary md-cancel-button md-button" md-ink-ripple type="button" ng-click="ctrl.cancel()">
                                        <span translate>common.CANCEL</span>
                                    </button>
                                    <button class="md-primary md-cancel-button md-button" md-ink-ripple type="button" ng-click="ctrl.send()">
                                        <span translate>common.SEND</span>
                                    </button>
                                </md-dialog-actions>
                            </md-dialog>
                        `,
                        // tslint:enable:max-line-length
                    }).then((data) => {
                        const caption = data.caption;
                        const sendAsFile = data.sendAsFile;
                        contents.forEach((msg: threema.FileMessageData, index: number) => {
                            if (caption !== undefined && caption.length > 0) {
                                msg.caption = caption;
                            }
                            msg.sendAsFile = sendAsFile;
                            this.webClientService.sendMessage(this.$stateParams, type, msg)
                                .then(() => {
                                    nextCallback(index);
                                })
                                .catch((error) => {
                                    this.$log.error(error);
                                    this.showError(error);
                                    success = false;
                                    nextCallback(index);
                                });
                        });
                    }, angular.noop);
                    break;
                case 'text':
                    // do not show confirmation, send directly
                    contents.forEach((msg: threema.MessageData, index: number) => {
                        msg.quote = this.webClientService.getQuote(this.receiver);
                        // remove quote
                        this.webClientService.setQuote(this.receiver);
                        // send message
                        this.webClientService.sendMessage(this.$stateParams, type, msg)
                            .then(() => {
                                nextCallback(index);
                            })
                            .catch((error) => {
                                this.$log.error(error);
                                this.showError(error);
                                success = false;
                                nextCallback(index);
                            });
                    });
                    return;
                default:
                    this.$log.warn('Invalid message type:', type);
                    reject();
            }
        });
    }

    /**
     * Something was typed.
     *
     * In contrast to startTyping, this method is is always called, not just if
     * the text field is non-empty.
     */
    public onTyping = (text: string) => {
        // Update draft
        this.webClientService.setDraft(this.receiver, text);
    }

    public onUploading = (inProgress: boolean, percentCurrent: number = null, percentFull: number = null)  => {
        this.uploading.enabled = inProgress;
        this.uploading.value1 = Number(percentCurrent);
        this.uploading.value2 = Number(percentCurrent);
    }

    /**
     * We started typing.
     */
    public startTyping = () => {
        // Notify app
        this.webClientService.sendMeIsTyping(this.$stateParams, true);
    }

    /**
     * We stopped typing.
     */
    public stopTyping = () => {
        // Notify app
        this.webClientService.sendMeIsTyping(this.$stateParams, false);
    }

    /**
     * User scrolled to the top of the chat.
     */
    public topOfChat(): void {
        this.requestMessages();
    }

    public requestMessages(): void {
        let refMsgId = this.webClientService.requestMessages(this.$stateParams);

        if (refMsgId !== null
            && refMsgId !== undefined) {
            // new message are requested, scroll to refMsgId
            this.latestRefMsgId = refMsgId;
        } else {
            this.latestRefMsgId = null;
        }
    }

    public showReceiver(ev): void {
        this.$state.go('messenger.home.detail', this.receiver);
    }

    public hasMoreMessages(): boolean {
        return this.hasMore;
    }

    /**
     * A message has been seen. Report it to the app, with a small delay to
     * avoid sending too many messages at once.
     */
    public msgRead(msgId: number): void {
        if (msgId > this.lastReadMsgId) {
            this.lastReadMsgId = msgId;
        }
        if (!this.msgReadReportPending) {
            this.msgReadReportPending = true;
            const receiver = angular.copy(this.receiver);
            receiver.type = this.type;
            this.$timeout(() => {
                this.webClientService.requestRead(receiver, this.lastReadMsgId);
                this.msgReadReportPending = false;
            }, 500);
        }
    }

    public goBack(): void {
        this.receiverService.setActive(undefined);
        // redirect to messenger home
        this.$state.go('messenger.home');
    }

    /**
     * Scroll to bottom of chat.
     */
    public scrollDown(): void {
        this.domChatElement.scrollTop = this.domChatElement.scrollHeight;
    }

    /**
     * Only show the scroll to bottom button if user scrolled more than 10px
     * away from bottom.
     */
    private updateScrollJump(): void {
        const chat = this.domChatElement;
        this.showScrollJump = chat.scrollHeight - (chat.scrollTop + chat.offsetHeight) > 10;
    }
}

class NavigationController {

    public name = 'navigation';

    private webClientService: WebClientService;
    private receiverService: ReceiverService;
    private stateService: StateService;
    private trustedKeyStoreService: TrustedKeyStoreService;

    private activeTab: 'contacts' | 'conversations' = 'conversations';
    private searchVisible = false;
    private searchText: string = '';

    private $mdDialog;
    private $translate: ng.translate.ITranslateService;
    private $state: ng.ui.IStateService;

    public static $inject = [
        '$log', '$state', '$mdDialog', '$translate',
        'WebClientService', 'StateService', 'ReceiverService', 'TrustedKeyStore',
    ];

    constructor($log: ng.ILogService, $state: ng.ui.IStateService,
                $mdDialog: ng.material.IDialogService, $translate: ng.translate.ITranslateService,
                webClientService: WebClientService, stateService: StateService,
                receiverService: ReceiverService,
                trustedKeyStoreService: TrustedKeyStoreService) {

        // Redirect to welcome if necessary
        if (stateService.state === 'error') {
            $log.debug('NavigationController: WebClient not yet running, redirecting to welcome screen');
            $state.go('welcome');
            return;
        }

        this.webClientService = webClientService;
        this.receiverService = receiverService;
        this.stateService = stateService;
        this.trustedKeyStoreService = trustedKeyStoreService;
        this.$mdDialog = $mdDialog;
        this.$translate = $translate;
        this.$state = $state;
    }

    public contacts(): threema.ContactReceiver[] {
        return Array.from(this.webClientService.contacts.values()) as threema.ContactReceiver[];
    }

    /**
     * Search for `needle` in the `haystack`. The search is case insensitive.
     */
    private matches(haystack: string, needle: string): boolean {
        return haystack.toLowerCase().replace('\n', ' ').indexOf(needle.trim().toLowerCase()) !== -1;
    }

    /**
     * Predicate function used for conversation filtering.
     *
     * Match by contact name *or* id *or* last message text.
     */
    private searchConversation = (value: threema.Conversation, index, array): boolean => {
        return this.searchText === ''
            || this.matches(value.receiver.displayName, this.searchText)
            || (value.latestMessage && value.latestMessage.body
                && this.matches(value.latestMessage.body, this.searchText))
            || (value.receiver.id.length === 8 && this.matches(value.receiver.id, this.searchText));
    }

    /**
     * Predicate function used for contact filtering.
     *
     * Match by contact name *or* id.
     */
    private searchContact = (value, index, array): boolean => {
        return this.searchText === ''
            || value.displayName.toLowerCase().indexOf(this.searchText.toLowerCase()) !== -1
            || value.id.toLowerCase().indexOf(this.searchText.toLowerCase()) !== -1;
    }

    public isVisible(conversation: threema.Conversation) {
        return conversation.receiver.visible;
    }
    public conversations(): threema.Conversation[] {
        return this.webClientService.conversations.get();
    }

    public isActive(value: threema.Conversation): boolean {
        return this.receiverService.isConversationActive(value);
    }

    /**
     * Show dialog.
     */
    public showDialog(name, ev) {
        this.$mdDialog.show({
            controller: DialogController,
            controllerAs: 'ctrl',
            templateUrl: 'partials/dialog.' + name + '.html',
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: true,
            fullscreen: true,
        });
    }

    /**
     * Show about dialog.
     */
    public about(ev): void {
        this.showDialog('about', ev);
    }

    /**
     * Show settings dialog.
     */
    public settings(ev): void {
        this.$mdDialog.show({
            controller: SettingsController,
            controllerAs: 'ctrl',
            templateUrl: 'partials/dialog.settings.html',
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: true,
            fullscreen: true,
        });
    }

    /**
     * Return whether a trusted key is available.
     */
    public isPersistent(): boolean {
        return this.trustedKeyStoreService.hasTrustedKey();
    }

    /**
     * Close the session.
     */
    public closeSession(ev): void {
        const confirm = this.$mdDialog.confirm()
            .title(this.$translate.instant('common.SESSION_CLOSE'))
            .textContent(this.$translate.instant('common.CONFIRM_CLOSE_BODY'))
            .targetEvent(ev)
            .ok(this.$translate.instant('common.YES'))
            .cancel(this.$translate.instant('common.CANCEL'));
        this.$mdDialog.show(confirm).then(() => {
            const deleteStoredData = false;
            const resetPush = true;
            const redirect = true;
            this.webClientService.stop(true, deleteStoredData, resetPush, redirect);
        }, () => {
            // do nothing
        });
    }

    /**
     * Close and delete the session.
     */
    public deleteSession(ev): void {
        const confirm = this.$mdDialog.confirm()
            .title(this.$translate.instant('common.SESSION_DELETE'))
            .textContent(this.$translate.instant('common.CONFIRM_DELETE_CLOSE_BODY'))
            .targetEvent(ev)
            .ok(this.$translate.instant('common.YES'))
            .cancel(this.$translate.instant('common.CANCEL'));
        this.$mdDialog.show(confirm).then(() => {
            const deleteStoredData = true;
            const resetPush = true;
            const redirect = true;
            this.webClientService.stop(true, deleteStoredData, resetPush, redirect);
        }, () => {
            // do nothing
        });

    }

    public addContact(ev): void {
        this.$state.go('messenger.home.create', {
            type: 'contact',
        });
    }

    public createGroup(ev): void {
        this.$state.go('messenger.home.create', {
            type: 'group',
        });
    }

    public createDistributionList(ev): void {
        this.$state.go('messenger.home.create', {
            type: 'distributionList',
        });
    }
    /**
     * Toggle search bar.
     */
    public toggleSearch(): void {
        this.searchVisible = !this.searchVisible;
    }

    public getMyIdentity(): threema.Identity {
        return this.webClientService.getMyIdentity();
    }

    public showMyIdentity(): boolean {
        return this.getMyIdentity() !== undefined;
    }
}

class MessengerController {
    public name = 'messenger';
    private receiverService: ReceiverService;
    private $state;
    private webClientService: WebClientService;

    public static $inject = [
        '$scope', '$state', '$log', '$mdDialog', '$translate',
        'StateService', 'ReceiverService', 'WebClientService', 'ControllerService',
    ];
    constructor($scope, $state, $log: ng.ILogService, $mdDialog: ng.material.IDialogService,
                $translate: ng.translate.ITranslateService,
                stateService: StateService, receiverService: ReceiverService,
                webClientService: WebClientService, controllerService: ControllerService) {
        // Redirect to welcome if necessary
        if (stateService.state === 'error') {
            $log.debug('MessengerController: WebClient not yet running, redirecting to welcome screen');
            $state.go('welcome');
            return;
        }

        controllerService.setControllerName('messenger');

        this.receiverService = receiverService;
        this.$state = $state;
        this.webClientService = webClientService;

        // watch for alerts
        $scope.$watch(() => webClientService.alerts, (alerts: threema.Alert[]) => {
            if (alerts.length > 0) {
                angular.forEach(alerts, (alert: threema.Alert) => {
                    $mdDialog.show(
                        $mdDialog.alert()
                            .clickOutsideToClose(true)
                            .title(alert.type)
                            .textContent(alert.message)
                            .ok($translate.instant('common.OK')));
                });
                // clean array
                webClientService.alerts = [];
            }
        }, true);

        this.webClientService.setReceiverListener({
            onRemoved(receiver: threema.Receiver) {
                switch ($state.current.name) {
                    case 'messenger.home.conversation':
                    case 'messenger.home.detail':
                    case 'messenger.home.edit':
                        if ($state.params !== undefined
                            && $state.params.type !== undefined
                            && $state.params.id !== undefined) {
                            if ($state.params.type === receiver.type
                                && $state.params.id === receiver.id) {
                                // conversation or sub form is open, redirect to home!
                                $state.go('messenger.home', null, {location: 'replace'});
                            }
                        }
                        break;
                    default:
                        $log.warn('Ignored onRemoved event for state', $state.current.name);
                }
            },
        });
    }

    public showDetail(): boolean {
        return !this.$state.is('messenger.home');
    }
}

class ReceiverDetailController {
    private logTag: string = '[ReceiverDetailController]';

    public $mdDialog: any;
    public $state: ng.ui.IStateService;
    public receiver: threema.Receiver;
    public me: threema.MeReceiver;
    public title: string;
    public fingerPrint?: string;
    private fingerPrintService: FingerPrintService;
    private contactService: ContactService;
    private showGroups = false;
    private showDistributionLists = false;
    private inGroups: threema.GroupReceiver[] = [];
    private inDistributionLists: threema.DistributionListReceiver[] = [];
    private hasSystemEmails = false;
    private hasSystemPhones = false;
    private isWorkReceiver = false;
    private showBlocked = () => false;

    private controllerModel: threema.ControllerModel;

    public static $inject = [
        '$log', '$stateParams', '$state', '$mdDialog',
        'WebClientService', 'FingerPrintService', 'ContactService', 'ControllerModelService',
    ];
    constructor($log: ng.ILogService, $stateParams, $state: ng.ui.IStateService, $mdDialog: ng.material.IDialogService,
                webClientService: WebClientService, fingerPrintService: FingerPrintService,
                contactService: ContactService, controllerModelService: ControllerModelService) {

        this.$mdDialog = $mdDialog;
        this.$state = $state;
        this.fingerPrintService = fingerPrintService;
        this.contactService = contactService;

        this.receiver = webClientService.receivers.getData($stateParams);
        this.me = webClientService.me;

        // Append members
        if (this.receiver.type === 'contact') {
            let contactReceiver = (<threema.ContactReceiver> this.receiver);

            this.contactService.requiredDetails(contactReceiver)
                .then(() => {
                    this.hasSystemEmails = contactReceiver.systemContact.emails.length > 0;
                    this.hasSystemPhones = contactReceiver.systemContact.phoneNumbers.length > 0;
                })
                .catch(() => {
                    // do nothing
                });

            this.isWorkReceiver = contactReceiver.identityType === threema.IdentityType.Work;
            this.fingerPrint = this.fingerPrintService.generate(contactReceiver.publicKey);
            webClientService.groups.forEach((groupReceiver: threema.GroupReceiver) => {
                // check if my identity is a member
                if (groupReceiver.members.indexOf(contactReceiver.id) !== -1) {
                    this.inGroups.push(groupReceiver);
                    this.showGroups = true;
                }
            });

            webClientService.distributionLists.forEach(
                (distributionListReceiver: threema.DistributionListReceiver) => {
                    // check if my identity is a member
                    if (distributionListReceiver.members.indexOf(contactReceiver.id) !== -1) {
                        this.inDistributionLists.push(distributionListReceiver);
                        this.showDistributionLists = true;
                    }
                },
            );

            this.showBlocked = () => contactReceiver.isBlocked;
        }

        switch (this.receiver.type) {
            case 'me':
                $log.warn(this.logTag, 'Cannot view own contact');
                $state.go('messenger.home');
                return;
            case 'contact':
                this.controllerModel = controllerModelService
                    .contact(this.receiver as threema.ContactReceiver, ControllerModelMode.VIEW);
                break;
            case 'group':
                this.controllerModel = controllerModelService
                    .group(this.receiver as threema.GroupReceiver, ControllerModelMode.VIEW);
                break;
            case 'distributionList':
                this.controllerModel = controllerModelService
                    .distributionList(this.receiver as threema.DistributionListReceiver, ControllerModelMode.VIEW);
                break;
            default:
                $log.error(this.logTag, 'Cannot initialize controller model:',
                    'Invalid receiver type "' + this.receiver.type + '"');
                $state.go('messenger.home');
                return;
        }

        // If this receiver may not be viewed, navigate to "home" view
        if (this.controllerModel.canView() === false) {
            $log.warn(this.logTag, 'Cannot view this receiver, redirecting to home');
            this.$state.go('messenger.home');
            return;
        }

        // If this receiver is removed, navigate to "home" view
        this.controllerModel.setOnRemoved((receiverId: string) => {
            $log.warn(this.logTag, 'Receiver removed, redirecting to home');
            this.$state.go('messenger.home');
        });

    }

    public chat(): void {
        this.$state.go('messenger.home.conversation', {
            type: this.receiver.type,
            id: this.receiver.id,
            initParams: null,
        });
    }

    public edit(): void {
        if (!this.controllerModel.canEdit()) {
            return;
        }
        this.$state.go('messenger.home.edit', {
            type: this.receiver.type,
            id: this.receiver.id,
            initParams: null,
        });
    }

    public goBack(): void {
        window.history.back();
    }

}

/**
 * Control edit a group or a contact
 * fields, validate and save routines are implemented in the specific ControllerModel
 */
class ReceiverEditController {
    private logTag: string = '[ReceiverEditController]';

    public $mdDialog: any;
    public $state: ng.ui.IStateService;
    private $translate: ng.translate.ITranslateService;

    public title: string;
    private $timeout: ng.ITimeoutService;
    private execute: ExecuteService;
    public loading = false;

    private controllerModel: threema.ControllerModel;
    public type: string;

    public static $inject = [
        '$log', '$stateParams', '$state', '$mdDialog',
        '$timeout', '$translate', 'WebClientService', 'ControllerModelService',
    ];
    constructor($log: ng.ILogService, $stateParams, $state: ng.ui.IStateService,
                $mdDialog, $timeout: ng.ITimeoutService, $translate: ng.translate.ITranslateService,
                webClientService: WebClientService, controllerModelService: ControllerModelService) {

        this.$mdDialog = $mdDialog;
        this.$state = $state;
        this.$timeout = $timeout;
        this.$translate = $translate;

        const receiver = webClientService.receivers.getData($stateParams);
        switch (receiver.type) {
            case 'me':
                $log.warn(this.logTag, 'Cannot edit own contact');
                $state.go('messenger.home');
                return;
            case 'contact':
                this.controllerModel = controllerModelService.contact(
                    receiver as threema.ContactReceiver,
                    ControllerModelMode.EDIT,
                );
                break;
            case 'group':
                this.controllerModel = controllerModelService.group(
                    receiver as threema.GroupReceiver,
                    ControllerModelMode.EDIT,
                );
                break;
            case 'distributionList':
                this.controllerModel = controllerModelService.distributionList(
                    receiver as threema.DistributionListReceiver,
                    ControllerModelMode.EDIT,
                );
                break;
            default:
                $log.error(this.logTag, 'Cannot initialize controller model:',
                    'Invalid receiver type "' + receiver.type + '"');
                $state.go('messenger.home');
                return;
        }
        this.type = receiver.type;

        // If this receiver may not be viewed, navigate to "home" view
        if (this.controllerModel.canView() === false) {
            $log.warn(this.logTag, 'Cannot view this receiver, redirecting to home');
            this.$state.go('messenger.home');
            return;
        }

        this.execute = new ExecuteService($log, $timeout, 1000);
    }

    public keypress($event: KeyboardEvent): void {
        if ($event.key === 'Enter' && this.controllerModel.isValid()) {
            this.save();
        }
    }

    public save(): void {

        // show loading
        this.loading = true;

        // validate first
        this.execute.execute(this.controllerModel.save())
            .then((receiver: threema.Receiver) => {
                this.goBack();
            })
            .catch((errorCode) => {
                this.showError(errorCode);
            });
    }

    public isSaving(): boolean {
        return this.execute !== undefined
            && this.execute.isRunning();
    }

    public showError(errorCode): void {
        this.$mdDialog.show(
            this.$mdDialog.alert()
                .clickOutsideToClose(true)
                .title(this.controllerModel.subject)
                .textContent(this.$translate.instant('validationError.editReceiver.' + errorCode))
                .ok(this.$translate.instant('common.OK')));
    }

    public goBack(): void {
        window.history.back();
    }
}

/**
 * Control creating a group or adding contact
 * fields, validate and save routines are implemented in the specific ControllerModel
 */
class ReceiverCreateController {
    private logTag: string = '[ReceiverEditController]';

    public $mdDialog: any;
    private loading = false;
    private $timeout: ng.ITimeoutService;
    private $log: ng.ILogService;
    private $state: ng.ui.IStateService;
    private $mdToast: any;
    public identity = '';
    private $translate: any;
    public type: string;
    private execute: ExecuteService;

    public controllerModel: threema.ControllerModel;

    public static $inject = ['$stateParams', '$mdDialog', '$mdToast', '$translate',
        '$timeout', '$state', '$log', 'ControllerModelService'];
    constructor($stateParams: threema.CreateReceiverStateParams, $mdDialog, $mdToast, $translate,
                $timeout: ng.ITimeoutService, $state: ng.ui.IStateService, $log: ng.ILogService,
                controllerModelService: ControllerModelService) {
        this.$mdDialog = $mdDialog;
        this.$timeout = $timeout;
        this.$state = $state;
        this.$log = $log;
        this.$mdToast = $mdToast;
        this.$translate = $translate;

        this.type = $stateParams.type;
        switch (this.type) {
            case 'me':
                $log.warn(this.logTag, 'Cannot create own contact');
                $state.go('messenger.home');
                return;
            case 'contact':
                this.controllerModel = controllerModelService.contact(null, ControllerModelMode.NEW);
                if ($stateParams.initParams !== null) {
                    (this.controllerModel as ContactControllerModel)
                        .identity = $stateParams.initParams.identity;
                }
                break;
            case 'group':
                this.controllerModel = controllerModelService.group(null, ControllerModelMode.NEW);
                break;
            case 'distributionList':
                this.controllerModel = controllerModelService.distributionList(null, ControllerModelMode.NEW);
                break;
            default:
                this.$log.error('invalid type', this.type);
        }
        this.execute = new ExecuteService($log, $timeout, 1000);
    }

    public isSaving(): boolean {
        return this.execute.isRunning();
    }

    public goBack(): void {
        if (!this.isSaving()) {
            window.history.back();
        }
    }

    private showAddError(errorCode: String): void {
        if (errorCode === undefined) {
            errorCode = 'invalid_entry';
        }
        this.$mdDialog.show(
            this.$mdDialog.alert()
                .clickOutsideToClose(true)
                .title(this.controllerModel.subject)
                .textContent(this.$translate.instant('validationError.createReceiver.' + errorCode))
                .ok(this.$translate.instant('common.OK')),
        );
    }

    public keypress($event: KeyboardEvent): void {
        if ($event.key === 'Enter' && this.controllerModel.isValid()) {
            this.create();
        }
    }

    public create(): void {
        // show loading
        this.loading = true;

        // validate first
        this.execute.execute(this.controllerModel.save())
            .then((receiver: threema.Receiver) => {
                this.$state.go('messenger.home.detail', receiver, {location: 'replace'});
            })
            .catch((errorCode) => {
                this.showAddError(errorCode);
            });
    }
}

angular.module('3ema.messenger', ['ngMaterial'])

.config(['$stateProvider', function($stateProvider: ng.ui.IStateProvider) {

    $stateProvider

        .state('messenger', {
            abstract: true,
            templateUrl: 'partials/messenger.html',
            controller: 'MessengerController',
            controllerAs: 'ctrl',
        })

        .state('messenger.home', {
            url: '/messenger',
            views: {
                navigation: {
                    templateUrl: 'partials/messenger.navigation.html',
                    controller: 'NavigationController',
                    controllerAs: 'ctrl',
                },
                content: {
                    // Required because navigation should not be changed,
                    template: '<div ui-view></div>',
                },
            },
        })

        .state('messenger.home.conversation', {
            url: '/conversation/{type}/{id}',
            templateUrl: 'partials/messenger.conversation.html',
            controller: 'ConversationController',
            controllerAs: 'ctrl',
            params: {initParams: null},
        })

        .state('messenger.home.detail', {
            url: '/conversation/{type}/{id}/detail',
            templateUrl: 'partials/messenger.receiver.html',
            controller: 'ReceiverDetailController',
            controllerAs: 'ctrl',
        })
        .state('messenger.home.edit', {
            url: '/conversation/{type}/{id}/detail/edit',
            templateUrl: 'partials/messenger.receiver.edit.html',
            controller: 'ReceiverEditController',
            controllerAs: 'ctrl',
        })
        .state('messenger.home.create', {
            url: '/receiver/create/{type}',
            templateUrl: 'partials/messenger.receiver.create.html',
            controller: 'ReceiverCreateController',
            controllerAs: 'ctrl',
            params: {initParams: null},
        })
    ;
}])

.controller('SendFileController', SendFileController)
.controller('MessengerController', MessengerController)
.controller('ConversationController', ConversationController)
.controller('NavigationController', NavigationController)
.controller('ReceiverDetailController', ReceiverDetailController)
.controller('ReceiverEditController', ReceiverEditController)
.controller('ReceiverCreateController', ReceiverCreateController)
;
