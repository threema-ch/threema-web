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

import {copyShallow} from '../helpers';
import {isFirstUnreadStatusMessage} from '../message_helpers';
import {ReceiverService} from '../services/receiver';

type ContactMap = Map<string, threema.ContactReceiver>;
type GroupMap = Map<string, threema.GroupReceiver>;
type DistributionListMap = Map<string, threema.DistributionListReceiver>;
type MessageMap = Map<threema.ReceiverType, Map<string, ReceiverMessages>>;

type ConversationFilter = (data: threema.Conversation[]) => threema.Conversation[];
type ConversationConverter = (data: threema.Conversation) => threema.Conversation;
type MessageConverter = (data: threema.Message) => threema.Message;

/**
 * Helper function to set a default value.
 */
function setDefault(obj, key: string, defaultValue) {
    if (obj[key] === undefined) {
        obj[key] = defaultValue;
    }
}

/**
 * A simple HashSet implementation based on a JavaScript object.
 *
 * Only strings can be stored in this set.
 */
export class StringHashSet {
    private setObj = {};
    private val = {};

    public add(str: string): void {
        this.setObj[str] = this.val;
    }

    public contains(str: string): boolean {
        return this.setObj[str] === this.val;
    }

    public remove(str: string): void {
        delete this.setObj[str];
    }

    public values(): string[] {
        const values = [];
        for (const i in this.setObj) {
            if (this.setObj[i] === this.val) {
                values.push(i);
            }
        }
        return values;
    }

    public clearAll(): void {
        for (const element in this.setObj) {
            if (this.setObj.hasOwnProperty(element)) {
                this.remove(element);
            }
        }
    }
}

/**
 * Collection that manages receivers like contacts, groups or distribution lists.
 *
 * Think of it like the "address book".
 */
class Receivers implements threema.Container.Receivers {
    public me: threema.MeReceiver = null;
    public contacts: ContactMap = new Map();
    public groups: GroupMap = new Map();
    public distributionLists: DistributionListMap = new Map();

    /**
     * Get the receiver map for the specified type.
     */
    public get(receiverType: threema.ReceiverType): threema.Receiver | Map<string, threema.Receiver> {
        switch (receiverType) {
            case 'me':
                return this.me;
            case 'contact':
                return this.contacts;
            case 'group':
                return this.groups;
            case 'distributionList':
                return this.distributionLists;
            default:
                throw new Error('Unknown or invalid receiver type: ' + receiverType);
        }
    }

    /**
     * Get the receiver matching a certain template.
     */
    public getData(receiver: threema.BaseReceiver): threema.Receiver | null {
        if (receiver.type === 'me') {
            return this.me.id === receiver.id ? this.me : undefined;
        } else {
            const receivers = this.get(receiver.type) as Map<string, threema.Receiver>;
            return receivers.get(receiver.id);
        }
    }

    /**
     * Set receiver data.
     */
    public set(data: threema.Container.ReceiverData) {
        this.setContacts(data['contact' as threema.ReceiverType]);
        this.setGroups(data['group' as threema.ReceiverType]);
        this.setDistributionLists(data['distributionList' as threema.ReceiverType]);
    }

    /**
     * Set own contact.
     */
    public setMe(data: threema.MeReceiver): void {
        data.type = 'me';
        this.me = data;
    }

    /**
     * Set contacts.
     */
    public setContacts(data: threema.ContactReceiver[]): void {
        this.contacts = new Map(data.map((c) => {
            c.type = 'contact';
            setDefault(c, 'color', '#f0f0f0');
            return [c.id, c];
        }) as any) as ContactMap;
        if (this.me !== undefined) {
            this.contacts.set(this.me.id, this.me);
        }
    }

    /**
     * Set groups.
     */
    public setGroups(data: threema.GroupReceiver[]): void {
        this.groups = new Map(data.map((g) => {
            g.type = 'group';
            setDefault(g, 'disabled', false);
            setDefault(g, 'locked', false);
            setDefault(g, 'visible', true);
            return [g.id, g];
        }) as any) as GroupMap;
    }

