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

// Types used for the Threema Webclient.

declare const angular: ng.IAngularStatic;

declare namespace threema {

    interface Avatar {
        // Low resolution avatar path
        low?: string;
        // High resolution avatar path
        high?: string;
    }

    interface AvatarRegistry {
        contact: Avatar;
        group: Avatar;
        distributionList: Avatar;
    }

    /**
     * Messages that are sent through the secure data channel as encrypted msgpack bytes.
     */
    interface WireMessage {
        type: string;
        subType: string;
        args?: any;
        data?: any;
    }

    type WireMessageCallback = (message: WireMessage, result: any) => boolean;

    type MessageType = 'text' | 'image' | 'video' | 'audio' | 'location' | 'status' | 'ballot' | 'file';
    type MessageState = 'delivered' | 'read' | 'send-failed' | 'sent' | 'user-ack' | 'user-dec' | 'pending' | 'sending';
    type InitializationStep = 'client info' | 'conversations' |  'receivers';

    interface InitializationStepRoutine {
        requiredSteps: InitializationStep[];
        callback: any;
    }

    interface Thumbnail {
        img?: string;
        preview: string;
        width: number;
        height: number;
    }

    /**
     * A Threema chat message.
     */
    interface Message {
        type: MessageType;
        id: number;
        body: string;
        thumbnail?: Thumbnail;
        date: string;
        partnerId: string;
        isOutbox: boolean;
        isStatus: boolean;
        caption?: string;
        statusType?: 'text' | 'firstUnreadMessage';
        unread?: boolean;
        state?: MessageState;
        quote?: Quote;
        file?: FileInfo;
        video?: VideoInfo;
        audio?: AudioInfo;
        location?: LocationInfo;
        // only for temporary Messages
        temporaryId?: string;
        errorMessage?: string;
    }

    interface FileInfo {
        description: string;
        name: string;
        size: number;
        type: string;
        inApp: boolean;
    }

    interface VideoInfo {
        duration: number;
        size: number;
    }

    interface AudioInfo {
        duration: number;
    }

    interface LocationInfo {
        lat: number;
        lon: number;
        accuracy: number;
        address: string;
        poi: string;
    }
    /**
     * All possible receiver types.
     */
    type ReceiverType = 'me' | 'contact' | 'group' | 'distributionList';

    /**
     * Access Object for receivers
     */

    interface ReceiverAccess {
        canDelete?: boolean;
    }

    interface ContactReceiverAccess extends ReceiverAccess {
        canChangeAvatar: boolean;
        canChangeFirstName: boolean;
        canChangeLastName: boolean;
    }

    interface GroupReceiverAccess extends ReceiverAccess {
        canChangeAvatar: boolean;
        canChangeName: boolean;
        canChangeMembers?: boolean;
        canLeave?: boolean;
        canSync?: boolean;
    }

    interface DistributionListReceiverAccess extends ReceiverAccess {
        canChangeMembers?: boolean;
    }

    /**
     * A generic receiver.
     *
     * Note that the id is not unique for all receivers, only for all receivers
     * of a certain type. The primary key for a receiver is the tuple (type, id).
     */
    interface Receiver {
        type?: ReceiverType;
        id: string;
        displayName: string;
        color: string;
        avatar?: Avatar; // May be set if already fetched
        access: ReceiverAccess;
        locked?: boolean;
        visible?: boolean;
    }

    /**
     * A contact.
     */
    interface ContactReceiver extends Receiver {
        type?: 'contact' | 'me';
        publicNickname?: string;
        firstName?: string;
        lastName?: string;
        verificationLevel?: number;
        state: string;
        featureLevel: number | null;
        publicKey: ArrayBuffer;
        systemContact?: SystemContact;
        access: ContactReceiverAccess;
    }

    /**
     * Own contact.
     */
    interface MeReceiver extends ContactReceiver {
        type?: 'me';
    }

    /**
     * A group.
     */
    interface GroupReceiver extends Receiver {
        type?: 'group';
        disabled: boolean;
        members: string[];
        administrator: string;
        access: GroupReceiverAccess;
    }

    /**
     * A distribution list.
     */
    interface DistributionListReceiver extends Receiver {
        type?: 'distributionList';
        members: string[];
        access: DistributionListReceiverAccess;
    }

