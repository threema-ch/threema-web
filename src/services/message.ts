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
    // Maximum thumbnail size (width and height)
    // Note: Keep this in sync with `.thumbnail`s `max-width` and `max-height`
    //       properties!
    private static readonly MAX_THUMBNAIL_SIZE = 350;

    // Own services
    private receiverService: ReceiverService;
    private timeoutService: TimeoutService;

    // Other
    private timeoutDelaySeconds = 30;

    public static $inject = ['ReceiverService', 'TimeoutService'];
    constructor(receiverService: ReceiverService, timeoutService: TimeoutService) {
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
     * Get a preview Thumbnail object from a data URI.
     */
    public getPreviewThumbnail(uri: string, preview: ArrayBuffer): threema.Thumbnail {
        const image = new Image();
        image.src = uri;

        // Downscale image (if necessary)
        if (image.width > MessageService.MAX_THUMBNAIL_SIZE || image.height > MessageService.MAX_THUMBNAIL_SIZE) {
            const scale = Math.min(
                MessageService.MAX_THUMBNAIL_SIZE / image.width,
                MessageService.MAX_THUMBNAIL_SIZE / image.height);
            image.width = Math.round(scale * image.width);
            image.height = Math.round(scale * image.height);
        }

        return {
            previewDataUrl: uri,
            preview: preview,
            width: image.width,
            height: image.height,
        };
    }

    /**
     * Create a message object with a temporary id.
     */
    public createTemporary(
        temporaryId: string,
        receiver: threema.Receiver,
        type: threema.MessageType,
        data: threema.MessageData,
        previewDataUrl?: string,
    ): threema.Message {
        // Populate base message
        const timestampS = Math.floor(Date.now() / 1000);
        const message: threema.Message = {
            type: type,
            id: undefined, // Note: Hack, violates the interface
            date: timestampS,
            sortKey: Number.MAX_SAFE_INTEGER, // Note: Ugly hack
            partnerId: receiver.id,
            isOutbox: true,
            isStatus: false,
            state: 'pending',
            quote: data.quote,
            temporaryId: temporaryId,
        } as threema.Message;

        // Populate message depending on type
        switch (type) {
            case 'text':
                const textData = data as threema.TextMessageData;
                message.body = textData.text;
                break;
            case 'image': {
                const fileData = data as threema.FileMessageData;
                message.caption = fileData.caption;
                if (previewDataUrl !== undefined) {
                    message.thumbnail = this.getPreviewThumbnail(previewDataUrl, fileData.data);
                }
                break;
            }
            case 'video': {
                const fileData = data as threema.FileMessageData;
                message.video = {
                    duration: null, // Note: Hack, violates the interface
                    size: fileData.size,
                };
                break;
            }
            case 'file': {
                const fileData = data as threema.FileMessageData;
                message.caption = fileData.caption;
                message.file = {
                    name: fileData.name,
                    size: fileData.size,
                    type: fileData.fileType,
                    inApp: false,
                };
                if (previewDataUrl !== undefined) {
                    message.thumbnail = this.getPreviewThumbnail(previewDataUrl, fileData.data);
                }
                break;
            }
            default:
                throw new Error(`Cannot create temporary message for type: ${type}`);
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
