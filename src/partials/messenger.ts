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

import {
    StateParams as UiStateParams,
    StateProvider as UiStateProvider,
    StateService as UiStateService,
    Transition as UiTransition,
    TransitionService as UiTransitionService,
} from '@uirouter/angularjs';

import {ContactControllerModel} from '../controller_model/contact';
import {bufferToUrl, hasValue, logAdapter, supportsPassive, throttle, u8aToHex} from '../helpers';
import {ContactService} from '../services/contact';
import {ControllerService} from '../services/controller';
import {ControllerModelService} from '../services/controller_model';
import {FingerPrintService} from '../services/fingerprint';
import {TrustedKeyStoreService} from '../services/keystore';
import {MimeService} from '../services/mime';
import {NotificationService} from '../services/notification';
import {ReceiverService} from '../services/receiver';
import {SettingsService} from '../services/settings';
import {StateService} from '../services/state';
import {TimeoutService} from '../services/timeout';
import {VersionService} from '../services/version';
import {WebClientService} from '../services/webclient';
import {isContactReceiver} from '../typeguards';

// Type aliases
import ControllerModelMode = threema.ControllerModelMode;

class DialogController {
    public $mdDialog: ng.material.IDialogService;
    public activeElement: HTMLElement | null;
    public config: threema.Config;

    public static $inject = ['$mdDialog', 'CONFIG'];
    constructor($mdDialog: ng.material.IDialogService, CONFIG: threema.Config) {
        this.$mdDialog = $mdDialog;
        this.activeElement = document.activeElement as HTMLElement;
        this.config = CONFIG;
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
    public static $inject = ['$mdDialog', '$log', 'CONFIG', 'preview'];
    private logTag: string = '[SendFileController]';

    public caption: string;
    public sendAsFile: boolean = false;
    private preview: threema.FileMessageData | null = null;
    public previewDataUrl: string | null = null;

    constructor($mdDialog: ng.material.IDialogService,
                $log: ng.ILogService,
                CONFIG: threema.Config,
                preview: threema.FileMessageData) {
        super($mdDialog, CONFIG);
        this.preview = preview;
        if (preview !== null) {
            this.previewDataUrl = bufferToUrl(
                this.preview.data,
                this.preview.fileType,
                logAdapter($log.warn, this.logTag),
            );
        }
    }

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

    public hasPreview(): boolean {
        return this.previewDataUrl !== null && this.previewDataUrl !== undefined;
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

interface ConversationStateParams extends UiStateParams {
    type: threema.ReceiverType;
    id: string;
    initParams: null | {text: string | null};
}

class ConversationController {
    public name = 'navigation';
    private logTag: string = '[ConversationController]';

    // Angular services
    private $stateParams;
    private $state: UiStateService;
    private $log: ng.ILogService;
    private $scope: ng.IScope;
    private $rootScope: ng.IRootScopeService;
    private $filter: ng.IFilterService;
    private $translate: ng.translate.ITranslateService;

    // Own services
    private webClientService: WebClientService;
    private receiverService: ReceiverService;
    private stateService: StateService;
    private mimeService: MimeService;
    private timeoutService: TimeoutService;

    // Third party services
    private $mdDialog: ng.material.IDialogService;
    private $mdToast: ng.material.IToastService;

    // Controller model
    private controllerModel: threema.ControllerModel<threema.Receiver>;

    // DOM Elements
    private domChatElement: HTMLElement;

    // Scrolling
    public showScrollJump: boolean = false;

    // The conversation receiver
    public receiver: threema.Receiver;
    public conversation: threema.Conversation;
    public type: threema.ReceiverType;

    // The conversation messages
    private messages: threema.Message[];

    // This will be set to true as soon as the initial messages have been loaded
    private initialized = false;

    // Mentions
    public allMentions: threema.Mention[] = [];
    public currentMentions: threema.Mention[] = [];
    public currentMentionFilterWord = null;
    public selectedMention: number = null;

    public message: string = '';
    public lastReadMsg: threema.Message | null = null;
    public msgReadReportPending = false;
    private hasMore = true;
    private latestRefMsgId: string | null = null;
    private allText: string;
    public initialData: threema.InitialConversationData = {
        draft: '',
        initialText: '',
    };
    private locked = false;
    public maxTextLength: number;
    public isTyping = (): boolean => false;

    private uploading = {
        enabled: false,
        value1: 0,
        value2: 0,
    };

    public static $inject = [
        '$stateParams', '$log', '$scope', '$rootScope',
        '$mdDialog', '$mdToast', '$translate', '$filter',
        '$state', '$transitions',
        'WebClientService', 'StateService', 'ReceiverService', 'MimeService', 'VersionService',
        'ControllerModelService', 'TimeoutService',
    ];
    constructor($stateParams: ConversationStateParams,
                $log: ng.ILogService,
                $scope: ng.IScope,
                $rootScope: ng.IRootScopeService,
                $mdDialog: ng.material.IDialogService,
                $mdToast: ng.material.IToastService,
                $translate: ng.translate.ITranslateService,
                $filter: ng.IFilterService,
                $state: UiStateService,
                $transitions: UiTransitionService,
                webClientService: WebClientService,
                stateService: StateService,
                receiverService: ReceiverService,
                mimeService: MimeService,
                versionService: VersionService,
                controllerModelService: ControllerModelService,
                timeoutService: TimeoutService) {
        this.$stateParams = $stateParams;
        this.$log = $log;
        this.webClientService = webClientService;
        this.receiverService = receiverService;
        this.stateService = stateService;
        this.mimeService = mimeService;
        this.timeoutService = timeoutService;

        this.$state = $state;
        this.$scope = $scope;
        this.$filter = $filter;
        this.$rootScope = $rootScope;

        this.$mdDialog = $mdDialog;
        this.$mdToast = $mdToast;
        this.$translate = $translate;

        // Close any showing dialogs
        this.$mdDialog.cancel();

        this.maxTextLength = this.webClientService.getMaxTextLength();
        this.allText = this.$translate.instant('messenger.ALL');

        // On every navigation event, close all dialogs using ui-router transition hooks.
        $transitions.onStart({}, function(trans: UiTransition) {
            const $mdDialogInner: ng.material.IDialogService = trans.injector().get('$mdDialog');
            $mdDialogInner.cancel();
        });

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
            }, 100, this), supportsPassive() ? {passive: true} : false);
        }