    /**
     * Set distribution lists.
     */
    public setDistributionLists(data: threema.DistributionListReceiver[]): void {
        this.distributionLists = new Map(data.map((d) => {
            d.type = 'distributionList';
            return [d.id, d];
        }) as any) as DistributionListMap;
    }

    public extend(receiverType: threema.ReceiverType, data: threema.Receiver): threema.Receiver {
        switch (receiverType) {
            case 'me':
                return this.extendMe(data as threema.MeReceiver);
            case 'contact':
                return this.extendContact(data as threema.ContactReceiver);
            case 'group':
                return this.extendGroup(data as threema.GroupReceiver);
            case 'distributionList':
                return this.extendDistributionList(data as threema.DistributionListReceiver);
            default:
                throw new Error('Unknown or invalid receiver type: ' + receiverType);
        }
    }

    public extendDistributionList(data: threema.DistributionListReceiver): threema.DistributionListReceiver {
        let distributionListReceiver  = this.distributionLists.get(data.id);
        if (distributionListReceiver === undefined) {
            data.type = 'distributionList';
            this.distributionLists.set(data.id, data);
            return data;
        }

        // update existing object
        distributionListReceiver = angular.extend(distributionListReceiver, data);
        return distributionListReceiver;
    }

    public extendGroup(data: threema.GroupReceiver): threema.GroupReceiver {
        // Set defaults
        setDefault(data, 'disabled', false);
        setDefault(data, 'locked', false);
        setDefault(data, 'visible', true);

        // Look up group
        let groupReceiver  = this.groups.get(data.id);

        // If group does not yet exist, create it
        if (groupReceiver === undefined) {
            data.type = 'group';
            this.groups.set(data.id, data);
            return data;
        }

        // Otherwise, update existing object
        groupReceiver = angular.extend(groupReceiver, data);
        return groupReceiver;
    }

    public extendMe(data: threema.MeReceiver): threema.MeReceiver {
        if (this.me === undefined) {
            data.type = 'me';
            this.me = data;
            return data;
        }

        // update existing object
        this.me = angular.extend(this.me, data);
        return this.me;
    }

    public extendContact(data: threema.ContactReceiver): threema.ContactReceiver {
        let contactReceiver = this.contacts.get(data.id);
        if (contactReceiver === undefined) {
            data.type = 'contact';
            setDefault(data, 'color', '#f0f0f0');
            this.contacts.set(data.id, data);
            return data;
        }

        // update existing object
        contactReceiver = angular.extend(contactReceiver, data);
        return contactReceiver;
    }
}

export class Conversations implements threema.Container.Conversations {

    private conversations: threema.Conversation[] = [];

    public filter: ConversationFilter = null;
    private converter: ConversationConverter = null;

    private receiverService: ReceiverService;

    constructor(receiverService: ReceiverService) {
        this.receiverService = receiverService;
    }

    /**
     * Get conversations.
     */
    public get(): threema.Conversation[] {
        let conversations = this.conversations;
        if (this.filter != null) {
            conversations = this.filter(conversations);
        }
        if (this.converter != null) {
            conversations = conversations.map(this.converter);
        }
        return conversations;
    }

    /**
     * Set conversations.
     *
     * This will simply overwrite the previous list of conversations with the
     * one provided.
     */
    public set(data: threema.Conversation[]): void {
        for (const conversation of data) {
            if (conversation.position !== undefined) {
                delete conversation.position;
            }
            setDefault(conversation, 'isStarred', false);
        }
        this.conversations = data;
    }

    /**
     * Find a stored conversation matching the given conversation or receiver.
     *
     * Comparison is done by type and id.
     */
    public find(pattern: threema.Conversation | threema.BaseReceiver): threema.Conversation | null {
        for (const conversation of this.get()) {
            const a = pattern;
            const b = conversation;
            if (a !== undefined && b !== undefined && a.type === b.type && a.id === b.id) {
                return conversation;
            }
        }
        return null;
    }

