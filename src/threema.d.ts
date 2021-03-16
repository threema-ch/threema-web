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

declare const angular: ng.IAngularStatic;

declare namespace threema {
    type LogType = 'debug' | 'trace' | 'info' | 'warn' | 'error';
    type LogLevel = 'none' | 'debug' | 'info' | 'warn' | 'error';
    type LogRecord = [number, LogType, any?, ...any[]];

    /**
     * An object can be marked as confidential in which case it needs to
     * implement the censor method. This mixin is being used for sanitising log
     * records when using the report tool.
     */
    interface Confidential<U, C> {
        uncensored: U;
        censored(): C;
    }

    interface Avatar {
        // Low resolution avatar URI
        low?: ArrayBuffer;
        // High resolution avatar URI
        high?: ArrayBuffer;
    }

    interface WireMessageAcknowledgement {
        id: string;
        success: boolean;
        error?: string;
    }

    /**
     * Messages that are sent through the secure data channel as encrypted msgpack bytes.
     */
    interface WireMessage {
        type: string;
        subType: string;
        id?: string;
        ack?: WireMessageAcknowledgement;
        args?: any;
        data?: any;
    }

    type MessageType = 'text' | 'image' | 'video' | 'audio' | 'location' | 'contact' |
                       'status' | 'ballot' | 'file' | 'voipStatus' | 'unknown';
    type MessageState = 'pending' | 'sending' | 'send-failed' | 'sent' | 'delivered' |
                        'read' | 'user-ack' | 'user-dec';

    const enum InitializationStep {
        ClientInfo = 'client info',
        Conversations = 'conversations',
        Receivers = 'receivers',
        Profile = 'profile',
    }

    interface InitializationStepRoutine {
        requiredSteps: InitializationStep[];
        callback: any;
    }

    interface Thumbnail {
        img?: ArrayBuffer; // Note: Does not exist in ARP
        preview: ArrayBuffer;
        previewDataUrl?: string, // Note: Does not exist in ARP
        width: number;
        height: number;
    }

    const enum EventType {
        Created = 'created',
        Sent = 'sent',
        Delivered = 'delivered',
        Read = 'read',
        Acked = 'acked',
        Modified = 'modified',
    }

    /**
     * A message event, e.g. when it was delivered, read or modified.
     */
    interface MessageEvent {
        // The event type
        type: EventType;

        // Unix timestamp in seconds
        date: number;
    }

    /**
     * A Threema chat message.
     */
    interface Message {
        type: MessageType;
        id: string;
        body?: string;
        thumbnail?: Thumbnail;
        date?: number;
        events?: MessageEvent[];
        sortKey: number;
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
        voip?: VoipStatusInfo;
        location?: LocationInfo;
        // only for temporary Messages
        temporaryId?: string;
        errorMessage?: string;
    }

    interface FileInfo {
        name: string;
        size: number;
        type: string;
        inApp: boolean; // See: https://github.com/threema-ch/app-remote-protocol/issues/4
    }

    interface VideoInfo {
        duration: number;
        size?: number;
    }

    interface AudioInfo {
        duration: number;
    }

    const enum VoipStatus {
        Missed = 1,
        Finished = 2,
        Rejected = 3,
        Aborted = 4,
    }

    const enum VoipRejectReason {
        Unknown = 0,
        Busy = 1,
        Timeout = 2,
        Rejected = 3,
        Disabled = 4,
    }

    interface VoipStatusInfo {
        status: VoipStatus;
        duration?: number;
        reason?: VoipRejectReason;
    }

    interface LocationInfo {
        lat: number;
        lon: number;
        accuracy: number;
        description: string;
        address?: string;
    }

    interface BlobInfo {
        buffer: ArrayBuffer;
        mimetype: string;
        filename: string;
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

    const enum IdentityType {
        Regular = 0,
        Work = 1,
    }

    /**
     * The base class for a receiver. Only type and id.
     */
    interface BaseReceiver {
        id: string;
        type: ReceiverType;
    }

    /**
     * A generic receiver.
     *
     * Note that the id is not unique for all receivers, only for all receivers
     * of a certain type. The primary key for a receiver is the tuple (type, id).
     */
    interface Receiver extends BaseReceiver {
        // The display name
        displayName: string;

        // The color used for the avatar
        color: string;

        // The avatar, may be set if already fetched
        avatar?: Avatar;

        // Permissions towards this receiver
        access: ReceiverAccess;

        // Whether the chat with this receiver is locked. Used for private chats.
        locked: boolean;

        // Whether the chat with this receiver is visible. Used for private chats.
        visible: boolean;
    }

    /**
     * A contact.
     */
    interface ContactReceiver extends Receiver {
        // Flag indicating whether this is the own profile or another contact
        type: 'contact' | 'me';

