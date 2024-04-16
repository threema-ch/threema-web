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

// tslint:disable:max-line-length

import {saveAs} from 'file-saver';

import {firefoxWorkaroundPdfDownload, hasValue} from '../helpers';
import * as clipboard from '../helpers/clipboard';
import {BrowserInfo} from '../helpers/browser_info';
import {getSenderIdentity} from '../helpers/messages';
import {BrowserService} from '../services/browser';
import {LogService} from '../services/log';
import {MessageService} from '../services/message';
import {ReceiverService} from '../services/receiver';
import {WebClientService} from '../services/webclient';

export default [
    'BrowserService',
    'LogService',
    'MessageService',
    'ReceiverService',
    'WebClientService',
    '$mdDialog',
    '$mdToast',
    '$translate',
    '$rootScope',
    function(browserService: BrowserService,
             logService: LogService,
             messageService: MessageService,
             receiverService: ReceiverService,
             webClientService: WebClientService,
             $mdDialog: ng.material.IDialogService,
             $mdToast: ng.material.IToastService,
             $translate: ng.translate.ITranslateService,
             $rootScope: ng.IRootScopeService) {
        const log = logService.getLogger('Message-C');
        return {
            restrict: 'E',
            scope: {},
            bindToController: {
                type: '=eeeType',
                receiver: '=eeeReceiver',
                message: '=eeeMessage',
                resolution: '=?eeeResolution',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                // Determine browser
                this.browserInfo = browserService.getBrowser();

                this.$onInit = function() {

                    // Defaults and variables
                    if (this.resolution == null) {
                        this.resolution = 'low';
                    }

                    // Find contact
                    this.contact = webClientService.contacts.get(
                        getSenderIdentity(this.message, webClientService.me.id),
                    );

                    // Show...
                    this.isStatusMessage = this.message.isStatus;
                    this.isContactMessage = !this.message.isStatus
                        && webClientService.contacts.has(getSenderIdentity(this.message, webClientService.me.id));
                    this.isGroup = this.type as threema.ReceiverType === 'group';
                    this.isContact = this.type as threema.ReceiverType === 'contact';
                    this.isBusinessReceiver = receiverService.isBusinessContact(this.receiver);
                    this.isEdited = hasValue(this.message.lastEditedAt);

                    this.showName = !this.message.isOutbox && this.isGroup;
                    // show avatar only if a name is shown
                    this.showAvatar = this.showName;
                    this.showText = this.message.type === 'text' || this.message.caption;
                    this.showMedia = this.message.type !== 'text';
                    this.showState = messageService.showStatusIcon(this.message as threema.Message, this.receiver);
                    this.showGroupReactions = this.isGroup && webClientService.appCapabilities.groupReactions;
                    this.showQuote = this.message.quote !== undefined;
                    this.showVoipInfo = this.message.type === 'voipStatus';

                    this.access = messageService.getAccess(
                        this.message,
                        this.receiver,
                        webClientService.appCapabilities,
                        webClientService.me.id,
                    );

                    this.ack = (ack: boolean) => {
                        webClientService.ackMessage(this.receiver, this.message, ack);
                    };

                    this.quote = () => {
                        // set message as quoted
                        webClientService.setQuote(this.receiver, this.message);
                    };

                    this.delete = (ev) => {
                        const confirm = $mdDialog.confirm()
                            .title($translate.instant('messenger.CONFIRM_DELETE_TITLE'))
                            .textContent($translate.instant('common.ARE_YOU_SURE'))
                            .targetEvent(ev)
                            .ok($translate.instant('common.YES'))
                            .cancel($translate.instant('common.CANCEL'));
                        $mdDialog.show(confirm).then((result) => {
                            webClientService.deleteMessage(this.receiver, this.message);
                        }, () => { /* do nothing */});
                    };

                    this.copyToClipboard = (ev: MouseEvent) => {
                        // Get copyable text
                        const text = messageService.getQuoteText(this.message);
                        if (text === null) {
                            return;
                        }

                        // Copy to clipboard
                        let toastString = 'messenger.COPIED';
                        try {
                            clipboard.copyString(text, (this.browserInfo as BrowserInfo).isSafari());
                        } catch (error) {
                            log.warn('Could not copy text to clipboard:', error);
                            toastString = 'messenger.COPY_ERROR';
                        }

                        // Show toast
                        const toast = $mdToast.simple()
                            .textContent($translate.instant(toastString))
                            .position('bottom center');
                        $mdToast.show(toast);
                    };

                    this.download = (ev) => {
                        this.downloading = true;
                        webClientService.requestBlob(this.message.id, this.receiver)
                            .then((blobInfo: threema.BlobInfo) => {
                                $rootScope.$apply(() => {
                                    this.downloading = false;

                                    switch (this.message.type) {
                                        case 'image':
                                        case 'video':
                                        case 'file':
                                        case 'audio':
                                            saveAs(
                                                new Blob(
                                                    [blobInfo.buffer],
                                                    {type: firefoxWorkaroundPdfDownload(blobInfo.mimetype)},
                                                ),
                                                blobInfo.filename
                                            );
                                            break;
                                        default:
                                            log.warn('Ignored download request for message type', this.message.type);
                                    }
                                });
                            })
                            .catch((error) => {
                                // TODO: Handle this properly / show an error message
                                log.error(`Error downloading blob: ${error}`);
                                this.downloading = false;
                            });
                    };

                    this.isDownloading = () => {
                        return this.downloading;
                    };

                    this.showHistory = (ev) => {
                        const getEvents = () => (this.message as threema.Message).events;
                        const getMessageId = () => (this.message as threema.Message).id;
                        $mdDialog.show({
                            controllerAs: 'ctrl',
                            controller: function() {
                                this.getEvents = getEvents;
                                this.getMessageId = getMessageId;
                                this.close = () => {
                                    $mdDialog.hide();
                                };
                            },
                            template: `
                                <md-dialog class="message-history-dialog" translate-attr="{'aria-label': 'messenger.MSG_HISTORY'}">
                                    <form ng-cloak>
                                        <md-toolbar>
                                            <div class="md-toolbar-tools">
                                                <h2 translate>messenger.MSG_HISTORY</h2>
                                            </div>
                                        </md-toolbar>
                                        <md-dialog-content>
                                            <p><span class="message-id">Message ID:</span> {{ ctrl.getMessageId() }}</p>
                                            <p ng-repeat="event in ctrl.getEvents()">
                                                <span class="event-type" ng-if="event.type === 'created'" translate>messenger.MSG_HISTORY_CREATED</span>
                                                <span class="event-type" ng-if="event.type === 'sent'" translate>messenger.MSG_HISTORY_SENT</span>
                                                <span class="event-type" ng-if="event.type === 'delivered'" translate>messenger.MSG_HISTORY_DELIVERED</span>
                                                <span class="event-type" ng-if="event.type === 'read'" translate>messenger.MSG_HISTORY_READ</span>
                                                <span class="event-type" ng-if="event.type === 'acked'" translate>messenger.MSG_HISTORY_ACKED</span>
                                                <span class="event-type" ng-if="event.type === 'modified'" translate>messenger.MSG_HISTORY_MODIFIED</span>
                                                {{ event.date | unixToTimestring:true }}
                                            </p>
                                        </md-dialog-content>
                                        <md-dialog-actions layout="row" >
                                            <md-button ng-click="ctrl.close()">
                                                <span translate>common.OK</span>
                                            </md-button>
                                        </md-dialog-actions>
                                    </form>
                                </md-dialog>
                            `,
                            parent: angular.element(document.body),
                            targetEvent: ev,
                            clickOutsideToClose: true,
                        });
                    };
                };
            }],
            link: function(scope: any, element: ng.IAugmentedJQuery, attrs) {
                // Prevent status messages from being draggable
                const domElement: HTMLElement = element[0];
                if (scope.ctrl.isStatusMessage) {
                    domElement.ondragstart = () => false;
                }
            },
            templateUrl: 'directives/message.html',
        };
    },
];