        // Set receiver, conversation and type
        try {
            this.receiver = webClientService.receivers.getData({type: $stateParams.type, id: $stateParams.id});
            this.conversation = this.webClientService.conversations.find(this.receiver);
            this.type = $stateParams.type;

            if (this.receiver.type === undefined) {
                this.receiver.type = this.type;
            }

            // Initialize controller model
            const mode = ControllerModelMode.CHAT;
            switch (this.receiver.type) {
                case 'me':
                    this.controllerModel = controllerModelService.me(
                        this.receiver as threema.MeReceiver, mode);
                    break;
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

            // Check if this receiver may be chatted with
            if (this.controllerModel.canChat() === false) {
                $log.warn(this.logTag, 'Cannot chat with this receiver, redirecting to home');
                $state.go('messenger.home');
                return;
            }

            // Initial set locked state
            this.locked = this.receiver.locked;

            this.receiverService.setActive(this.receiver);

            if (!this.receiver.locked) {
                let latestHeight = 0;

                // Subscribe to messages
                this.messages = this.webClientService.messages.register(
                    this.receiver,
                    this.$scope,
                    (e, allMessages: threema.Message[], hasMore: boolean) => {
                        // This function is called every time there are new or removed messages.

                        // Update data
                        this.messages = allMessages;
                        const wasInitialized = this.initialized;
                        this.initialized = true;
                        this.hasMore = hasMore;

                        // Update "first unread" divider
                        if (!wasInitialized) {
                            this.webClientService.messages.updateFirstUnreadMessage(this.receiver);
                        }

                        // Autoscroll
                        if (this.latestRefMsgId !== null) {
                            // scroll to div..
                            this.domChatElement.scrollTop = this.domChatElement.scrollHeight - latestHeight;
                            this.latestRefMsgId = null;
                        }
                        latestHeight = this.domChatElement.scrollHeight;
                    },
                );

                // Update "first unread" divider
                this.webClientService.messages.updateFirstUnreadMessage(this.receiver);

                // Enable mentions only in group chats
                if (this.type === 'group') {
                    this.allMentions.push({
                        identity: null,
                        query: this.$translate.instant('messenger.ALL').toLowerCase(),
                        isAll: true,
                    });
                    this.controllerModel.getMembers().forEach((identity: string) => {
                        const contactReceiver = this.webClientService.contacts.get(identity);
                        if (contactReceiver) {
                            this.allMentions.push({
                                identity: identity,
                                query: (contactReceiver.displayName + ' ' + identity).toLowerCase(),
                                isAll: false,
                            });
                        }
                    });
                }

                // Set initial data
                this.initialData = {
                    draft: webClientService.getDraft(this.receiver),
                    initialText: $stateParams.initParams ? $stateParams.initParams.text : '',
                };

                // Set isTyping function for contacts
                if (isContactReceiver(this.receiver)) {
                    this.isTyping = () => this.webClientService.isTyping(this.receiver as threema.ContactReceiver);
                }

                // Due to a bug in Safari, sometimes the in-view element does not trigger when initially loading a chat.
                // As a workaround, manually trigger the initial message loading.
                if (this.webClientService.messages.getList(this.receiver).length === 0) {
                    this.requestMessages();
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

    public showError(errorMessage?: string, hideDelayMs = 3000) {
        if (errorMessage === undefined || errorMessage.length === 0) {
            errorMessage = this.$translate.instant('error.ERROR_OCCURRED');
        }
        this.$mdToast.show(
            this.$mdToast.simple()
                .textContent(errorMessage)
                .position('bottom center')
                .hideDelay(hideDelayMs));
    }

    public showMessage(msgTranslation: string, hideDelayMs = 3000) {
        this.$mdToast.show(
            this.$mdToast.simple()
                .textContent(this.$translate.instant(msgTranslation))
                .position('bottom center')
                .hideDelay(hideDelayMs));
    }

    /**
     * Submit function for input field. Can contain text or file data.
     * Return whether sending was successful.
     */
    public submit = (type: threema.MessageContentType, contents: threema.MessageData[]): Promise<any> => {
        // Validate whether a connection is available
        return new Promise((resolve, reject) => {
            if (!this.stateService.readyToSubmit(this.webClientService.chosenTask)) {
                // Invalid connection, show toast and abort
                this.showError(this.$translate.instant('error.NO_CONNECTION'));
                return reject();
            }
            let success = true;
            const nextCallback = (index: number) => {
                if (index === contents.length - 1) {
                    if (success) {
                        resolve();
                    } else {
                        reject('Message sending unsuccessful');
                    }
                }
            };

            switch (type) {
                case 'file':
                    // Determine file type
                    let showSendAsFileCheckbox = false;
                    let captionSupported = false;
                    for (const msg of contents as threema.FileMessageData[]) {
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

                    // Prepare preview
                    let preview: threema.FileMessageData | null = null;
                    if (contents.length === 1) {
                        const msg = contents[0] as threema.FileMessageData;
                        if (this.mimeService.isImage(msg.fileType)) {
                            preview = msg;
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
                        locals: { preview: preview },
                        controller: 'SendFileController',
                        controllerAs: 'ctrl',
                        // tslint:disable:max-line-length
                        template: `
                            <md-dialog class="send-file-dialog">
                                <md-dialog-content class="md-dialog-content">
                                    <h2 class="md-title">${title}</h2>
                                    <img class="preview" ng-if="ctrl.hasPreview()" ng-src="{{ ctrl.previewDataUrl }}">
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
                        // TODO: This should probably be moved into the
                        //       WebClientService as a specific method for the
                        //       type.
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
                                    // TODO: Should probably be an alert instead of a toast
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
                        // TODO: This should probably be moved into the
                        //       WebClientService as a specific method for the
                        //       type.
                        this.webClientService.sendMessage(this.$stateParams, type, msg)
                            .then(() => {
                                nextCallback(index);
                            })
                            .catch((error) => {
                                this.$log.error(error);
                                // TODO: Should probably be an alert instead of a toast
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
    public onTyping = (text: string, currentWord: threema.WordResult = null) => {
        // Update draft
        this.webClientService.setDraft(this.receiver, text);

        /* Make mentions readonly for now
        if (currentWord && currentWord.substr(0, 1) === '@') {
            this.currentMentionFilterWord = currentWord.substr(1);
            const query = this.currentMentionFilterWord.toLowerCase().trim();
            const selectedMentionObject = this.getSelectedMention();
            this.currentMentions = this.allMentions.filter((i) => {
                if (query.length === 0) {
                    return true;
                }
                return i.query.indexOf(query) >= 0;
            });
            // If only one mention is filtered, select them
            if (this.currentMentions.length === 1) {
                this.selectedMention = 0;
            } else if (selectedMentionObject !== null) {
                // Get the new position of the latest selected mention object
                this.selectedMention = null;
                this.selectedMention = this.currentMentions.findIndex((m) => {
                    return m.identity === selectedMentionObject.identity;
                });
            }
        } else {
            this.currentMentionFilterWord = null;
        }
        */
    }

    public getSelectedMention = (): threema.Mention => {
        if (this.selectedMention === null
            || this.selectedMention < 0
            || this.selectedMention > this.currentMentions.length - 1) {
            return null;
        }

        return this.currentMentions[this.selectedMention];
    }

    public showMentionSelector = (): boolean => {
        return this.type === 'group'
            && this.currentMentionFilterWord != null
            && this.currentMentions.length > 0;
    }

    /**
     * Handle mention selector navigation
     */
    public onComposeKeyDown = (ev: KeyboardEvent): boolean => {
        /* Make mentions readonly for now
        if (this.showMentionSelector() && !ev.shiftKey) {
            let move = ev.key === 'ArrowDown' ? 1 : (ev.key === 'ArrowUp' ? - 1 : 0);
            if (move !== 0) {
                // Move cursors position in mention selector
                if (this.selectedMention !== null) {
                    this.selectedMention += move;
                    // Fix positions
                    if (this.selectedMention > this.currentMentions.length - 1) {
                        this.selectedMention = 0;
                    } else if (this.selectedMention < 0) {
                        this.selectedMention = this.currentMentions.length - 1;
                    }
                } else {
                    this.selectedMention = 0;
                }
                return false;
            }

            if (ev.key === 'Enter') {
                // Enter, select current mention
                const selectedMentionObject = this.getSelectedMention();
                if (selectedMentionObject === null) {
                    // If no (or a invalid) mention is selected, select the first mention
                    this.selectedMention = 0;
                } else {
                    this.onMentionSelected(selectedMentionObject.identity);
                }
                return false;
            }
        }
        */
        return true;
    }

    public onMentionSelected(identity: string = null): void {
        this.$rootScope.$broadcast('onMentionSelected', {
            query: '@' + this.currentMentionFilterWord,
            mention: '@[' + (identity === null ? '@@@@@@@@' : identity.toUpperCase()) + ']',
        });
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
        const refMsgId = this.webClientService.requestMessages(this.$stateParams);

        // TODO: Couldn't this cause a race condition when called twice in parallel?
        //       Might be related to #277.
        if (hasValue(refMsgId)) {
            // New messages are requested, scroll to refMsgId
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
    public msgRead(message: threema.Message): void {
        // Ignore status messages
        if (message.type === 'status') {
            return;
        }

        // Update lastReadMsg
        if (this.lastReadMsg === null || message.sortKey >= this.lastReadMsg.sortKey) {
            this.lastReadMsg = message;
        }

        if (!this.msgReadReportPending) {
            // Don't send a read message for messages that are already read.
            // (Note: Ignore own messages since those are always read.)
            if (!message.isOutbox && !message.unread) {
                return;
            }

            // Don't send a read message for conversations that have no unread messages.
            const conversation = this.webClientService.conversations.find(this.receiver);
            if (conversation !== null && conversation.unreadCount === 0) {
                return;
            }

            this.msgReadReportPending = true;
            const receiver = angular.copy(this.receiver);
            receiver.type = this.type;
            this.timeoutService.register(() => {
                this.webClientService.requestRead(receiver, this.lastReadMsg);
                this.msgReadReportPending = false;
            }, 300, false, 'requestRead');
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

    /**
     * Mark the current conversation as pinned.
     */
    public pinConversation(): void {
        this.webClientService
            .modifyConversation(this.conversation, true)
            .then(() => this.showMessage('messenger.PINNED_CONVERSATION_OK'))
            .catch((msg) => {
                this.showMessage('messenger.PINNED_CONVERSATION_ERROR');
                this.$log.error(this.logTag, 'Pinning conversation failed: ' + msg);
            });
    }

    /**
     * Mark the current conversation as not pinned.
     */
    public unpinConversation(): void {
        this.webClientService
            .modifyConversation(this.conversation, false)
            .then(() => this.showMessage('messenger.UNPINNED_CONVERSATION_OK'))
            .catch((msg) => {
                this.showMessage('messenger.UNPINNED_CONVERSATION_ERROR');
                this.$log.error(this.logTag, 'Unpinning conversation failed: ' + msg);
            });
    }
}

class NavigationController {

    public name = 'navigation';

    private webClientService: WebClientService;
    private receiverService: ReceiverService;
    private stateService: StateService;
    private trustedKeyStoreService: TrustedKeyStoreService;
    private notificationService: NotificationService;

    private activeTab: 'contacts' | 'conversations' = 'conversations';
    private searchVisible = false;
    private searchText: string = '';

    private $mdDialog;
    private $translate: ng.translate.ITranslateService;
    private $state: UiStateService;

    public static $inject = [
        '$log', '$state', '$mdDialog', '$translate',
        'WebClientService', 'StateService', 'ReceiverService', 'NotificationService', 'TrustedKeyStore',
    ];

    constructor($log: ng.ILogService, $state: UiStateService,
                $mdDialog: ng.material.IDialogService, $translate: ng.translate.ITranslateService,
                webClientService: WebClientService, stateService: StateService,
                receiverService: ReceiverService, notificationService: NotificationService,
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
        this.notificationService = notificationService;
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

    public startupDone(): boolean {
        return this.webClientService.startupDone;
    }

    /**
     * Return true if the app wants to hide inactive contacts.
     */
    public hideInactiveContacts(): boolean {
        return !this.webClientService.appConfig.showInactiveIDs;
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
     * Show profile.
     */
    public showProfile(ev): void {
        this.receiverService.setActive(undefined);
        this.$state.go('messenger.home.detail', this.webClientService.me);
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
            this.webClientService.stop({
                reason: threema.DisconnectReason.SessionStopped,
                send: true,
                // TODO: Use welcome.stopped once we have it
                close: 'welcome',
                connectionBuildupState: 'closed',
            });
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
            this.webClientService.stop({
                reason: threema.DisconnectReason.SessionDeleted,
                send: true,
                // TODO: Use welcome.deleted once we have it
                close: 'welcome',
                connectionBuildupState: 'closed',
            });
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

    /**
     * Return the user profile.
     */
    public getMe(): threema.MeReceiver {
        return this.webClientService.me;
    }

    /**
     * Only show the "create distribution list" button if the app supports it.
     */
    public showCreateDistributionListButton(): boolean {
        return this.webClientService.appCapabilities.distributionLists;
    }

    /**
     * Return a simplified DND mode.
     *
     * This will return either 'on', 'off' or 'mention'.
     * The 'until' mode will be processed depending on the expiration timestamp.
     */
    public dndModeSimplified(conversation: threema.Conversation): 'on' | 'mention' | 'off' {
        return this.notificationService.getDndModeSimplified(conversation);
    }

}

class MessengerController {
    private logTag: string = '[MessengerController]';

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
            $log.debug(this.logTag, 'MessengerController: WebClient not yet running, redirecting to welcome screen');
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
            onConversationRemoved(receiver: threema.Receiver) {
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
                                $state.go('messenger.home');
                            }
                        }
                        break;
                    default:
                        $log.debug(this.logTag, 'Ignored onRemoved event for state', $state.current.name);
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

    // Angular services
    private $mdDialog: any;
    private $scope: ng.IScope;
    private $state: UiStateService;

    // Own services
    private fingerPrintService: FingerPrintService;
    private contactService: ContactService;
    private webClientService: WebClientService;

    public receiver: threema.Receiver;
    public me: threema.MeReceiver;
    public title: string;
    public fingerPrint = { value: null };  // Object, so that data binding works
    private showGroups = false;
    private showDistributionLists = false;
    private inGroups: threema.GroupReceiver[] = [];
    private inDistributionLists: threema.DistributionListReceiver[] = [];
    private hasSystemEmails = false;
    private hasSystemPhones = false;
    private isWorkReceiver = false;
    private showBlocked = () => false;

    private controllerModel: threema.ControllerModel<threema.Receiver>;

    public static $inject = [
        '$scope', '$log', '$stateParams', '$state', '$mdDialog', '$translate',
        'WebClientService', 'FingerPrintService', 'ContactService', 'ControllerModelService',
    ];
    constructor($scope: ng.IScope, $log: ng.ILogService, $stateParams, $state: UiStateService,
                $mdDialog: ng.material.IDialogService, $translate: ng.translate.ITranslateService,
                webClientService: WebClientService, fingerPrintService: FingerPrintService,
                contactService: ContactService, controllerModelService: ControllerModelService) {

        this.$mdDialog = $mdDialog;
        this.$scope = $scope;
        this.$state = $state;
        this.fingerPrintService = fingerPrintService;
        this.contactService = contactService;
        this.webClientService = webClientService;

        this.receiver = webClientService.receivers.getData($stateParams);
        this.me = webClientService.me;

        // Append group membership
        if (isContactReceiver(this.receiver)) {
            const contactReceiver = this.receiver;

            this.contactService.requiredDetails(contactReceiver)
                .then(() => {
                    this.hasSystemEmails = contactReceiver.systemContact !== undefined
                        && contactReceiver.systemContact.emails.length > 0;
                    this.hasSystemPhones = contactReceiver.systemContact !== undefined &&
                        contactReceiver.systemContact.phoneNumbers.length > 0;
                })
                .catch((error) => {
                    // TODO: Redirect or show an alert?
                    $log.error(this.logTag, `Contact detail request has been rejected: ${error}`);
                });

            this.isWorkReceiver = contactReceiver.identityType === threema.IdentityType.Work;

            this.fingerPrintService
                .generate(contactReceiver.publicKey)
                .then(this.setFingerPrint.bind(this));

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
                const meReceiver = this.receiver as threema.MeReceiver;
                this.fingerPrintService
                    .generate(meReceiver.publicKey)
                    .then(this.setFingerPrint.bind(this));
                this.controllerModel = controllerModelService.me(meReceiver, ControllerModelMode.VIEW);
                break;
            case 'contact':
                const contactReceiver = this.receiver as threema.ContactReceiver;
                this.fingerPrintService
                    .generate(contactReceiver.publicKey)
                    .then(this.setFingerPrint.bind(this));
                this.controllerModel = controllerModelService
                    .contact(contactReceiver, ControllerModelMode.VIEW);
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

        // If this receiver was removed, navigate to "home" view
        this.controllerModel.setOnRemoved((receiverId: string) => {
            $log.warn(this.logTag, 'Receiver removed, redirecting to home');
            this.$state.go('messenger.home');
        });

    }

    /**
     * Set the fingerprint value and run $digest.
     *
     * This may only be called from outside the $digest loop
     * (e.g. from a plain promise callback).
     */
    private setFingerPrint(fingerPrint: string): void {
        this.fingerPrint.value = fingerPrint;
        this.$scope.$digest();
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

    /**
     * Show the QR code of the public key.
     */
    public showQr(): void {
        const profile = this.webClientService.me;
        const $mdDialog = this.$mdDialog;
        $mdDialog.show({
            controllerAs: 'ctrl',
            controller: [function() {
               this.cancel = () =>  {
                   $mdDialog.cancel();
               };
               this.profile = profile;
               this.qrCode = {
                    errorCorrectionLevel: 'L',
                    size: '400px',
                    data: '3mid:'
                    + profile.id
                    + ','
                    + u8aToHex(new Uint8Array(profile.publicKey)),
                };
            }],
            templateUrl: 'partials/dialog.qr.html',
            parent: angular.element(document.body),
            clickOutsideToClose: true,
            fullscreen: true,
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
    private $scope: ng.IScope;
    public $state: UiStateService;
    private $translate: ng.translate.ITranslateService;

    public title: string;
    private $timeout: ng.ITimeoutService;
    private future: Future<threema.Receiver>;

    private controllerModel: threema.ControllerModel<threema.Receiver>;
    public type: string;

    public static $inject = [
        '$log', '$scope', '$stateParams', '$state', '$mdDialog',
        '$timeout', '$translate', 'WebClientService', 'ControllerModelService',
    ];
    constructor($log: ng.ILogService, $scope: ng.IScope, $stateParams, $state: UiStateService,
                $mdDialog, $timeout: ng.ITimeoutService, $translate: ng.translate.ITranslateService,
                webClientService: WebClientService, controllerModelService: ControllerModelService) {

        this.$scope = $scope;
        this.$mdDialog = $mdDialog;
        this.$state = $state;
        this.$timeout = $timeout;
        this.$translate = $translate;

        const receiver = webClientService.receivers.getData($stateParams);
        switch (receiver.type) {
            case 'me':
                this.controllerModel = controllerModelService.me(
                    receiver as threema.MeReceiver,
                    ControllerModelMode.EDIT,
                );
                break;
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
    }

    public keypress($event: KeyboardEvent): void {
        if ($event.key === 'Enter' && this.controllerModel.isValid()) {
            this.save();
        }
    }

    public save(): void {
        this.future = Future.withMinDuration(this.controllerModel.save(), 100);
        this.future
            .then(() => {
                this.$scope.$apply(() => {
                    this.goBack();
                });
            })
            .catch((errorCode) => {
                this.$scope.$apply(() => {
                    this.showEditError(errorCode);
                });
            });
    }

    public isSaving(): boolean {
        return this.future !== undefined && !this.future.done;
    }

    private showEditError(errorCode: string): void {
        if (errorCode === undefined) {
            errorCode = 'unknown';
        }
        this.$mdDialog.show(
            this.$mdDialog.alert()
                .clickOutsideToClose(true)
                .title(this.controllerModel.subject)
                .textContent(this.$translate.instant('validationError.modifyReceiver.' + errorCode))
                .ok(this.$translate.instant('common.OK')),
        );
    }

    public goBack(): void {
        window.history.back();
    }
}

interface CreateReceiverStateParams extends UiStateParams {
    type: threema.ReceiverType;
    initParams: null | {identity: string | null};
}

/**
 * Control creating a group or adding contact
 * fields, validate and save routines are implemented in the specific ControllerModel
 */
class ReceiverCreateController {
    private logTag: string = '[ReceiverEditController]';

    public $mdDialog: any;
    private $scope: ng.IScope;
    private $timeout: ng.ITimeoutService;
    private $log: ng.ILogService;
    private $state: UiStateService;
    private $mdToast: any;
    public identity = '';
    private $translate: any;
    public type: string;
    private future: Future<threema.Receiver>;

    public controllerModel: threema.ControllerModel<threema.Receiver>;

    public static $inject = ['$stateParams', '$mdDialog', '$scope', '$mdToast', '$translate',
        '$timeout', '$state', '$log', 'ControllerModelService'];
    constructor($stateParams: CreateReceiverStateParams, $mdDialog, $scope: ng.IScope, $mdToast, $translate,
                $timeout: ng.ITimeoutService, $state: UiStateService, $log: ng.ILogService,
                controllerModelService: ControllerModelService) {
        this.$mdDialog = $mdDialog;
        this.$scope = $scope;
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
    }

    public isSaving(): boolean {
        return this.future !== undefined && !this.future.done;
    }

    public goBack(): void {
        if (!this.isSaving()) {
            window.history.back();
        }
    }

    private showAddError(errorCode: string): void {
        if (errorCode === undefined) {
            errorCode = 'unknown';
        }
        this.$mdDialog.show(
            this.$mdDialog.alert()
                .clickOutsideToClose(true)
                .title(this.controllerModel.subject)
                .textContent(this.$translate.instant('validationError.modifyReceiver.' + errorCode))
                .ok(this.$translate.instant('common.OK')),
        );
    }

    public keypress($event: KeyboardEvent): void {
        if ($event.key === 'Enter' && this.controllerModel.isValid()) {
            this.create();
        }
    }

    public create(): void {
        // Save, then go to receiver detail page
        this.future = Future.withMinDuration(this.controllerModel.save(), 100);
        this.future
            .then((receiver: threema.Receiver) => {
                this.$scope.$apply(() => {
                    this.$state.go('messenger.home.detail', receiver, {location: 'replace'});
                });
            })
            .catch((errorCode) => {
                this.$scope.$apply(() => {
                    this.showAddError(errorCode);
                });
            });
    }
}

angular.module('3ema.messenger', ['ngMaterial'])

.config(['$stateProvider', function($stateProvider: UiStateProvider) {

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