        // Public nickname, if set
        publicNickname?: string;

        // First name, if set
        firstName?: string;

        // Last name, if set
        lastName?: string;

        // Verification level integer (1-3)
        verificationLevel?: number;

        // Feature mask
        featureMask: number;

        // The identity state
        state: 'ACTIVE' | 'INACTIVE' | 'INVALID';

        // Contact hidden?
        hidden: boolean;

        // The Threema public key
        publicKey: ArrayBuffer;

        // System confact information
        systemContact?: SystemContact;

        // Permissions towards this contact
        access: ContactReceiverAccess;

        // Whether this is a contact from the same Threema Work package.
        // Only relevant for Threema Work users.
        isWork?: boolean;

        // Whether this contact is blocked
        isBlocked?: boolean;

        // The identity type.
        // 0 - Regular Threema user.
        // 1 - Threema Work user.
        identityType?: IdentityType;
    }

    /**
     * Own contact.
     */
    interface MeReceiver extends ContactReceiver {
        type: 'me';
    }

    /**
     * A group.
     */
    interface GroupReceiver extends Receiver {
        type: 'group';
        disabled: boolean;
        members: string[];
        administrator: string;
        access: GroupReceiverAccess;
        createdAt: number;
    }

    /**
     * A distribution list.
     */
    interface DistributionListReceiver extends Receiver {
        type: 'distributionList';
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
        position?: number;
        messageCount: number;
        unreadCount: number;
        latestMessage?: Message;
        receiver?: Receiver;
        avatar?: ArrayBuffer;
        notifications?: NotificationSettings;
        isStarred?: boolean;
    }

    /**
     * A conversation with a position field, used for updating a conversation.
     */
    interface ConversationWithPosition extends Conversation {
        position: number;
    }

    interface NotificationSettings {
        sound: NotificationSound;
        dnd: NotificationDnd;
    }

    interface NotificationSound {
        mode: NotificationSoundMode;
    }

    const enum NotificationSoundMode {
        Default = 'default',
        Muted = 'muted',
    }

    interface NotificationDnd {
        mode: NotificationDndMode;
        mentionOnly?: boolean;
        until?: number;
    }

    const enum NotificationDndMode {
        Off = 'off',
        On = 'on',
        Until = 'until',
    }

    /**
     * A form of the notification settings where things like the "until" mode
     * have been processed already.
     */
    interface SimplifiedNotificationSettings {
        sound: {
            muted: boolean,
        };
        dnd: {
            enabled: boolean,
            mentionOnly: boolean,
        };
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
     * - already_connected: When the user is already connected in another tab or window
     * - waiting: Waiting for new-responder message from signaling server
     * - peer_handshake: Doing SaltyRTC handshake with the peer
     * - loading: Loading initial data
     * - done: Initial loading is finished
     * - closed: Connection is closed
     * - reconnect_failed: Reconnecting failed after several attempts
     *
     */
    type ConnectionBuildupState = 'new' | 'connecting' | 'push' | 'manual_start' | 'already_connected'
        | 'waiting' | 'peer_handshake' | 'loading' | 'done' | 'closed' | 'reconnect_failed';

    interface ConnectionBuildupStateChange {
        state: ConnectionBuildupState;
        prevState: ConnectionBuildupState;
    }

    /**
     * Connection state of the task peer connection.
     */
    const enum TaskConnectionState {
        New = 'new',
        Connecting = 'connecting',
        Connected = 'connected',
        Reconnecting = 'reconnecting',
        Disconnected = 'disconnected',
    }

    /**
     * Connection state of the WebRTC peer connection.
     */
    const enum GlobalConnectionState {
        Ok = 'ok',
        Warning = 'warning',
        Error = 'error',
    }

    interface GlobalConnectionStateChange {
        state: GlobalConnectionState;
        prevState: GlobalConnectionState;
    }

    /**
     * Type of message to be sent to a receiver.
     */
    type MessageContentType = 'text' | 'file';

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
        caption?: string;
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

    interface Quote {
        identity: string;
        text: string;
        messageId?: string;
    }

    interface PushSessionConfig {
        retryTimeoutInitMs: number;
        retryTimeoutMaxMs: number;
        triesMax: number;
        timeToLiveRange: number[];
    }

    const enum PushTokenType {
        Fcm = 'gcm',
        Apns = 'apns',
        Hms = 'hms',
    }

    const enum PushTokenPrefix {
        Fcm = 'g',
        Apns = 'a',
        Hms = 'h',
    }

    interface TrustedKeyStoreData {
        ownPublicKey: Uint8Array;
        ownSecretKey: Uint8Array;
        peerPublicKey: Uint8Array;
        pushToken: string | null;
        pushTokenType: PushTokenType | null;
    }