    /**
     * Add a conversation at the correct position.
     * Don't check whether the conversation already exists.
     */
    public add(conversation: threema.ConversationWithPosition): void {
        this.conversations.splice(conversation.position, 0, conversation);
    }

    /**
     * Add a conversation at the correct position.
     * If a conversation already exists, update it and – in case returnOld is set –
     * return a copy of the old conversation.
     */
    public updateOrAdd(
        conversation: threema.ConversationWithPosition,
        returnOld: boolean = false,
    ): threema.Conversation | null {
        for (const i of this.conversations.keys()) {
            if (this.receiverService.compare(this.conversations[i], conversation)) {
                // Conversation already exists!
                // If `returnOld` is set, create a copy of the old conversation
                let previousConversation = null;
                if (returnOld) {
                    previousConversation = copyShallow(this.conversations[i]);
                }

                // Explicitly set defaults, to be able to override old values
                setDefault(conversation, 'isStarred', false);

                // Copy properties from new conversation to old conversation
                Object.assign(this.conversations[i], conversation);

                // If the position changed, re-sort.
                if (this.conversations[i].position !== i) {
                    const tmp = this.conversations.splice(i, 1)[0];
                    this.conversations.splice(conversation.position, 0, tmp);
                }

                return previousConversation;
            }
        }
        this.add(conversation);
        return null;
    }

    /**
     * Remove a conversation.
     */
    public remove(conversation: threema.Conversation): void {
        for (const i of this.conversations.keys()) {
            if (this.receiverService.compare(this.conversations[i], conversation)) {
                this.conversations.splice(i, 1);
                return;
            }
        }
    }

    /**
     * Set a filter.
     */
    public setFilter(filter: ConversationFilter): void {
        this.filter = filter;
    }

    /**
     * Set a converter.
     */
    public setConverter(converter: ConversationConverter): void {
        this.converter = converter;
    }
}

/**
 * Messages between local user and a receiver.
 */
class ReceiverMessages {

    // The message id used as reference when paging.
    public referenceMsgId: string = null;

    // Whether a message request has been sent yet.
    public requested = false;

    // This flag indicates that more (older) messages are available.
    public more = true;

    // List of messages.
    public list: threema.Message[] = [];

}

/**
 * This class manages all messages for the current user.
 */
class Messages implements threema.Container.Messages {
    // The messages are stored in date-ascending order,
    // newest messages are appended, older messages are prepended.
    private messages: MessageMap = new Map();

    // Message converter
    public converter: MessageConverter = null;

    private $log: ng.ILogService;

    constructor($log: ng.ILogService) {
        this.$log = $log;
    }

    /**
     * Ensure that the receiver exists in the receiver map.
     */
    private lazyCreate(receiver: threema.BaseReceiver): void {
        // If the type is not yet known, create a new type map.
        if (!this.messages.has(receiver.type)) {
            this.messages.set(receiver.type, new Map());
        }

        // If the receiver is not yet known, initialize it.
        const typeMap = this.messages.get(receiver.type);
        if (!typeMap.has(receiver.id)) {
            typeMap.set(receiver.id, new ReceiverMessages());
        }
    }

    /**
     * Return the `ReceiverMessages` instance for the specified receiver.
     *
     * If the receiver is not known yet, it is initialized.
     */
    private getReceiverMessages(receiver: threema.BaseReceiver): ReceiverMessages {
        this.lazyCreate(receiver);
        return this.messages.get(receiver.type).get(receiver.id);
    }

    /**
     * Return the list of messages for the specified receiver.
     *
     * If the receiver is not known yet, it is initialized with an empty
     * message list.
     */
    public getList(receiver: threema.BaseReceiver): threema.Message[] {
        return this.getReceiverMessages(receiver).list;
    }

