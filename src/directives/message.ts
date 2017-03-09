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

import {MessageService} from '../services/message';
import {ReceiverService} from '../services/receiver';
import {WebClientService} from '../services/webclient';

export default [
    'WebClientService',
    'MessageService',
    'ReceiverService',
    '$mdDialog',
    '$translate',
    '$rootScope',
    '$log',
    function(webClientService: WebClientService, messageService: MessageService,
             receiverService: ReceiverService,
             $mdDialog: ng.material.IDialogService, $translate: ng.translate.ITranslateService,
             $rootScope: ng.IRootScopeService, $log: ng.ILogService) {

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
                // Return the contact
                const getIdentity = function(message: threema.Message) {
                    if (message.isOutbox) {
                        return webClientService.me.id;
                    }
                    if (message.partnerId != null) {
                        return message.partnerId;
                    }
                    return null;
                };

                // Defaults and variables
                if (this.resolution == null) {
                    this.resolution = 'low';
                }

                this.contact = webClientService.contacts.get(getIdentity(this.message));

                // Show...
                this.isStatusMessage = this.message.isStatus;
                this.isContactMessage = !this.message.isStatus
                    && webClientService.contacts.has(getIdentity(this.message));
                this.isGroup = this.type as threema.ReceiverType === 'group';
                this.isContact = this.type as threema.ReceiverType === 'contact';
                this.isBusinessReceiver = receiverService.isBusinessContact(this.receiver);

                this.showName = !this.message.isOutbox && this.isGroup;
                // show avatar only if a name is shown
                this.showAvatar = this.showName;
                this.showText = this.message.type === 'text' || this.message.caption;
                this.showMedia = this.message.type !== 'text';
                this.showState = messageService.showStatusIcon(this.message as threema.Message, this.receiver);
                this.showQuote = this.message.quote !== undefined;

                this.access = messageService.getAccess(this.message, this.receiver);

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

                this.copy = (ev) => {
                    $log.debug('TODO implement copy');
                };

                this.download = (ev) => {
                    webClientService.requestBlob(this.message.id, this.receiver)
                        .then((buffer: ArrayBuffer) => {
                            $rootScope.$apply(() => {
                                // this.downloading = false;
                                // this.downloaded = true;

                                switch (this.message.type) {
                                    case 'image':
                                    case 'video':
                                    case 'file':
                                    case 'audio':
                                        saveAs(new Blob([buffer]), messageService.getFileName(this.message));
                                        break;
                                    default:
                                        $log.warn('Ignored download request for message type', this.message.type);
                                }
                            });
                        })
                        .catch((error) => {
                            $log.error('error downloading blob ', error);
                            // this.downloading = false;
                            // this.downloaded = true;
                        });
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