    const enum BrowserName {
        Chrome = 'chrome',
        ChromeIos = 'chromeIos',
        Firefox = 'firefox',
        FirefoxIos = 'firefoxIos',
        InternetExplorer = 'ie',
        Edge = 'edge',
        Opera = 'opera',
        Safari = 'safari',
    }

    interface PromiseRequestResult<T> {
        success: boolean;
        error?: string;
        data?: T;
    }

    type OnRemovedCallback = (identity: string) => void;

    const enum ControllerModelMode {
        NEW = 'new',
        VIEW = 'view',
        EDIT = 'edit',
        CHAT = 'chat',
    }

    const enum ContactReceiverFeature {
        NONE = 0x00,
        AUDIO = 0x01,
        GROUP_CHAT = 0x02,
        BALLOT = 0x04,
        FILE = 0x08,
        VOIP = 0x10,
    }

    interface ControllerModel<T extends BaseReceiver> {
        /**
         * The receiver type that is handled by this controller model.
         */
        receiverType: threema.ReceiverType;

        /**
         * The title shown in the header.
         */
        subject: string;

        /**
         * Loading state.
         */
        isLoading: boolean;

        /**
         * Save the changes, return a promise with the receiver.
         */
        save(): Promise<T>;

        /**
         * Delete all messages in this conversation.
         */
        clean(ev: any): any;

        /**
         * Validate this receiver.
         */
        isValid(): boolean;

        /*
         * Return whether this receiver can be chatted with.
         */
        canChat(): boolean;

        /**
         * Can this receiver be edited?
         */
        canEdit(): boolean;

        /**
         * Can this receiver be cleaned?
         */
        canClean(): boolean;

        /*
         * Return whether this receiver can show a QR code of the public key.
         */
        canShowQr(): boolean;

        /**
         * The editing mode, e.g. view or edit this receiver.
         */
        getMode(): ControllerModelMode;

        /**
         * Set the on removed callback.
         */
        setOnRemoved(callback: OnRemovedCallback): void;
    }

    interface ControllerModelWithMembers {
        /**
         * Callback called when the members change.
         */
        onChangeMembers(identities: string[]): void;

        /**
         * Return the members of this receiver.
         */
        getMembers(): string[];
    }

    interface Alert {
        source: string;
        type: string;
        message: string;
    }

    interface ReceiverListener {
        onConversationRemoved(receiver: Receiver);
    }

    interface Config {
        // Version
        VERSION: string;

        // General
        SELF_HOSTED: boolean;
        VERSION_MOUNTAIN: string;
        VERSION_MOUNTAIN_URL: string;
        VERSION_MOUNTAIN_IMAGE_URL: string;
        VERSION_MOUNTAIN_IMAGE_COPYRIGHT: string;
        VERSION_MOUNTAIN_HEIGHT: number;
        PREV_PROTOCOL_LAST_VERSION: string | null;
        GIT_BRANCH: string;

        // SaltyRTC
        SALTYRTC_HOST: string;
        SALTYRTC_PORT: number;
        SALTYRTC_SERVER_KEY: string | null;

        // ICE
        ICE_SERVERS: RTCIceServer[];

        // Push
        PUSH_URL: string;

        // Fonts
        FONT_CSS_URL: string;

        // Logging/debugging
        LOG_TAG_PADDING: number,
        CONSOLE_LOG_LEVEL: LogLevel;
        REPORT_LOG_LEVEL: LogLevel;
        REPORT_LOG_LIMIT: number;
        COMPOSE_AREA_LOG_LEVEL: LogLevel;
        SALTYRTC_LOG_LEVEL: saltyrtc.LogLevel;
        TIMER_LOG_LEVEL: LogLevel;
        ARP_LOG_LEVEL: LogLevel;
        ARP_LOG_TRACE: boolean;
        MSGPACK_LOG_TRACE: boolean;
        TRANSPORT_LOG_LEVEL: LogLevel;
        VISUALIZE_STATE: boolean;
    }

    interface InitialConversationData {
        draft: string;
        initialText: string;
    }

    interface BrowserMinVersions {
        FF: number;
        CHROME: number;
        OPERA: number;
        SAFARI: number;
        EDGE: number;
    }

    interface BatteryStatus {
        percent: number | null;
        isCharging: boolean;
    }

    const enum OperatingSystem {
        Android = 'android',
        Ios = 'ios',
    }

    const enum Theme {
        Regular = 'threema',
        Work = 'threemawork',
    }

    interface ClientInfo {
        // The device name
        device: string;

        // The operating system
        os: OperatingSystem;

        // The operating system version (e.g. "5.1")
        osVersion: string;

        // Whether the app is the *work* variant of Threema
        isWork: boolean;

        // The FCM / HMS / APNS push token
        // (Note: HMS tokens are prefixed with "hms;")
        pushToken?: string;