    /**
     * Clear and reset all loaded messages but do not remove objects
     * @param $scope
     */
    public clear($scope: ng.IScope): void {
        this.messages.forEach((messageMap: Map<string, ReceiverMessages>, receiverType: threema.ReceiverType) => {
            messageMap.forEach((messages: ReceiverMessages, id: string) => {
                messages.requested = false;
                messages.referenceMsgId = null;
                messages.more = true;
                messages.list = [];

                this.notify({
                    id: id,
                    type: receiverType,
                } as threema.Receiver, $scope);
            });
        });
    }

    /**
     * Reset the cached messages of a receiver (e.g. the receiver was locked by the mobile)
     */
    public clearReceiverMessages(receiver: threema.BaseReceiver): number {
        let cachedMessageCount = 0;
        if (this.messages.has(receiver.type)) {
            const typeMessages = this.messages.get(receiver.type);
            if (typeMessages.has(receiver.id)) {
                cachedMessageCount = typeMessages.get(receiver.id).list.length;
                typeMessages.delete(receiver.id);
            }
        }

        return cachedMessageCount;
    }

    /**
     * Return whether messages from/for the specified receiver are available.
     */
    public contains(receiver: threema.BaseReceiver): boolean {
        return this.messages.has(receiver.type) &&
               this.messages.get(receiver.type).has(receiver.id);
    }

    /**
     * Return whether there are more (older) messages available to fetch
     * for the specified receiver.
     */
    public hasMore(receiver: threema.BaseReceiver): boolean {
        return this.getReceiverMessages(receiver).more;
    }

    /**
     * Set the "more" flag for the specified receiver.
     *
     * The flag indicates that more (older) messages are available.
     */
    public setMore(receiver: threema.BaseReceiver, more: boolean): void {
        this.getReceiverMessages(receiver).more = more;
    }

    /**
     * Return the reference msg id for the specified receiver.
     */
    public getReferenceMsgId(receiver: threema.BaseReceiver): string {
        return this.getReceiverMessages(receiver).referenceMsgId;
    }

    /**
     * Return whether the messages for the specified receiver are already
     * requested.
     */
    public isRequested(receiver: threema.BaseReceiver): boolean {
        return this.getReceiverMessages(receiver).requested;
    }

    /**
     * Set the requested flag for the specified receiver.
     */
    public setRequested(receiver: threema.BaseReceiver): void {
        const messages = this.getReceiverMessages(receiver);

        // If a request was already pending, this must be a bug.
        if (messages.requested) {
            throw new Error('Message request for receiver ' + receiver.id + ' still pending');
        }

        // Set requested
        messages.requested = true;
    }

    /**
     * Clear the "requested" flag for the specified receiver messages.
     */
    public clearRequested(receiver: threema.BaseReceiver): void {
        const messages = this.getReceiverMessages(receiver);
        messages.requested = false;
    }

    /**
     * Append newer messages.
     *
     * Messages must be sorted ascending by date.
     */
    public addNewer(receiver: threema.BaseReceiver, messages: threema.Message[]): void {
        if (messages.length === 0) {
            // do nothing
            return;
        }
        const receiverMessages = this.getReceiverMessages(receiver);
        // if the list is empty, add the current message as ref
        if (receiverMessages.list.length === 0) {
            receiverMessages.referenceMsgId = messages[0].id;
        }
        receiverMessages.list.push.apply(receiverMessages.list, messages);
    }

    /**
     * Prepend older messages.
     *
     * Messages must be sorted ascending by date (oldest first).
     */
    public addOlder(receiver: threema.BaseReceiver, messages: threema.Message[]): void {
        if (messages.length === 0) {
            // do nothing
            return;
        }

        // Get reference to message list for the specified receiver
        const receiverMessages = this.getReceiverMessages(receiver);

        // If the first or last message is already contained in the list,
        // do nothing.
        const firstId = messages[0].id;
        const lastId = messages[messages.length - 1].id;
        const predicate = (msg: threema.Message) => msg.id === firstId || msg.id === lastId;
        if (receiverMessages.list.findIndex(predicate, receiverMessages.list) !== -1) {
            this.$log.warn('Messages to be prepended intersect with existing messages:', messages);
            return;
        }

        // Add the oldest message as ref
        receiverMessages.referenceMsgId = messages[0].id;
        receiverMessages.list.unshift.apply(receiverMessages.list, messages);
    }

