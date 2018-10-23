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

import {isContactReceiver} from '../typeguards';
import {ReceiverService} from './receiver';
import {TimeoutService} from './timeout';

export class MessageAccess {
    public quote = false;
    public ack = false;
    public dec = false;
    public delete = false;
    public download = false;
    public copy = false;
}

export class MessageService {

    // Angular services
    private $log: ng.ILogService;

    // Own services
    private receiverService: ReceiverService;
    private timeoutService: TimeoutService;

    // Other
    private timeoutDelaySeconds = 30;

    public static $inject = ['$log', 'ReceiverService', 'TimeoutService'];
    constructor($log: ng.ILogService, receiverService: ReceiverService, timeoutService: TimeoutService) {
        this.$log = $log;
        this.receiverService = receiverService;
        this.timeoutService = timeoutService;
    }

    public getAccess(message: threema.Message, receiver: threema.Receiver): MessageAccess {
        const access = new MessageAccess();

        if (message !== undefined) {
            access.quote = (message.type === 'text')
                        || (message.type === 'location')
                        || (message.caption !== undefined && message.caption !== null && message.caption.length > 0);
            access.copy = access.quote;

            if (receiver !== undefined && message.temporaryId === undefined) {
                if (message.isOutbox === false
                    && isContactReceiver(receiver)
                    && message.type !== 'voipStatus') {
                    access.ack = message.state !== 'user-ack';
                    access.dec = message.state !== 'user-dec';
                }

                switch (message.type) {
                    case 'image':
                    case 'video':
                    case 'audio':
                    case 'file':
                        access.download = true;
                        break;
                    default:
                        access.download = false;
                }
                access.delete = true;
            }
        }

        return access;
    }

    /**
     * Return the quotable text in this message, or null.
     */
    public getQuoteText(message: threema.Message): string | null {
        let quoteText = null;
        if (message !== null && message !== undefined) {
            switch (message.type) {
                case 'text':
                    quoteText = message.body;
                    break;
                case 'location':
                    quoteText = message.location.description;
                    break;
                case 'file':
                case 'image':
                    quoteText = message.caption;
                    break;
                default:
                    // Ignore (handled below)
            }
        }
        return quoteText;
    }

    public showStatusIcon(message: threema.Message, receiver: threema.Receiver): boolean {
        if (message !== null && receiver !== null) {

            const messageState = message.state;

            // group message/distribution list message icons only on pending or failing states
            switch (receiver.type) {
                case 'group':
                    if (message.isOutbox && (message.temporaryId === undefined || message.temporaryId === null)) {
                        return messageState === 'send-failed'
                            || messageState === 'sending'
                            || (messageState === 'pending' && message.type !== 'ballot');
                    }
                    return false;
                case 'distributionList':
                    return false;
                case 'contact':
                    if (!message.isOutbox) {
                        return messageState === 'user-ack'
                            || messageState === 'user-dec';
                    } else if (this.receiverService.isBusinessContact(receiver)) {
                        // move this into a service
                        return messageState === 'send-failed'
                            || messageState === 'sending'
                            || messageState === 'pending';
                    }

                    return true;
                default:
                    return false;
            }
        }
        return false;
    }

    /**
     * Create a message object with a temporary id
     */
    public createTemporary(
        temporaryId: string,
        receiver: threema.Receiver,
        msgType: string,
        messageData: threema.MessageData,
    ): threema.Message {
        const message = {
            temporaryId: temporaryId,
            type: msgType,
            isOutbox: true,
            state: 'pending',
            id: undefined,
            body: undefined,
            date: Math.floor(Date.now() / 1000),
            partnerId: receiver.id,
            isStatus: false,
            quote: undefined,
            caption: msgType === 'file' ? (messageData as threema.FileMessageData).caption : null,
        } as threema.Message;

        if (msgType === 'text') {
            message.body = (messageData as threema.TextMessageData).text;
            message.quote = (messageData as threema.TextMessageData).quote;
        }

        // Add delay for timeout checking
        // TODO: This should be removed once Android has reliable message delivery.
        this.timeoutService.register(() => {
            // Set the state to timeout if it is still pending.
            // Note: If sending the message worked, by now the message object
            // will have been replaced by a new one and the state change would
            // have no effect anyways...
            if (message.state === 'pending') {
                message.state = 'timeout';
            }
        }, this.timeoutDelaySeconds * 1000, true, 'messageTimeout');

        return message;
    }
}