    interface SystemContact {
        emails?: SystemContactEmail[];
        phoneNumbers?: SystemContactPhone[];
    }

    interface SystemContactEmail {
        label: string;
        address: string;
    }

    interface SystemContactPhone {
        label: string;
        number: string;
    }
    /**
     * A conversation.
     */
    interface Conversation {
        type: ReceiverType;
        id: string;
        position: number;
        messageCount: number;
        unreadCount: number;
        latestMessage: Message;
        receiver?: Receiver;
        avatar?: ArrayBuffer;
    }

    /**
     * Connection state in the welcome dialog.
     *
     * States:
     *
     * - new: Initial state
     * - connecting: Connecting to signaling server
     * - push: When trying to reconnect, waiting for push notification to arrive
     * - manual_start: When trying to reconnect, waiting for manual session start
     * - waiting: Waiting for new-responder message from signaling server
     * - peer_handshake: Doing SaltyRTC handshake with the peer
     * - loading: Loading initial data
     * - done: Initial loading is finished
     * - closed: Connection is closed
     *
     */
    type ConnectionBuildupState = 'new' | 'connecting' | 'push' | 'manual_start' | 'waiting'
        | 'peer_handshake' | 'loading' | 'done' | 'closed';

    /**
     * Connection state of the WebRTC peer connection.
     */
    type RTCConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected';

    /**
     * Connection state of the WebRTC peer connection.
     */
    type GlobalConnectionState = 'ok' | 'warning' | 'error';

    /**
     * Type of message to be sent to a receiver.
     */
    type MessageContentType = 'text' | 'file';

    /**
     * Possible message types sent to the receiver.
     */
    type MessageDataType = 'text' | 'file';

    interface MessageData {
        // optional quote object
        quote?: Quote;
    }

    /**
     * Payload for a file message.
     */
    interface FileMessageData extends MessageData {
        // File name
        name: string;
        // File MIME type
        fileType: string;
        // Size in bytes
        size: number;
        // File bytes
        data: ArrayBuffer;
        // Caption string
        caption?: String;
        // Send as file message
        sendAsFile?: boolean;
    }

    /**
     * Payload for a text message.
     */
    interface TextMessageData extends MessageData {
        // Text to be sent
        text: string;
    }

    /**
     * The $stateParams format used for the welcome controller.
     */
    interface WelcomeStateParams extends ng.ui.IStateParamsService {
        initParams: null | {keyStore: saltyrtc.KeyStore, peerTrustedKey: Uint8Array};
    }

    interface CreateReceiverStateParams extends ng.ui.IStateParamsService {
        type: string;
        initParams: null | {identity: null};
    }

    interface MessageAccess {
        quote: boolean;
        ack: boolean;
        dec: boolean;
        delete: boolean;
        download: boolean;
        copy: boolean;
    }

    interface Quote {
        identity: string;
        text: string;
    }

    interface Identity {
        identity: string;
        publicNickname: String;
        publicKey: ArrayBuffer;
        fingerprint: string;
    }

    interface TrustedKeyStoreData {
        ownPublicKey: Uint8Array;
        ownSecretKey: Uint8Array;
        peerPublicKey: Uint8Array;
        pushToken: string | null;
    }

    interface BrowserInfo {
        chrome: boolean;
        firefox: boolean;
        msie: boolean;
        opera: boolean;
        safari: boolean;
        version: string;
        textInfo: string;
    }

    interface PromiseCallbacks {
        resolve: (arg: any) => void;
        reject: (arg: any) => void;
    }

    interface PromiseRequestResult<T> {
        success: boolean;
        message?: string;
        data?: T;
    }

    interface ControllerModel {
        subject: string;
        isLoading: boolean;
        save(): any;
        isValid(): boolean;
        canEdit(): boolean;
        getMode(): number;
        setOnRemoved(callback: any): void;
    }

    interface AvatarControllerModel {
        onChangeAvatar: (image: ArrayBuffer) => void;
        getAvatar(): ArrayBuffer | null;
    }

    interface Alert {
        source: string;
        type: string;
        message: string;
    }

    interface ReceiverListener {
        onRemoved(receiver: Receiver);
    }