    /**
     * Update/replace a message with a newer version.
     *
     * Return a boolean indicating whether the message was found and
     * replaced, or not.
     */
    public update(receiver: threema.BaseReceiver, message: threema.Message): boolean {
        const list = this.getList(receiver);
        for (let i = 0; i < list.length; i++) {
            if (list[i].id === message.id) {
                if (message.thumbnail === undefined) {
                    // do not reset the thumbnail
                    message.thumbnail = list[i].thumbnail;
                }
                list[i] = message;

                return true;
            }
        }
        return false;
    }

    /**
     * Update a thumbnail of a message, if a message was found the method will return true
     */
    public setThumbnail(receiver: threema.BaseReceiver, messageId: string, thumbnailImage: string): boolean {
        const list = this.getList(receiver);
        for (const message of list) {
            if (message.id === messageId) {
                if (message.thumbnail === undefined) {
                    message.thumbnail = {img: thumbnailImage} as threema.Thumbnail;
                } else {
                    message.thumbnail.img = thumbnailImage;
                }
                return true;
            }
        }

        return false;
    }

    /**
     * Remove a message.
     *
     * Return a boolean indicating whether the message was found and
     * removed, or not.
     */
    public remove(receiver: threema.BaseReceiver, messageId: string): boolean {
        const list = this.getList(receiver);
        for (let i = 0; i < list.length; i++) {
            if (list[i].id === messageId) {
                list.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    /**
     * Remove a message.
     *
     * Return a boolean indicating whether the message was found and
     * removed, or not.
     */
    public removeTemporary(receiver: threema.BaseReceiver, temporaryMessageId: string): boolean {
        const list = this.getList(receiver);
        for (let i = 0; i < list.length; i++) {
            if (list[i].temporaryId === temporaryMessageId) {
                list.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    public bindTemporaryToMessageId(receiver: threema.BaseReceiver, temporaryId: string, messageId: string): boolean {
        const list = this.getList(receiver);
        for (const item of list) {
            if (item.temporaryId === temporaryId) {
                if (item.id !== undefined) {
                    // do not bind to a new message id
                    return false;
                }

                // reset temporary id
                item.temporaryId = null;

                // assign to "real" message id
                item.id = messageId;
                return true;
            }
        }
        return false;
    }

    /**
     * Notify listener that messages changed.
     */
    public notify(receiver: threema.BaseReceiver, $scope: ng.IScope) {
        $scope.$broadcast('threema.receiver.' + receiver.type + '.' + receiver.id + '.messages',
            this.getList(receiver), this.hasMore(receiver));
    }

    /**
     * Register a function that is called every time the messages are added or removed.
     * Return the CURRENT list of loaded messages.
     */
    public register(receiver: threema.BaseReceiver, $scope: ng.IScope, callback: any): threema.Message[] {
        $scope.$on('threema.receiver.' + receiver.type + '.' + receiver.id + '.messages', callback);
        return this.getList(receiver);
    }

    /**
     * Iterate through the list of messages. Remove all "firstUnreadMessage"
     * entries and insert a new entry just before the oldest unread message.
     */
    public updateFirstUnreadMessage(receiver: threema.BaseReceiver): void {
        const receiverMessages: ReceiverMessages = this.getReceiverMessages(receiver);
        if (receiverMessages !== undefined && receiverMessages.list.length > 0) {
            let firstUnreadMessageIndex;

            // Remove unread messages
            // Iterate in reverse, to avoid getting problems when removing items
            for (let i = receiverMessages.list.length - 1; i >= 0; i--) {
                const message: threema.Message = receiverMessages.list[i];
                if (isFirstUnreadStatusMessage(message)) {
                    receiverMessages.list.splice(i, 1);
                    if (firstUnreadMessageIndex !== undefined) {
                        firstUnreadMessageIndex -= 1;
                    }
                } else if (!message.isOutbox && message.unread) {
                    firstUnreadMessageIndex = i;
                }
            }

            if (firstUnreadMessageIndex !== undefined) {
                receiverMessages.list.splice(firstUnreadMessageIndex, 0 , {
                    type: 'status',
                    isStatus: true,
                    statusType: 'firstUnreadMessage',
                } as threema.Message);
            }
        }
    }
}

/**
 * Converters transform a message or conversation.
 */
class Converter {
    public static unicodeToEmoji(message: threema.Message) {
        if (message.type === 'text') {
            message.body = emojione.toShort(message.body);
        }
        return message;
    }

    /**
     * Retrieve the receiver corresponding to this conversation and set the
     * `receiver` attribute.
     */
    public static addReceiverToConversation(receivers: Receivers) {
        return (conversation: threema.Conversation): threema.Conversation => {
            conversation.receiver = receivers.getData({
                type: conversation.type,
                id: conversation.id,
            } as threema.Receiver);

            return conversation;
        };
    }
}

/**
 * This class manages the typing flags for receivers.
 *
 * Internally values are stored in a hash set for efficient lookup.
 */
class Typing implements threema.Container.Typing {
    private set = new StringHashSet();

    private getReceiverUid(receiver: threema.BaseReceiver): string {
        return receiver.type + '-' + receiver.id;
    }

    public setTyping(receiver: threema.BaseReceiver): void {
        this.set.add(this.getReceiverUid(receiver));
    }

    public unsetTyping(receiver: threema.BaseReceiver): void {
        this.set.remove(this.getReceiverUid(receiver));
    }

    public clearAll(): void {
        this.set.clearAll();
    }

    public isTyping(receiver: threema.BaseReceiver): boolean {
        return this.set.contains(this.getReceiverUid(receiver));
    }
}

/**
 * Holds message drafts and quotes
 */
class Drafts implements threema.Container.Drafts {

    private quotes = new Map<string, threema.Quote>();

    // Use to implement draft texts!
    private texts = new Map<string, string>();

    private getReceiverUid(receiver: threema.Receiver): string {
        // do not use receiver.type => can be null
        return receiver.id;
    }

    public setQuote(receiver: threema.Receiver, quote: threema.Quote): void {
        this.quotes.set(this.getReceiverUid(receiver), quote);
    }

    public removeQuote(receiver: threema.Receiver): void {
        this.quotes.delete(this.getReceiverUid(receiver));
    }

    public getQuote(receiver: threema.Receiver): threema.Quote {
        return this.quotes.get(this.getReceiverUid(receiver));
    }

    public setText(receiver: threema.Receiver, draftMessage: string): void {
        this.texts.set(this.getReceiverUid(receiver), draftMessage);
    }

    public removeText(receiver: threema.Receiver): void {
        this.texts.delete(this.getReceiverUid(receiver));
    }

    public getText(receiver: threema.Receiver): string {
        return this.texts.get(this.getReceiverUid(receiver));
    }
}

angular.module('3ema.container', [])
.factory('Container', ['$filter', '$log', 'ReceiverService',
    function($filter, $log, receiverService: ReceiverService) {
        class Filters  {
            public static hasData(receivers) {
                return (obj) => $filter('hasData')(obj, receivers);
            }

            public static hasContact(contacts) {
                return (obj) => $filter('hasContact')(obj, contacts);
            }

            public static isValidMessage(contacts) {
                return (obj) => $filter('isValidMessage')(obj, contacts);
            }
        }

        return {
            Converter: Converter as threema.Container.Converter,
            Filters: Filters as threema.Container.Filters,
            createReceivers: () => new Receivers(),
            createConversations: () => new Conversations(receiverService),
            createMessages: () => new Messages($log),
            createTyping: () => new Typing(),
            createDrafts: () => new Drafts(),
        } as threema.Container.Factory;
    },
]);
