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

/**
 * A simple HashSet implementation based on a JavaScript object.
 *
 * Only strings can be stored in this set.
 */
class StringHashSet {
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

    public values() {
        let values = [];
        for (let i in this.setObj) {
            if (this.setObj[i] === this.val) {
                values.push(i);
            }
        }
        return values;
    }
}

angular.module('3ema.container', [])
.factory('Container', ['$filter', '$log', 'ReceiverService',
    function($filter, $log, receiverService: ReceiverService) {
    type ContactMap = Map<string, threema.ContactReceiver>;
    type GroupMap = Map<string, threema.GroupReceiver>;
    type DistributionListMap = Map<string, threema.DistributionListReceiver>;
    type MessageMap = Map<threema.ReceiverType, Map<string, ReceiverMessages>>;

    type ConversationFilter = (data: threema.Conversation[]) => threema.Conversation[];
    type ConversationConverter = (data: threema.Conversation) => threema.Conversation;
    type MessageConverter = (data: threema.Message) => threema.Message;

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
        public getData(receiver: threema.Receiver): threema.Receiver | null {
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
            this.setMe(data['me' as threema.ReceiverType]);
            this.setContacts(data['contact' as threema.ReceiverType]);
            this.setGroups(data['group' as threema.ReceiverType]);
            this.setDistributionLists(data['distributionList' as threema.ReceiverType]);
        }

        /**
         * Set own contact.
         */
        public setMe(data: threema.MeReceiver): void {
            this.me = data;
        }

        /**
         * Set contacts.
         */
        public setContacts(data: threema.ContactReceiver[]): void {
            this.contacts = new Map(data.map((c) => [c.id, c]) as any) as ContactMap;
            if (this.me !== undefined) {
                this.contacts.set(this.me.id, this.me);
            }
        }

        /**
         * Set groups.
         */
        public setGroups(data: threema.GroupReceiver[]): void {
            this.groups = new Map(data.map((g) => [g.id, g]) as any) as GroupMap;
        }

        /**
         * Set distribution lists.
         */
        public setDistributionLists(data: threema.DistributionListReceiver[]): void {
            this.distributionLists = new Map(data.map((d) => [d.id, d]) as any) as DistributionListMap;
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
                this.distributionLists.set(data.id, data);
                return data;
            }

            // update existing object
            distributionListReceiver = angular.extend(distributionListReceiver, data);
            return distributionListReceiver;
        }

        public extendGroup(data: threema.GroupReceiver): threema.GroupReceiver {
            let groupReceiver  = this.groups.get(data.id);
            if (groupReceiver === undefined) {
                this.groups.set(data.id, data);
                return data;
            }

            // update existing object
            groupReceiver = angular.extend(groupReceiver, data);
            return groupReceiver;
        }

        public extendMe(data: threema.MeReceiver): threema.MeReceiver {
            if (this.me === undefined) {
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
                this.contacts.set(data.id, data);
                return data;
            }

            // update existing object
            contactReceiver = angular.extend(contactReceiver, data);
            return contactReceiver;
        }
    }

    class Conversations implements threema.Container.Conversations {

        private conversations: threema.Conversation[] = [];

        public filter: ConversationFilter = null;
        private converter: ConversationConverter = null;

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
         */
        public set(data: threema.Conversation[]): void {
            data.forEach((existingConversation: threema.Conversation) => {
                this.updateOrAdd(existingConversation);
            });
        }

        public add(conversation: threema.Conversation): void {
            this.conversations.splice(conversation.position, 0, conversation);
        }

        public updateOrAdd(conversation: threema.Conversation): void {
            let moveDirection = 0;
            let updated = false;
            for (let p of this.conversations.keys()) {
                if (receiverService.compare(this.conversations[p], conversation)) {
                    // ok, replace me and break
                    let old = this.conversations[p];
                    if (old.position !== conversation.position) {
                        // position also changed...
                        moveDirection = old.position > conversation.position ? -1 : 1;
                    }
                    this.conversations[p] = conversation;
                    updated = true;
                }
            }

            // reset the position field to correct the sorting
            if (moveDirection !== 0) {
                // reindex
                let before = true;
                for (let p in this.conversations) {
                    if (receiverService.compare(this.conversations[p], conversation)) {
                        before = false;
                    } else if (before && moveDirection < 0) {
                        this.conversations[p].position++;
                    } else if (!before && moveDirection > 0) {
                        this.conversations[p].position++;
                    }
                }

                // sort by position field
                this.conversations.sort(function (convA, convB) {
                    return convA.position - convB.position;
                });
            } else if (!updated) {
                this.add(conversation);
            }
        }

        public remove(conversation: threema.Conversation): void {
            for (let p of this.conversations.keys()) {
                if (receiverService.compare(this.conversations[p], conversation)) {
                    // remove conversation from array
                    this.conversations.splice(p, 1);
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
        public referenceMsgId: number = null;

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

        /**
         * Ensure that the receiver exists in the receiver map.
         */
        private lazyCreate(receiver: threema.Receiver): void {
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
        private getReceiverMessages(receiver: threema.Receiver): ReceiverMessages {
            this.lazyCreate(receiver);
            return this.messages.get(receiver.type).get(receiver.id);
        }

        /**
         * Return the list of messages for the specified receiver.
         *
         * If the receiver is not known yet, it is initialized with an empty
         * message list.
         */
        public getList(receiver: threema.Receiver): threema.Message[] {
            return this.getReceiverMessages(receiver).list;
        }

        /**
         * Clear and reset all loaded messages but do not remove objects
         * @param $scope
         */
        public clear($scope: ng.IScope): void {
            this.messages.forEach ((messageMap: Map<string, ReceiverMessages>,
                receiverType: threema.ReceiverType) => {
               messageMap.forEach ((messages: ReceiverMessages, id: string) => {
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
        public clearReceiverMessages(receiver: threema.Receiver): Number {
            let cachedMessageCount = 0;
            if (this.messages.has(receiver.type)) {
                let typeMessages = this.messages.get(receiver.type);
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
        public contains(receiver: threema.Receiver): boolean {
            return this.messages.has(receiver.type) &&
                   this.messages.get(receiver.type).has(receiver.id);
        }

        /**
         * Return whether there are more (older) messages available to fetch
         * for the specified receiver.
         */
        public hasMore(receiver: threema.Receiver): boolean {
            return this.getReceiverMessages(receiver).more;
        }

        /**
         * Set the "more" flag for the specified receiver.
         *
         * The flag indicates that more (older) messages are available.
         */
        public setMore(receiver: threema.Receiver, more: boolean): void {
            this.getReceiverMessages(receiver).more = more;
        }

        /**
         * Return the reference msg id for the specified receiver.
         */
        public getReferenceMsgId(receiver: threema.Receiver): number {
            return this.getReceiverMessages(receiver).referenceMsgId;
        }

        /**
         * Return whether the messages for the specified receiver are already
         * requested.
         */
        public isRequested(receiver: threema.Receiver): boolean {
            return this.getReceiverMessages(receiver).requested;
        }

        /**
         * Set the requested flag for the specified receiver.
         */
        public setRequested(receiver: threema.Receiver): void {
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
        public clearRequested(receiver): void {
            const messages = this.getReceiverMessages(receiver);
            messages.requested = false;
        }

        /**
         * Append newer messages.
         *
         * Messages must be sorted ascending by date.
         */
        public addNewer(receiver: threema.Receiver, messages: threema.Message[]): void {
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
        public addOlder(receiver: threema.Receiver, messages: threema.Message[]): void {
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
                $log.warn('Messages to be prepended intersect with existing messages:', messages);
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
        public update(receiver: threema.Receiver, message: threema.Message): boolean {
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
         *
         * @param receiver
         * @param messageId
         * @param thumbnailImage
         * @returns {boolean}
         */
        public setThumbnail(receiver: threema.Receiver, messageId: number, thumbnailImage: string): boolean {
            const list = this.getList(receiver);
            for (let message of list) {
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
        public remove(receiver: threema.Receiver, messageId: number): boolean {
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
        public removeTemporary(receiver: threema.Receiver, temporaryMessageId: string): boolean {
            const list = this.getList(receiver);
            for (let i = 0; i < list.length; i++) {
                if (list[i].temporaryId === temporaryMessageId) {
                    list.splice(i, 1);
                    return true;
                }
            }
            return false;
        }

        public bindTemporaryToMessageId(receiver: threema.Receiver, temporaryId: string, messageId: number): boolean {
            const list = this.getList(receiver);
            for (let item of list) {
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

        public notify(receiver: threema.Receiver, $scope: ng.IScope) {
            $scope.$broadcast('threema.receiver.' + receiver.type + '.' + receiver.id + '.messages',
                this.getList(receiver), this.hasMore(receiver));
        }

        /**
         * register a message change notify on the given scope
         * return the CURRENT list of loaded messages
         */
        public register(receiver: threema.Receiver, $scope: ng.IScope, callback: any): threema.Message[] {
            $scope.$on('threema.receiver.' + receiver.type + '.' + receiver.id + '.messages', callback);
            return this.getList(receiver);
        }

        public updateFirstUnreadMessage(receiver: threema.Receiver): void {
            const receiverMessages = this.getReceiverMessages(receiver);
            if (receiverMessages !== undefined && receiverMessages.list.length > 0) {
                // remove unread
                let removedElements = 0;
                let firstUnreadMessageIndex;
                receiverMessages.list = receiverMessages.list.filter((message: threema.Message, index: number) => {
                    if (message.type === 'status'
                        && message.statusType === 'firstUnreadMessage') {
                        removedElements++;
                        return false;
                    } else if (firstUnreadMessageIndex === undefined
                            && !message.isOutbox
                            && message.unread) {
                        firstUnreadMessageIndex = index;
                    }
                    return true;
                });

                if (firstUnreadMessageIndex !== undefined) {
                    firstUnreadMessageIndex -= removedElements;
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

    /**
     * This class manages the typing flags for receivers.
     *
     * Internally values are stored in a hash set for efficient lookup.
     */
    class Typing implements threema.Container.Typing {
        private set = new StringHashSet();

        private getReceiverUid(receiver: threema.ContactReceiver): string {
            return receiver.type + '-' + receiver.id;
        }

        public setTyping(receiver: threema.ContactReceiver): void {
            this.set.add(this.getReceiverUid(receiver));
        }

        public unsetTyping(receiver: threema.ContactReceiver): void {
            this.set.remove(this.getReceiverUid(receiver));
        }

        public isTyping(receiver: threema.ContactReceiver): boolean {
            return this.set.contains(this.getReceiverUid(receiver));
        }
    }

    /**
     * Holds message drafts and quotes
     */
    class Drafts implements threema.Container.Drafts {

        private quotes = new Map<String, threema.Quote>();

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

    return {
        Converter: Converter as threema.Container.Converter,
        Filters: Filters as threema.Container.Filters,
        createReceivers: () => new Receivers(),
        createConversations: () => new Conversations(),
        createMessages: () => new Messages(),
        createTyping: () => new Typing(),
        createDrafts: () => new Drafts(),
    } as threema.Container.Factory;
}]);