    interface Config {
        SELF_HOSTED: boolean;
        SALTYRTC_PORT: number;
        SALTYRTC_SERVER_KEY: string | null;
        SALTYRTC_HOST: string | null;
        SALTYRTC_HOST_PREFIX: string | null;
        SALTYRTC_HOST_SUFFIX: string | null;
        ICE_SERVERS: RTCIceServer[];
        PUSH_URL: string;
    }

    interface BrowserMinVersions {
        FF: number;
        CHROME: number;
        OPERA: number;
    }

    interface WebClientDefault {
        getAvatar(type: string, highResolution: boolean): string;
    }

    namespace Container {
        interface ReceiverData {
            me: MeReceiver;
            contacts: ContactReceiver[];
            groups: GroupReceiver[];
            distributionLists: DistributionListReceiver[];
        }

        interface Converter {
            unicodeToEmoji(message);
            addReceiverToConversation(receivers: Receivers);
        }
        interface Filters {
            hasData(receivers);
            hasContact(contacts);
            isValidMessage(contacts);
        }
        interface Receivers {
            me: MeReceiver;
            contacts: Map<string, ContactReceiver>;
            groups: Map<string, GroupReceiver>;
            distributionLists: Map<string, DistributionListReceiver>;
            get(receiverType: ReceiverType): Receiver | Map<string, Receiver>;
            getData(receiver: Receiver): Receiver | null;
            set(data: ReceiverData): void;
            setMe(data: MeReceiver): void;
            setContacts(data: ContactReceiver[]): void;
            setGroups(data: GroupReceiver[]): void;
            setDistributionLists(data: DistributionListReceiver[]): void;
            extend(receiverType: ReceiverType, data: Receiver): Receiver;
            extendDistributionList(data: DistributionListReceiver): DistributionListReceiver;
            extendGroup(data: GroupReceiver): GroupReceiver;
            extendMe(data: MeReceiver): MeReceiver;
            extendContact(data: ContactReceiver): ContactReceiver;
        }

        interface Conversations {
            get(): Conversation[];
            set(data: Conversation[]): void;
            add(conversation: Conversation): void;
            updateOrAdd(conversation: Conversation): void;
            remove(conversation: Conversation): void;
            setFilter(filter: (data: Conversation[]) => Conversation[]): void;
            setConverter(converter: (data: Conversation) => Conversation): void;
        }

        interface Messages {
            converter: (data: Message) => Message;
            getList(receiver: Receiver): Message[];
            clear($scope: ng.IScope): void;
            clearReceiverMessages(receiver: Receiver): Number;
            contains(receiver: Receiver): boolean;
            hasMore(receiver: Receiver): boolean;
            setMore(receiver: Receiver, more: boolean): void;
            getReferenceMsgId(receiver: Receiver): number;
            isRequested(receiver: Receiver): boolean;
            setRequested(receiver: Receiver): void;
            clearRequested(receiver): void;
            addNewer(receiver: Receiver, messages: Message[]): void;
            addOlder(receiver: Receiver, messages: Message[]): void;
            update(receiver: Receiver, message: Message): boolean;
            setThumbnail(receiver: Receiver, messageId: number, thumbnailImage: string): boolean;
            remove(receiver: Receiver, messageId: number): boolean;
            removeTemporary(receiver: Receiver, temporaryMessageId: string): boolean;
            bindTemporaryToMessageId(receiver: Receiver, temporaryId: string, messageId: number): boolean;
            notify(receiver: Receiver, $scope: ng.IScope): void;
            register(receiver: Receiver, $scope: ng.IScope, callback: any): Message[];
            updateFirstUnreadMessage(receiver: Receiver);
        }

        interface Typing {
            setTyping(receiver: ContactReceiver): void;
            unsetTyping(receiver: ContactReceiver): void;
            isTyping(receiver: ContactReceiver): boolean;
        }

        interface Drafts {
            setQuote(receiver: Receiver, quote: Quote): void;
            removeQuote(receiver: Receiver): void;
            getQuote(receiver: Receiver): Quote;
            setText(receiver: Receiver, draftMessage: string): void;
            removeText(receiver: Receiver): void;
            getText(receiver: Receiver): string;
        }

        interface Factory {
            Converter: Container.Converter;
            Filters: Container.Filters;
            createReceivers: () => Receivers;
            createConversations: () => Conversations;
            createMessages: () => Messages;
            createTyping: () => Typing;
            createDrafts: () => Drafts;
        }
    }
}