        // The device configuration
        configuration: AppConfig;

        // The device capabilities
        capabilities: AppCapabilities;
    }

    interface AppConfig {
        voipEnabled: boolean;
        voipForceTurn: boolean;
        largeSingleEmoji: boolean;
        showInactiveIDs: boolean;
    }

    interface AppCapabilities {
        maxGroupSize: number;
        maxFileSize: number;
        maxMessageBodySize: number;
        distributionLists: boolean;
        imageFormat: ImageFormat;
        mdm?: MdmRestrictions;
    }

    /**
     * MIME types for the images exchanged between app and browser.
     */
    interface ImageFormat {
        avatar: string;
        thumbnail: string;
    }

    interface MdmRestrictions {
        disableAddContact?: boolean;
        disableCreateGroup?: boolean;
        disableSaveToGallery?: boolean;
        disableExport?: boolean;
        disableMessagePreview?: boolean;
        disableCalls?: boolean;
        readonlyProfile?: boolean;
    }

    interface ProfileUpdate {
        publicNickname?: string;
        avatar?: ArrayBuffer;
    }

    interface Profile extends ProfileUpdate {
        identity: string;
        publicKey: ArrayBuffer;
    }

    interface Mention {
        identity: string;
        query: string;
        isAll: boolean;
    }

    interface WebClientServiceStopArguments {
        reason: DisconnectReason;
        send: boolean;
        close: boolean | string;
        connectionBuildupState?: ConnectionBuildupState;
    }

    const enum ChosenTask {
        None = 'none',
        WebRTC = 'webrtc',
        RelayedData = 'relayed-data',
    }

    const enum DisconnectReason {
        SessionStopped = 'stop',
        SessionDeleted = 'delete',
        WebclientDisabled = 'disable',
        SessionReplaced = 'replace',
        OutOfMemory = 'oom',
        SessionError = 'error',
    }

    const enum ComposeAreaSubmitKey {
        Enter = 0,
        CtrlEnter = 1,
    }

    const enum UserInterface {
        Default = 'default',
        Minimal = 'minimal'
    }

    interface EmojiInfo {
        // The plain emoji string
        emojiString: string;
        // The image path, e.g. emoji/png32/1f9df-200d-2640-fe0f.png
        imgPath: string;
        // The codepoint string, e.g. 1f9df-200d-2640-fe0f
        codepoint: string;
    }

    namespace Container {
        interface ReceiverData {
            contacts: ContactReceiver[];
            groups: GroupReceiver[];
            distributionLists: DistributionListReceiver[];
        }

        interface Converter {
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
            getData(receiver: BaseReceiver): Receiver | null;
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
            find(pattern: Conversation | Receiver): Conversation | null;
            add(conversation: Conversation): void;
            updateOrAdd(conversation: Conversation, returnOld?: boolean): Conversation | null;
            remove(conversation: Conversation): void;
            setFilter(filter: (data: Conversation[]) => Conversation[]): void;
            setConverter(converter: (data: Conversation) => Conversation): void;
        }

        interface Messages {
            converter: (data: Message) => Message;
            getList(receiver: BaseReceiver): Message[];
            clear($scope: ng.IScope): void;
            clearReceiverMessages(receiver: BaseReceiver): number;
            contains(receiver: BaseReceiver): boolean;
            hasMore(receiver: BaseReceiver): boolean;
            setMore(receiver: BaseReceiver, more: boolean): void;
            getReferenceMsgId(receiver: BaseReceiver): string;
            isRequested(receiver: BaseReceiver): boolean;
            setRequested(receiver: BaseReceiver): void;
            clearRequested(receiver: BaseReceiver): void;
            addNewer(receiver: BaseReceiver, messages: Message[]): void;
            addOlder(receiver: BaseReceiver, messages: Message[]): void;
            addStatusMessage(receiver: BaseReceiver, text: string): void;
            update(receiver: BaseReceiver, message: Message): boolean;
            setThumbnail(receiver: BaseReceiver, messageId: string, thumbnailImage: ArrayBuffer): boolean;
            remove(receiver: BaseReceiver, messageId: string): boolean;
            removeTemporary(receiver: BaseReceiver, temporaryMessageId: string): boolean;
            bindTemporaryToMessageId(receiver: BaseReceiver, temporaryId: string, messageId: string): Message | null;
            notify(receiver: BaseReceiver, $scope: ng.IScope): void;
            register(receiver: BaseReceiver, $scope: ng.IScope, callback: any): Message[];
            updateFirstUnreadMessage(receiver: BaseReceiver);
        }

        interface Typing {
            setTyping(receiver: BaseReceiver): void;
            unsetTyping(receiver: BaseReceiver): void;
            clearAll(): void;
            isTyping(receiver: BaseReceiver): boolean;
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
