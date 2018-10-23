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

import {getSenderIdentity} from '../helpers/messages';
import {MessageService} from '../services/message';
import {ReceiverService} from '../services/receiver';
import {WebClientService} from '../services/webclient';

export default [
    'WebClientService', 'ReceiverService', 'MessageService', '$filter',
    function(webClientService: WebClientService, receiverService: ReceiverService,
             messageService: MessageService, $filter: any) {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                conversation: '<',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                this.$onInit = function() {
                    // Conversation properties
                    this.isGroup = this.conversation.type === 'group';
                    this.isDistributionList = !this.isGroup && this.conversation.type === 'distributionList';

                    // Voip status
                    this.showVoipInfo = () => this.conversation.latestMessage.type === 'voipStatus';

                    this.getStatusIcon = () => {
                        if (this.showVoipInfo()) {
                            return 'phone_locked';
                        } else if (this.isGroup) {
                            return 'group';
                        } else if (this.isDistributionList) {
                            return 'forum';
                        } else if (!this.conversation.latestMessage.isOutbox) {
                            return 'reply';
                        } else {
                            const showStatusIcon = messageService.showStatusIcon(
                                this.conversation.latestMessage,
                                this.conversation.receiver,
                            );
                            return showStatusIcon ? $filter('messageStateIcon')(this.conversation.latestMessage) : null;
                        }
                    };

                    // Find sender of latest message
                    this.getContact = () => {
                        return webClientService.contacts.get(
                            getSenderIdentity(
                                (this.conversation as threema.Conversation).latestMessage,
                                webClientService.me.id,
                            ),
                        );
                    };
                    const contact = this.getContact();

                    // Typing indicator
                    this.isTyping = () => false;
                    if (this.isGroup === false && this.isDistributionList === false && contact !== null) {
                        this.isTyping = () => webClientService.isTyping(contact);
                    }

                    this.isHidden = () => this.conversation.receiver.locked;

                    // Show...
                    this.showIcon = () => {
                        const message = (this.conversation as threema.Conversation).latestMessage;
                        return message.type !== 'text' && message.type !== 'status';
                    };

                    // Drafts
                    this.getDraft = () => webClientService.getDraft(this.conversation.receiver);
                    this.showDraft = () => {
                        if (receiverService.isConversationActive(this.conversation.receiver)) {
                            // Don't show draft if conversation is active
                            return false;
                        }
                        const draft = this.getDraft();
                        return draft !== undefined && draft !== null;
                    };

                };
            }],
            templateUrl: 'directives/latest_message.html',
        };
    },
];
