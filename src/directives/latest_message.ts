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

import {ReceiverService} from '../services/receiver';
import {WebClientService} from '../services/webclient';

export default [
    'WebClientService', 'ReceiverService',
    function(webClientService: WebClientService, receiverService: ReceiverService) {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                type: '=eeeType',
                message: '=eeeMessage',
                receiver: '=eeeReceiver',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                // Utilities
                const getIdentity = function(message) {
                    // TODO: Get rid of duplication with eeeMessage directive
                    if (message.isOutbox) {
                        return webClientService.me.id;
                    }
                    if (message.partnerId !== null) {
                        return message.partnerId;
                    }
                    return null;
                };

                // Conversation properties

                this.isGroup = this.type as threema.ReceiverType === 'group';
                this.isDistributionList = !this.isGroup
                    &&  this.type as threema.ReceiverType === 'distributionList';

                this.defaultStatusIcon = (this.isGroup ? 'group' : (this.isDistributionList ? 'forum' : null));
                // this.hasContact = webClientService.contacts.has(getIdentity(this.message));

                // Find sender of latest message in group chats
                this.contact = null;
                if (this.message) {
                    this.contact = webClientService.contacts.get(getIdentity(this.message));
                }

                // Typing indicator
                this.isTyping = () => false;
                if (this.isGroup === false
                    && this.isDitributionList === false
                    && this.contact !== null) {
                    this.isTyping = () => {
                        return webClientService.isTyping(this.contact);
                    };
                }

                this.isHidden = () => {
                    return this.receiver.locked;
                };

                // Show...
                this.showIcon = this.message
                    && this.message.type !== 'text'
                    && this.message.type !== 'status';

                this.getDraft = () => {
                    if (receiverService.isConversationActive(this.receiver)) {
                        return null;
                    }
                    return webClientService.getDraft(this.receiver);
                };

                this.hasDraft = () => {
                    let draft = this.getDraft();
                    return draft !== undefined && draft !== null;
                };

            }],
            templateUrl: 'directives/latest_message.html',
        };
    },
];
