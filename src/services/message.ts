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

import {ReceiverService} from "./receiver";

class MessageAccess implements threema.MessageAccess {
    public quote = false;
    public ack = false;
    public dec = false;
    public delete = false;
    public download = false;
    public copy = false;
}

export class MessageService {

    private $log: ng.ILogService;
    private receiverService: ReceiverService;

    public static $inject = ['$log', 'ReceiverService'];
    constructor($log: ng.ILogService, receiverService: ReceiverService) {
        this.$log = $log;
        this.receiverService = receiverService;
    }

    public getAccess(message: threema.Message, receiver: threema.Receiver): MessageAccess  {
        let access = new MessageAccess();

        if (message !== undefined && receiver !== undefined && message.temporaryId === undefined) {
            access.quote =  (message.type === 'text')
                || (message.type === 'location')
                || (message.caption !== undefined);
            // disable copy for current version
            // access.copy = access.quote;

            if (message !== undefined
                && message.isOutbox === false
                && this.receiverService.isContact(receiver)) {
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

        return access;
    }

    public showStatusIcon(message: threema.Message, receiver: threema.Receiver): boolean {
        if (message !== null && receiver !== null) {

            let messageState = message.state;
            // MessageState messageState = messageModel.getState();

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
     * return the filename of a message (image, audio, file)
     * used for downloads
     * @param message
     * @returns filename string or null
     */
    public getFileName(message: threema.Message): string {
        if (message === undefined
            || message === null) {
            return null;
        }

        let getFileName = (prefix: string, postfix?: string): string => {
            if (message.id === undefined) {
                this.$log.warn('missing id on message model');
                return null;
            }
            return prefix
                + '-' + message.id
                + (postfix !== undefined ? '.' + postfix : '');
        };

        switch (message.type) {
            case 'image':
                return getFileName('image', 'jpg');
            case 'video':
                return getFileName('video', 'mpg');
            case 'file':
                if (message.file !== undefined) {
                    return message.file.name;
                }

                // should not happen
                this.$log.warn('file message without file object', message.id);
                return getFileName('file');
            case 'audio':
                return getFileName('audio', 'mp4');
            default:
                // ignore file types without a read file
                return null;
        }
    }

    /**
     * Create a message object with a temporaryId
     */
    public createTemporary(receiver: threema.Receiver, msgType: string,
                           messageData: threema.MessageData): threema.Message {
        let now = new Date();
        let message = {
            temporaryId: receiver.type + receiver.id + Math.random(),
            type: msgType,
            isOutbox: true,
            state: 'pending',
            id: undefined,
            body: undefined,
            date: ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2),
            partnerId: receiver.id,
            isStatus: false,
            quote: undefined,
            caption: msgType === 'file' ? (messageData as threema.FileMessageData).caption : null,
        } as threema.Message;

        if (msgType === 'text') {
            message.body = (messageData as threema.TextMessageData).text;
            message.quote = (messageData as threema.TextMessageData).quote;
        }

        return message;
    }
}
