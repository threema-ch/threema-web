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

/// <reference types="@saltyrtc/chunked-dc" />
/// <reference types="@saltyrtc/task-webrtc" />
/// <reference types="@saltyrtc/task-relayed-data" />

import {StateService as UiStateService} from '@uirouter/angularjs';
import {Logger} from 'ts-log';
import * as msgpack from 'msgpack-lite';
import * as nacl from 'tweetnacl';

import {
    arraysAreEqual,
    base64ToU8a,
    bufferToUrl,
    copyDeepOrReference, copyShallow,
    hasValue,
    hexToU8a,
    msgpackVisualizer,
    randomString,
    stringToUtf8a,
    u8aToHex,
} from '../helpers';
import {
    isContactReceiver,
    isDistributionListReceiver,
    isGroupReceiver,
    isValidReceiverType,
} from '../typeguards';
import {BatteryStatusService} from './battery';
import {BrowserService} from './browser';
import {TrustedKeyStoreService} from './keystore';
import {LogService} from './log';
import {MessageService} from './message';
import {MimeService} from './mime';
import {NotificationService} from './notification';
import {PeerConnectionHelper} from './peerconnection';
import {PushService, PushSession} from './push';
import {QrCodeService} from './qrcode';
import {ReceiverService} from './receiver';
import {StateService} from './state';
import {StringService} from './string';
import {ThemeService} from './theme';
import {TimeoutService} from './timeout';
import {TitleService} from './title';
import {VersionService} from './version';

import {PushError, TimeoutError} from '../exceptions';
import {ConfidentialWireMessage} from '../helpers/confidential';
import {UnboundedFlowControlledDataChannel} from '../helpers/data_channel';
import {DeviceUnreachableController, PushRejectedDialogController} from '../partials/messenger';
import {ChunkCache} from '../protocol/cache';
import {SequenceNumber} from '../protocol/sequence_number';

// Aliases
import InitializationStep = threema.InitializationStep;
import ContactReceiverFeature = threema.ContactReceiverFeature;
import DisconnectReason = threema.DisconnectReason;
import PushSessionConfig = threema.PushSessionConfig;

/**
 * Payload of a connectionInfo message.
 */
interface ConnectionInfo {
    id: ArrayBuffer;
    resume?: {
        id: ArrayBuffer;
        sequenceNumber: number;
    };
}

const fakeConnectionId = Uint8Array.from([
    1, 2, 3, 4, 5, 6, 7, 8,
    1, 2, 3, 4, 5, 6, 7, 8,
    1, 2, 3, 4, 5, 6, 7, 8,
    1, 2, 3, 4, 5, 6, 7, 8,
]);

/**
 * This service handles everything related to the communication with the peer.
 */
export class WebClientService {
    public static readonly MAX_CONNECT_ATTEMPTS = 3;
    private static DATA_CHANNEL_MAX_CHUNK_SIZE = 256 * 1024;
    private static RELAYED_DATA_CHUNK_SIZE = 64 * 1024;
    private static SEQUENCE_NUMBER_MIN = 0;
    private static SEQUENCE_NUMBER_MAX = (2 ** 32) - 1;
    private static CHUNK_CACHE_SIZE_MAX = 2 * 1024 * 1024;
    private static AVATAR_LOW_MAX_SIZE = 48;
    private static MAX_FILE_SIZE_WEBRTC_TASK_V0 = 15 * 1024 * 1024;
    private static CONNECTION_ID_NONCE = stringToUtf8a('connectionidconnectionid');

    private static TYPE_REQUEST = 'request';
    private static TYPE_RESPONSE = 'response';
    private static TYPE_UPDATE = 'update';
    private static TYPE_CREATE = 'create';
    private static TYPE_DELETE = 'delete';
    private static SUB_TYPE_RECEIVER = 'receiver';
    private static SUB_TYPE_RECEIVERS = 'receivers';
    private static SUB_TYPE_CONVERSATIONS = 'conversations';
    private static SUB_TYPE_CONVERSATION = 'conversation';
    private static SUB_TYPE_MESSAGE = 'message';
    private static SUB_TYPE_MESSAGES = 'messages';
    private static SUB_TYPE_TEXT_MESSAGE = 'textMessage';
    private static SUB_TYPE_FILE_MESSAGE = 'fileMessage';
    private static SUB_TYPE_AVATAR = 'avatar';
    private static SUB_TYPE_THUMBNAIL = 'thumbnail';
    private static SUB_TYPE_BLOB = 'blob';
    private static SUB_TYPE_TYPING = 'typing';
    private static SUB_TYPE_READ = 'read';
    private static SUB_TYPE_CLIENT_INFO = 'clientInfo';
    private static SUB_TYPE_KEY_PERSISTED = 'keyPersisted';
    private static SUB_TYPE_ACK = 'ack';
    private static SUB_TYPE_CONTACT_DETAIL = 'contactDetail';
    private static SUB_TYPE_CONTACT = 'contact';
    private static SUB_TYPE_GROUP = 'group';
    private static SUB_TYPE_DISTRIBUTION_LIST = 'distributionList';
    private static SUB_TYPE_ALERT = 'alert';
    private static SUB_TYPE_GROUP_SYNC = 'groupSync';
    private static SUB_TYPE_BATTERY_STATUS = 'batteryStatus';
    private static SUB_TYPE_CLEAN_RECEIVER_CONVERSATION = 'cleanReceiverConversation';
    private static SUB_TYPE_CONFIRM = 'confirm';
    private static SUB_TYPE_CONFIRM_ACTION = 'confirmAction'; // TODO: deprecated
    private static SUB_TYPE_PROFILE = 'profile';
    private static SUB_TYPE_CONNECTION_ACK = 'connectionAck';
    private static SUB_TYPE_CONNECTION_DISCONNECT = 'connectionDisconnect';
    private static SUB_TYPE_CONNECTION_INFO = 'connectionInfo';
    private static SUB_TYPE_ACTIVE_CONVERSATION = 'activeConversation';
    private static ARGUMENT_MODE = 'mode';
    private static ARGUMENT_MODE_NEW = 'new';
    private static ARGUMENT_MODE_MODIFIED = 'modified';
    private static ARGUMENT_MODE_REMOVED = 'removed';
    private static ARGUMENT_RECEIVER_TYPE = 'type';
    private static ARGUMENT_RECEIVER_ID = 'id';
    private static ARGUMENT_TEMPORARY_ID = 'temporaryId'; // TODO: deprecated
    private static ARGUMENT_REFERENCE_MSG_ID = 'refMsgId';
    private static ARGUMENT_AVATAR = 'avatar';
    private static ARGUMENT_AVATAR_HIGH_RESOLUTION = 'highResolution';
    private static ARGUMENT_NICKNAME = 'publicNickname';
    private static ARGUMENT_IS_TYPING = 'isTyping';
    private static ARGUMENT_MESSAGE_ID = 'messageId';
    private static ARGUMENT_HAS_MORE = 'more';
    private static ARGUMENT_MESSAGE_ACKNOWLEDGED = 'acknowledged';
    private static ARGUMENT_IDENTITY = 'identity';
    private static ARGUMENT_SUCCESS = 'success'; // TODO: deprecated
    private static ARGUMENT_SYSTEM_CONTACT = 'systemContact';
    private static ARGUMENT_NAME = 'name';
    private static ARGUMENT_MEMBERS = 'members';
    private static ARGUMENT_FIRST_NAME = 'firstName';
    private static ARGUMENT_LAST_NAME = 'lastName';
    private static ARGUMENT_DELETE_TYPE = 'deleteType';
    private static ARGUMENT_ERROR = 'error'; // TODO: deprecated
    private static ARGUMENT_MAX_SIZE = 'maxSize';
    private static ARGUMENT_USER_AGENT = 'userAgent';
    private static ARGUMENT_BROWSER_NAME = 'browserName';
    private static ARGUMENT_BROWSER_VERSION = 'browserVersion';
    private static DELETE_GROUP_TYPE_LEAVE = 'leave';
    private static DELETE_GROUP_TYPE_DELETE = 'delete';
    private static DATA_FIELD_BLOB_BLOB = 'blob';
    private static DATA_FIELD_BLOB_TYPE = 'type';
    private static DATA_FIELD_BLOB_NAME = 'name';
    private static DC_LABEL = 'THREEMA';

    // Angular services
    private $state: UiStateService;
    private $rootScope: any;
    private $q: ng.IQService;
    private $window: ng.IWindowService;
    private $translate: ng.translate.ITranslateService;
    private $filter: any;
    private $timeout: ng.ITimeoutService;
    private $mdDialog: ng.material.IDialogService;

    // Custom services
    private batteryStatusService: BatteryStatusService;
    private browserService: BrowserService;
    private logService: LogService;
    private messageService: MessageService;
    private mimeService: MimeService;
    private notificationService: NotificationService;
    private pushService: PushService;
    private qrCodeService: QrCodeService;
    private receiverService: ReceiverService;
    private stringService: StringService;
    private themeService: ThemeService;
    private timeoutService: TimeoutService;
    private titleService: TitleService; // Don't remove, needs to be initialized to handle events
    private versionService: VersionService;

    // Logging
    private readonly log: Logger;
    private readonly arpLog: Logger;
    private readonly arpLogV: Logger;
    private readonly msgpackLog: Logger;

    // State handling
    private startupPromise: ng.IDeferred<{}> = null; // TODO: deferred type
    public startupDone: boolean = false;
    private handoverDone: boolean = false;
    private pendingInitializationStepRoutines: Set<threema.InitializationStepRoutine> = new Set();
    private initialized: Set<threema.InitializationStep> = new Set();
    private stateService: StateService;

    // Session connection
    private saltyRtcHost: string = null;
    private saltyRtcQrHost: string = null;
    public salty: saltyrtc.SaltyRTC = null;
    private connectionInfoFuture: Future<ConnectionInfo> = null;
    private relayedDataTask: saltyrtc.tasks.relayed_data.RelayedDataTask = null;
    private secureDataChannel: UnboundedFlowControlledDataChannel = null;
    private secureDataChannelCrypto: saltyrtc.tasks.webrtc.DataChannelCryptoContext = null;
    private secureDataChannelChunkLength: number = null;
    private secureDataChannelMessageId: number = 0;
    public chosenTask: threema.ChosenTask = threema.ChosenTask.None;
    private outgoingMessageSequenceNumber: SequenceNumber;
    private previousConnectionId: Uint8Array = null;
    private currentConnectionId: Uint8Array = null;
    private previousIncomingChunkSequenceNumber: SequenceNumber = null;
    private currentIncomingChunkSequenceNumber: SequenceNumber;
    private previousChunkCache: ChunkCache = null;
    private currentChunkCache: ChunkCache = null;
    private handshakeCompleted: boolean = false;
    private ackTimer: number | null = null;
    private pendingAckRequest: number | null = null;

    // Message chunking
    private unchunker: chunkedDc.UnreliableUnorderedUnchunker = null;

    // Messenger data
    public messages: threema.Container.Messages;
    public conversations: threema.Container.Conversations;
    public receivers: threema.Container.Receivers;
    public alerts: threema.Alert[] = [];

    // Push
    private pushToken: string = null;
    public pushTokenType: threema.PushTokenType = null;
    private pushSession: PushSession | null = null;
    private readonly pushSessionConfig: PushSessionConfig;
    private readonly pushSessionExpectedPeriodMaxMs: number;
    private pushPromise: Promise<any> | null = null;
    private deviceUnreachableDialog: ng.IPromise<any> | null = null;
    private pushTimer: number | null = null;
    private schedulePushAfterCooldown: boolean = false;

    // Timeouts
    private batteryStatusTimeout: ng.IPromise<void> = null;

    // Other
    private config: threema.Config;
    private userConfig: threema.UserConfig;
    private container: threema.Container.Factory;
    private typingInstance: threema.Container.Typing;
    private drafts: threema.Container.Drafts;
    private pcHelper: PeerConnectionHelper = null;
    private trustedKeyStore: TrustedKeyStoreService;
    public clientInfo: threema.ClientInfo = null;
    public version = null;

    private blobCache = new Map<string, threema.BlobInfo>();
    private loadingMessages = new Map<string, boolean>();

    public receiverListener: threema.ReceiverListener[] = [];

    // Msgpack
    private msgpackEncoderOptions: msgpack.EncoderOptions = {
        codec: msgpack.createCodec({binarraybuffer: true}),
    };
    private msgpackDecoderOptions: msgpack.DecoderOptions = {
        codec: msgpack.createCodec({binarraybuffer: true}),
    };

    // Messages that require acknowledgement
    private wireMessageFutures: Map<string, Future<any>> = new Map();

    public static $inject = [
        '$rootScope', '$q', '$state', '$window', '$translate', '$filter', '$timeout', '$mdDialog',
        'LogService', 'Container', 'TrustedKeyStore',
        'StateService', 'NotificationService', 'MessageService', 'PushService', 'BrowserService',
        'TitleService', 'QrCodeService', 'MimeService', 'ReceiverService', 'StringService',
        'VersionService', 'BatteryStatusService', 'ThemeService', 'TimeoutService',
        'CONFIG',
    ];
    constructor($rootScope: any,
                $q: ng.IQService,
                $state: UiStateService,
                $window: ng.IWindowService,
                $translate: ng.translate.ITranslateService,
                $filter: ng.IFilterService,
                $timeout: ng.ITimeoutService,
                $mdDialog: ng.material.IDialogService,
                logService: LogService,
                container: threema.Container.Factory,
                trustedKeyStore: TrustedKeyStoreService,
                stateService: StateService,
                notificationService: NotificationService,
                messageService: MessageService,
                pushService: PushService,
                browserService: BrowserService,
                titleService: TitleService,
                qrCodeService: QrCodeService,
                mimeService: MimeService,
                receiverService: ReceiverService,
                stringService: StringService,
                versionService: VersionService,
                batteryStatusService: BatteryStatusService,
                themeService: ThemeService,
                timeoutService: TimeoutService,
                CONFIG: threema.Config) {

        // Angular services
        this.$rootScope = $rootScope;
        this.$q = $q;
        this.$state = $state;
        this.$window = $window;
        this.$translate = $translate;
        this.$filter = $filter;
        this.$timeout = $timeout;
        this.$mdDialog = $mdDialog;

        // Own services
        this.batteryStatusService = batteryStatusService;
        this.browserService = browserService;
        this.logService = logService;
        this.messageService = messageService;
        this.mimeService = mimeService;
        this.notificationService = notificationService;
        this.pushService = pushService;
        this.qrCodeService = qrCodeService;
        this.receiverService = receiverService;
        this.stringService = stringService;
        this.themeService = themeService;
        this.timeoutService = timeoutService;
        this.titleService = titleService;
        this.versionService = versionService;

        // Configuration object
        this.config = CONFIG;
        // tslint:disable-next-line: no-string-literal
        this.userConfig = window['UserConfig'];

        // Logging
        this.log = logService.getLogger('WebClient-S', 'color: #fff; background-color: #0066cc');
        this.arpLog = logService.getLogger(
            'AppRemoteProtocol', 'color: #fff; background-color: #0099cc', this.userConfig.ARP_LOG_LEVEL);
        this.arpLogV = logService.getLogger(
            'AppRemoteProtocol', 'color: #fff; background-color: #00ace6', this.userConfig.ARP_LOG_TRACE ? 'debug' : 'none');
        this.msgpackLog = logService.getLogger(
            'MessagePack', 'color: #fff; background-color: #006699', this.userConfig.MSGPACK_LOG_TRACE ? 'debug' : 'none');

        // State
        this.stateService = stateService;

        // Push session configuration
        this.pushSessionConfig = PushSession.defaultConfig;
        this.pushSessionConfig.triesMax = WebClientService.MAX_CONNECT_ATTEMPTS;
        // TODO: Remove below config overwrite lines once the app-related push issues have been resolved in #802
        this.pushSessionConfig = {
            retryTimeoutInitMs: 14000, retryTimeoutMaxMs: 30000, triesMax: 1, timeToLiveRange: [90],
        };
        this.pushSessionExpectedPeriodMaxMs = PushSession.expectedPeriodMaxMs(this.pushSessionConfig);

        // Other properties
        this.container = container;
        this.trustedKeyStore = trustedKeyStore;

        // Initialize drafts
        this.drafts = this.container.createDrafts();

        // Setup fields
        this._resetFields();

        // Register event handlers
        this.stateService.evtConnectionBuildupStateChange.attach(
            (stateChange: threema.ConnectionBuildupStateChange) => {
                if (this.startupPromise !== null) {
                    this.startupPromise.notify(stateChange);
                }
            },
        );
        this.stateService.evtGlobalConnectionStateChange.attach(this.handleGlobalConnectionStateChange.bind(this));
    }

    /**
     * Return whether wire messages can be sent (or queued to be sent).
     *
     * Note: This will not return `true` before an initial connection has been
     *       established successfully.
     */
    get readyToSubmit(): boolean {
        return this.stateService.readyToSubmit(this.chosenTask, this.startupDone);
    }

    get me(): threema.MeReceiver {
        return this.receivers.me;
    }

    get contacts(): Map<string, threema.ContactReceiver> {
        return this.receivers.contacts;
    }

    get groups(): Map<string, threema.GroupReceiver> {
        return this.receivers.groups;
    }

    get distributionLists(): Map<string, threema.DistributionListReceiver>  {
        return this.receivers.distributionLists;
    }

    get typing(): threema.Container.Typing {
        return this.typingInstance;
    }

    /**
     * Return the amount of unacknowledged wire messages.
     */
    get unacknowledgedWireMessages(): number {
        return this.wireMessageFutures.size;
    }

    // TODO: Deprecated - remove this attribute and update all references
    get requiresTemporaryIdBackwardsCompatibility(): boolean {
        return this.chosenTask !== threema.ChosenTask.RelayedData;
    }

    /**
     * Return QR code payload.
     */
    public buildQrCodePayload(persistent: boolean): string {
        return this.qrCodeService.buildQrCodePayload(
            this.salty.permanentKeyBytes,
            this.salty.authTokenBytes,
            hexToU8a(this.userConfig.SALTYRTC_SERVER_KEY),
            this.saltyRtcQrHost,
            hasValue(this.userConfig.SALTYRTC_QR_PORT) ? this.userConfig.SALTYRTC_QR_PORT : this.userConfig.SALTYRTC_PORT,
            persistent);
    }

    /**
     * Initialize the webclient service.
     *
     * Warning: Do not call this with `flags.resume` set to `false` in case
     *          messages can be queued by the user.
     */
    public init(flags: {
        keyStore?: saltyrtc.KeyStore,
        peerTrustedKey?: Uint8Array,
        resume: boolean,
    }): void {
        let keyStore = flags.keyStore;
        let resumeSession = flags.resume;
        this.log.info(`Initializing (keyStore=${keyStore !== undefined ? 'yes' : 'no'}, peerTrustedKey=` +
            `${flags.peerTrustedKey !== undefined ? 'yes' : 'no'}, resume=${resumeSession})`);

        // Reset fields, blob cache, pending requests and pending timeouts in case the session
        // should explicitly not be resumed
        if (!resumeSession) {
            this.clearCache();
            this.wireMessageFutures.clear();
            this.timeoutService.cancelAll();
        }

        // Only move the previous connection's instances if the previous
        // connection was successful (and if there was one at all).
        if (resumeSession) {
            if (this.previousConnectionId) {
                this.arpLog.debug(`Trying to resume previous session (id=${u8aToHex(this.previousConnectionId)}, ` +
                    `sn-out=${this.previousChunkCache.sequenceNumber.get()})`);
            } else {
                resumeSession = false;
                this.arpLog.debug('Wanted to resume previous session but none exists');
            }
        } else {
            // Discard session
            this.discardSession({ resetMessageSequenceNumber: true });
            resumeSession = false;
            this.arpLog.debug('Discarded previous session');
        }

        // Reset handshake completed flag
        this.handshakeCompleted = false;

        // Initialise connection caches
        this.currentConnectionId = null;
        this.currentIncomingChunkSequenceNumber = new SequenceNumber(
            0, WebClientService.SEQUENCE_NUMBER_MIN, WebClientService.SEQUENCE_NUMBER_MAX);
        const outgoingChunkSequenceNumber = new SequenceNumber(
            0, WebClientService.SEQUENCE_NUMBER_MIN, WebClientService.SEQUENCE_NUMBER_MAX);
        this.currentChunkCache = new ChunkCache(outgoingChunkSequenceNumber);

        // Reset pending ack request
        this.pendingAckRequest = null;

        // Create new handshake future
        this.connectionInfoFuture = new Future();

        // Create tasks
        const tasks: saltyrtc.Task[] = [];

        // Create WebRTC task instance (if supported)
        if (this.browserService.supportsWebrtcTask()) {
            // TODO: Remove legacy v0 after a transitional period
            tasks.push(new saltyrtcTaskWebrtc.WebRTCTaskBuilder()
                .withLoggingLevel(this.userConfig.SALTYRTC_LOG_LEVEL)
                .withVersion('v1')
                .withHandover(true)
                .build());
            tasks.push(new saltyrtcTaskWebrtc.WebRTCTaskBuilder()
                .withLoggingLevel(this.userConfig.SALTYRTC_LOG_LEVEL)
                .withVersion('v0')
                .withHandover(true)
                .withMaxChunkLength(this.browserService.getBrowser().isFirefox(false) ? 16384 : 65536)
                .build());
        }

        // Create Relayed Data task instance
        this.relayedDataTask = new saltyrtcTaskRelayedData.RelayedDataTask(this.userConfig.SALTYRTC_LOG_LEVEL === 'debug');
        tasks.push(this.relayedDataTask);

        // Create new keystore if necessary
        if (!keyStore) {
            keyStore = new saltyrtcClient.KeyStore();
        }

        // Determine SaltyRTC host, replace the inner prefix (if any)
        this.saltyRtcHost = this.userConfig.SALTYRTC_HOST.replace('{prefix}', keyStore.publicKeyHex.substr(0, 2));
        this.saltyRtcQrHost = this.saltyRtcHost;
        if (hasValue(this.userConfig.SALTYRTC_QR_HOST)) {
            this.saltyRtcQrHost = this.userConfig.SALTYRTC_QR_HOST.replace('{prefix}', keyStore.publicKeyHex.substr(0, 2));
        }

        // Create SaltyRTC client
        let builder = new saltyrtcClient.SaltyRTCBuilder()
            .connectTo(this.saltyRtcHost, this.userConfig.SALTYRTC_PORT)
            .withLoggingLevel(this.userConfig.SALTYRTC_LOG_LEVEL)
            .withServerKey(this.userConfig.SALTYRTC_SERVER_KEY)
            .withKeyStore(keyStore)
            .usingTasks(tasks)
            .withPingInterval(30);
        if (flags.peerTrustedKey !== undefined) {
            builder = builder.withTrustedPeerKey(flags.peerTrustedKey);
        }
        this.salty = builder.asInitiator();
        this.arpLog.info('Public key:', this.salty.permanentKeyHex);
        this.arpLogV.debug('Auth token:', this.salty.authTokenHex);

        // We want to know about state changes
        this.salty.on('state-change', (ev: saltyrtc.SaltyRTCEvent) => {
            const state: saltyrtc.SignalingState = ev.data;
            if (!this.startupDone) {
                switch (state) {
                    case 'new':
                    case 'ws-connecting':
                    case 'server-handshake':
                        if (this.stateService.connectionBuildupState !== 'push'
                            && this.stateService.connectionBuildupState !== 'manual_start') {
                            this.stateService.updateConnectionBuildupState('connecting');
                        }
                        break;
                    case 'peer-handshake':
                        // Waiting for peer
                        if (this.stateService.connectionBuildupState !== 'push'
                            && this.stateService.connectionBuildupState !== 'manual_start') {
                            this.stateService.updateConnectionBuildupState('waiting');
                        }
                        break;
                    case 'task':
                        this.onTaskEstablished(resumeSession);
                        break;
                    case 'closing':
                    case 'closed':
                        this.stateService.updateConnectionBuildupState('closed');
                        break;
                    default:
                        this.arpLog.warn('Unknown signaling state:', state);
                }
            }
            this.stateService.updateSignalingConnectionState(state, this.chosenTask, this.handoverDone);
        });

        // Handle disconnecting of a peer
        this.salty.on('peer-disconnected', (ev: saltyrtc.SaltyRTCEvent) => {
            this.$rootScope.$apply(() => {
                this.onPeerDisconnected(ev.data);
            });
        });

        // Wait for handover to be finished
        this.salty.on('handover', () => {
            this.arpLog.debug('Handover done');
            this.onHandover(resumeSession);
        });

        // Handle SaltyRTC errors
        this.salty.on('connection-error', (ev) => {
            this.arpLog.error('Connection error:', ev);
        });
        this.salty.on('connection-closed', (ev) => {
            this.arpLog.info('Connection closed:', ev);
        });
        this.salty.on('no-shared-task', (ev) => {
            this.arpLog.warn('No shared task found:', ev.data);
            const offeredWebrtc = ev.data.offered.filter((t) => t.endsWith('webrtc.tasks.saltyrtc.org')).length > 0;
            this.$rootScope.$apply(() => {
                if (!this.browserService.supportsWebrtcTask() && offeredWebrtc) {
                    this.failSession(false);
                    this.showWebrtcAndroidWarning();
                } else {
                    this.failSession();
                }
            });
        });
    }

    /**
     * Show a WebRTC on Android warning dialog.
     */
    private showWebrtcAndroidWarning(): void {
        this.$translate.onReady().then(() => {
            // tslint:disable:max-line-length
            const confirm = this.$mdDialog.alert()
                .title(this.$translate.instant('welcome.BROWSER_NOT_SUPPORTED_ANDROID'))
                .htmlContent(this.$translate.instant('welcome.BROWSER_NOT_SUPPORTED_ANDROID_DETAILS', {
                    firefoxLink: '<a href="https://www.mozilla.org/firefox/" target="_blank" rel="noopener noreferrer">Firefox</a>',
                    chromeLink: '<a href="https://www.google.com/chrome/browser/desktop/" target="_blank" rel="noopener noreferrer">Chrome</a>',
                    operaLink: '<a href="https://www.opera.com/" target="_blank" rel="noopener noreferrer">Opera</a>',
                    edgeLink: '<a href="https://www.microsoft.com/edge" target="_blank" rel="noopener noreferrer">Edge</a>',
                }))
                .ok(this.$translate.instant('welcome.ABORT'));
            // tslint:enable:max-line-length
            this.$mdDialog.show(confirm).then(() => {
                // Redirect to Threema website
                window.location.replace('https://threema.ch/threema-web');
            });
        });
    }

    /**
     * Show an alert dialog. Can be called directly after calling `.stop(...)`.
     */
    private showAlert(alertMessage: string): void {
        // Note: A former stop() call above may result in a redirect, which will
        //       in turn hide all open dialog boxes. Therefore, to avoid
        //       immediately hiding the alert box, enqueue dialog at end of
        //       event loop.
        this.$timeout(() => {
            this.$mdDialog.show(this.$mdDialog.alert()
                .title(this.$translate.instant('connection.SESSION_CLOSED_TITLE'))
                .textContent(this.$translate.instant(alertMessage))
                .ok(this.$translate.instant('common.OK')));
        }, 0);
    }

    /**
     * Fail the session and let the remote peer know that an error occurred.
     * A dialog will be displayed to let the user know a protocol error
     * happened.
     */
    private failSession(showAlert = true) {
        // Stop session
        const stop = () => {
            this.stop({
                reason: DisconnectReason.SessionError,
                send: true,
                // TODO: Use welcome.error once we have it
                close: 'welcome',
                connectionBuildupState: 'closed',
            });
            if (showAlert) {
                this.showAlert('connection.SESSION_ERROR');
            }
        };

        // Note: Although this is considered an anti-pattern, we simply don't
        //       want a digest cycle in most of the network event functionality.
        //       Thus, it would be pointless 99% of the time to apply a digest
        //       cycle somewhere higher in the call stack.
        if (!this.$rootScope.$$phase) {
            this.$rootScope.$apply(() => stop());
        } else {
            stop();
        }
    }

    /**
     * Fail the session on a rejection of a Promise associated to a message.
     */
    private failSessionOnReject(type: string, subType: string) {
        return ((error) => {
            this.logOnReject(type, subType)(error);
            this.failSession();
        });
    }

    /**
     * Log a rejection of a Promise associated to a message.
     */
    private logOnReject(type: string, subType: string) {
        return ((error) => {
            this.arpLog.error(`Message ${type}/${subType} has been rejected by the remote: ${error}`);
        });
    }

    /**
     * Resume a session via the previous connection's ID and chunk cache.
     *
     * Returns whether the connection has been resumed.
     *
     * Important: Caller must invalidate the cache and connection ID after this
     *            function returned!
     */
    private maybeResumeSession(resumeSession: boolean, remoteInfo: ConnectionInfo): boolean {
        // Validate connection ID
        const remoteCurrentConnectionId = new Uint8Array(remoteInfo.id);
        if (arraysAreEqual(fakeConnectionId, remoteCurrentConnectionId)) {
            this.arpLog.debug('Cannot resume session: Remote did not implement deriving the connection ID');
            // TODO: Remove this once it is implemented properly by the app!
            return false;
        }
        if (!arraysAreEqual(this.currentConnectionId, remoteCurrentConnectionId)) {
            this.arpLog.info(`Cannot resume session: IDs of previous connection do not match (local=`
                + `${u8aToHex(this.currentConnectionId)}, remote=${u8aToHex(remoteCurrentConnectionId)}`);
            throw new Error('Derived connection IDs do not match!');
        }

        // Ensure both local and remote want to resume a session
        if (!resumeSession || remoteInfo.resume === undefined) {
            this.arpLog.info(`No resumption (local requested: ${resumeSession ? 'yes' : 'no'}, ` +
                `remote requested: ${remoteInfo.resume ? 'yes' : 'no'})`);
            // Both sides should detect that -> recoverable
            return false;
        }

        // Ensure we want to resume from the same previous connection
        const remotePreviousConnectionId = new Uint8Array(remoteInfo.resume.id);
        if (!arraysAreEqual(this.previousConnectionId, remotePreviousConnectionId)) {
            // Both sides should detect that -> recoverable
            this.arpLog.info(`Cannot resume session: IDs of previous connection do not match (local=`
                + `${u8aToHex(this.previousConnectionId)}, remote=${u8aToHex(remotePreviousConnectionId)}`);
            return false;
        }

        // Remove chunks that have been received by the remote side
        const size = this.previousChunkCache.byteLength;
        let result;
        this.arpLog.debug(`Pruning cache (local-sn=${this.previousChunkCache.sequenceNumber.get()}, ` +
            `remote-sn=${remoteInfo.resume.sequenceNumber})`);
        try {
            result = this.previousChunkCache.prune(remoteInfo.resume.sequenceNumber);
        } catch (error) {
            // Not recoverable
            throw new Error(`Unable to resume session: ${error}`);
        }
        this.arpLog.debug(`Chunk cache pruned, acknowledged: ${result.acknowledged}, left: ${result.left}, size: ` +
            `${size} -> ${this.previousChunkCache.byteLength}`);
        if (this.userConfig.ARP_LOG_TRACE) {
            this.arpLog.debug(`Chunks that require acknowledgement: ${this.previousChunkCache.chunks.length}`);
        }

        // Transfer the cache (filters chunks which should not be retransmitted)
        const transferred = this.currentChunkCache.transfer(this.previousChunkCache.chunks);
        this.arpLog.debug(`Chunk cache transferred (${transferred} chunks)`);

        // Invalidate the previous connection cache & id
        // Note: This MUST be done immediately after the session has been
        //       resumed to prevent re-establishing a session of a connection
        //       where the handshake has been started but not been completed.
        this.previousConnectionId = null;
        this.previousIncomingChunkSequenceNumber = null;
        this.previousChunkCache = null;

        // Resend chunks
        const chunks = this.currentChunkCache.chunks;
        this.arpLog.debug(`Sending cached chunks: ${chunks.length}`);
        for (const chunk of chunks) {
            this.sendChunk(chunk, true, false, false);
        }

        // Resumed!
        return true;
    }

    /**
     * Discard the session of a previous connection.
     */
    private discardSession(flags: { resetMessageSequenceNumber: boolean }): void {
        // Reset the outgoing message sequence number and the unchunker
        if (flags.resetMessageSequenceNumber) {
            this.outgoingMessageSequenceNumber = new SequenceNumber(
                0, WebClientService.SEQUENCE_NUMBER_MIN, WebClientService.SEQUENCE_NUMBER_MAX);
        }
        this.unchunker = new chunkedDc.UnreliableUnorderedUnchunker();
        this.unchunker.onMessage = this.handleIncomingMessageBytes.bind(this);

        // Discard previous connection instances
        this.previousConnectionId = null;
        this.previousIncomingChunkSequenceNumber = null;
        this.previousChunkCache = null;
    }

    /**
     * Schedule the connection ack to be sent.
     *
     * By default, a connection ack message will be sent after 10 seconds
     * (as defined by the protocol).
     */
    private scheduleConnectionAck(timeout: number = 10000): void {
        // Don't schedule if already running
        if (this.ackTimer === null) {
            this.ackTimer = self.setTimeout(() => {
                this.ackTimer = null;
                this._sendConnectionAck();
            }, timeout);
        }
    }

    /**
     * Schedule a push to be sent if there is no network activity within a
     * specified interval.
     */
    private schedulePush(timeoutMs: number = 3000): void {
        if (this.pushTimer !== null) {
            this.schedulePushAfterCooldown = true;
            return;
        }

        // Send a push after the timeout
        this.pushTimer = self.setTimeout(() => {
            this.pushTimer = null;
            this.schedulePushAfterCooldown = false;
            this.log.debug('Connection appears to be lost, sending push');
            this.sendPush();
        }, timeoutMs);

        // Send a connection ack.
        // Note: This acts as a *ping* but also helps us to keep the caches
        //       clean.
        this._requestConnectionAck();
    }

    /**
     * Cancel a scheduled push.
     */
    private cancelPush(cooldownMs: number = 10000): void {
        if (this.pushTimer !== null) {
            self.clearTimeout(this.pushTimer);
            this.pushTimer = null;
        }
        this.schedulePushAfterCooldown = false;

        // Start the cooldown of the push timeout (if required)
        if (cooldownMs > 0) {
            this.pushTimer = self.setTimeout(() => {
                this.pushTimer = null;
                if (this.schedulePushAfterCooldown) {
                    this.schedulePush();
                }
            }, cooldownMs);
        }
    }

    /**
     * Once the SaltyRTC task has been established...
     *
     * - for Android, initiate the peer connection and start the handover,
     * - for iOS, no further action is necessary and the connection is
     *   considered established.
     */
    private onTaskEstablished(resumeSession: boolean) {
        // Pushing complete
        this.resetPushSession(true);

        // Peer handshake
        this.stateService.updateConnectionBuildupState('peer_handshake');

        // Determine chosen task
        const task = this.salty.getTask();
        if (task.getName().indexOf('webrtc.tasks.saltyrtc.org') !== -1) {
            this.chosenTask = threema.ChosenTask.WebRTC;
        } else if (task.getName().indexOf('relayed-data.tasks.saltyrtc.org') !== -1) {
            this.chosenTask = threema.ChosenTask.RelayedData;
        } else {
            throw new Error('Invalid or unknown task name: ' + task.getName());
        }

        // If the WebRTC task was chosen, initialize handover.
        if (this.chosenTask === threema.ChosenTask.WebRTC) {
            const browser = this.browserService.getBrowser();

            // Determine ICE servers and replace random prefix (if any)
            const prefix = u8aToHex(nacl.randomBytes(1));
            const iceServers = this.userConfig.ICE_SERVERS.map((server) => {
                server = copyShallow(server) as RTCIceServer;
                const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
                server.urls = urls.map((url) => url.replace('{prefix}', prefix));
                return server;
            });

            // Create peer connection
            this.pcHelper = new PeerConnectionHelper(
                this.$q, this.$rootScope,
                this.userConfig, this.logService, this.timeoutService,
                task as saltyrtc.tasks.webrtc.WebRTCTask, iceServers);

            // On state changes in the PeerConnectionHelper class, let state service know about it
            this.pcHelper.onConnectionStateChange = (state: threema.TaskConnectionState) => {
                this.stateService.updateTaskConnectionState(state);
            };

            // Initiate handover process
            this.pcHelper.handover();

        // Otherwise, no handover is necessary.
        } else {
            this.onHandover(resumeSession);
        }
    }

    /**
     * For the WebRTC task, this is called when the DataChannel is open.
     * For the relayed data task, this is called once the connection is established.
     */
    private async onConnectionEstablished(resumeSession: boolean) {
        // Send connection info
        if (resumeSession) {
            const incomingSequenceNumber = this.previousIncomingChunkSequenceNumber.get();
            this.arpLog.debug(`Sending connection info (resume=yes, sn-in=${incomingSequenceNumber})`);
            this._sendConnectionInfo(
                this.currentConnectionId.buffer,
                this.previousConnectionId.buffer,
                incomingSequenceNumber,
            );
        } else {
            this.arpLog.debug('Sending connection info (resume=no)');
            this._sendConnectionInfo(this.currentConnectionId.buffer);
        }

        // Receive connection info
        // Note: We can receive the connectionInfo message here or
        //       an error which should fail the session.
        let remoteInfo: ConnectionInfo;
        try {
            remoteInfo = await this.connectionInfoFuture;
        } catch (error) {
            this.arpLog.error(error);
            this.failSession();
            return;
        }
        let outgoingSequenceNumber: string | number = 'n/a';
        let remoteResume = 'no';
        if (remoteInfo.resume !== undefined) {
            outgoingSequenceNumber = remoteInfo.resume.sequenceNumber;
            remoteResume = 'yes';
        }
        this.arpLog.debug(`Received connection info (resume=${remoteResume}, ` +
            `sn-out=${outgoingSequenceNumber})`);

        // Resume the session (if both requested to resume the same connection)
        let sessionWasResumed;
        try {
            sessionWasResumed = this.maybeResumeSession(resumeSession, remoteInfo);
        } catch (error) {
            this.arpLog.error(error);
            this.failSession();
            return;
        }

        // Handshake complete!
        this.handshakeCompleted = true;

        // If we could not resume for whatever reason
        const requiredInitializationSteps = [];
        if (!resumeSession || !sessionWasResumed) {
            // Note: We cannot reset the message sequence number here any more since
            //       it has already been used for the connectionInfo message.
            this.discardSession({ resetMessageSequenceNumber: false });
            this.arpLog.debug('Session discarded');

            // Reset fields, blob cache, pending requests and pending timeouts in case the session
            // cannot be resumed
            this.clearCache();
            this.wireMessageFutures.clear();
            this.timeoutService.cancelAll();

            // Set required initialisation steps
            requiredInitializationSteps.push(
                InitializationStep.ClientInfo,
                InitializationStep.Conversations,
                InitializationStep.Receivers,
                InitializationStep.Profile,
            );

            // Request initial data
            this._requestInitialData();
        } else {
            this.arpLog.debug('Session resumed');
        }

        // Schedule required initialisation steps if we have finished the
        // previous connection
        if (this.startupPromise !== null) {
            this.runAfterInitializationSteps(requiredInitializationSteps, () => {
                this.stateService.updateConnectionBuildupState('done');
                this.startupPromise.resolve();
                this.startupPromise = null;
                this.startupDone = true;
                this._resetInitializationSteps();

                // Hack for #712
                // TODO: Remove once we have the ack protocol for Android, too
                if (this.chosenTask !== threema.ChosenTask.RelayedData && this.$state.includes('messenger')) {
                    this.$state.reload().catch((error) => {
                        this.log.error('Unable to reload state:', error);
                    });
                }
            });
        }

        // In case...
        //   - we wanted to resume, but
        //   - we could not resume, and
        //   - we had a previous connection
        if (resumeSession && !sessionWasResumed && this.clientInfo !== null) {
            this.$rootScope.$apply(() => {
                // TODO: Remove this conditional once we have session
                //       resumption for Android!
                if (this.chosenTask !== threema.ChosenTask.RelayedData) {
                    return;
                }

                // Redirect to the conversation overview
                if (this.$state.includes('messenger')) {
                    this.$state.go('messenger.home');
                }
            });
        }

        // Fetch current version
        // Delay it to prevent the dialog from being closed by the messenger constructor,
        // which closes all open dialogs.
        this.timeoutService.register(() => this.versionService.checkForUpdate(), 7000, true, 'checkForUpdate');

        // Notify state service about data loading
        this.stateService.updateConnectionBuildupState('loading');
    }

    /**
     * Handover done.
     *
     * This can either be a real handover to WebRTC (Android), or simply
     * when the relayed data task takes over (iOS).
     */
    private onHandover(resumeSession: boolean) {
        // Initialize NotificationService
        this.log.debug('Initializing NotificationService...');
        this.notificationService.init();

        // Derive connection ID
        // Note: We need to make sure this is done before any ARP messages can be received
        const connectionIdBox = this.salty.encryptForPeer(new Uint8Array(0), WebClientService.CONNECTION_ID_NONCE);
        // Note: We explicitly copy the data here to be able to use the underlying buffer directly
        this.currentConnectionId = new Uint8Array(connectionIdBox.data);

        // If the WebRTC task was chosen, initialize the data channel
        if (this.chosenTask === threema.ChosenTask.WebRTC) {
            const task = this.salty.getTask() as saltyrtc.tasks.webrtc.WebRTCTask;

            // Create data channel
            this.arpLog.debug(`Creating data channel ${WebClientService.DC_LABEL}`);
            const pc = this.pcHelper.pc;
            const dc = pc.createDataChannel(WebClientService.DC_LABEL);
            dc.binaryType = 'arraybuffer';

            // Wrap as unbounded, flow-controlled data channel
            this.secureDataChannel = new UnboundedFlowControlledDataChannel(
                dc, this.logService, this.userConfig.TRANSPORT_LOG_LEVEL);

            // Create crypto context
            // Note: We need to apply encrypt-then-chunk for backwards
            //       compatibility reasons.
            this.secureDataChannelCrypto = task.createCryptoContext(dc.id);

            // Create unchunker
            // Note: We need to use an unreliable unordered unchunker for backwards
            //       compatibility reasons.
            const unchunker = new chunkedDc.UnreliableUnorderedUnchunker();

            // Bind events
            dc.onopen = () => {
                this.arpLog.info(`Data channel ${dc.label} open`);

                // Determine chunk length
                this.secureDataChannelChunkLength = Math.min(
                    WebClientService.DATA_CHANNEL_MAX_CHUNK_SIZE, pc.sctp.maxMessageSize);
                this.arpLog.debug(`Using chunk length: ${this.secureDataChannelChunkLength} for data channel ${dc.label}`);

                // Connection established
                this.onConnectionEstablished(resumeSession).catch((error) => {
                    this.arpLog.error('Error during handshake:', error);
                });
            };
            dc.onclose = () => {
                this.arpLog.warn(`Data channel ${dc.label} closed (ICE state: ${pc.iceConnectionState})`);
            };
            dc.onerror = (event: ErrorEvent) => {
                this.arpLog.warn(`Data channel ${dc.label} error (closed=${dc.onclose === null}):`, event.error);
            };
            dc.onmessage = (event) => {
                this.arpLogV.debug(`Data channel ${dc.label} incoming chunk of length ${event.data.byteLength}`);
                unchunker.add(new Uint8Array(event.data));
            };
            // noinspection JSUndefinedPropertyAssignment
            unchunker.onMessage = (array) => {
                const box = saltyrtcClient.Box.fromUint8Array(
                    array, saltyrtcTaskWebrtc.DataChannelCryptoContext.NONCE_LENGTH);
                const message = this.secureDataChannelCrypto.decrypt(box);
                this.handleIncomingMessageBytes(message);
            };

            // Mark as handed over
            // Note: Even though this method is also "misused" for the relayed
            //       data task, only WebRTC really hands over.
            this.handoverDone = true;
        } else if (this.chosenTask === threema.ChosenTask.RelayedData) {
            // Handle messages directly
            this.relayedDataTask.on('data', (ev: saltyrtc.SaltyRTCEvent) => {
                this.receiveChunk(new Uint8Array(ev.data));
            });

            // The communication channel is now open! Fetch initial data
            this.onConnectionEstablished(resumeSession).catch((error) => {
                this.arpLog.error('Error during handshake:', error);
            });
        }
    }

    /**
     * A previously authenticated peer disconnected from the server.
     */
    private onPeerDisconnected(peerId: number) {
        switch (this.chosenTask) {
            case threema.ChosenTask.RelayedData:
                // TODO: Fix "Ignoring peer-disconnected event (state is new)"
                if (this.stateService.taskConnectionState === threema.TaskConnectionState.Connected) {
                    this.stateService.updateTaskConnectionState(threema.TaskConnectionState.Reconnecting);
                } else {
                    this.arpLog.debug(
                        'Ignoring peer-disconnected event (state is '
                        + this.stateService.taskConnectionState + ')',
                    );
                }
                break;
            default:
                this.arpLog.debug(
                    'Ignoring peer-disconnected event (chosen task is ' + this.chosenTask + ')',
                );
        }
    }

    /**
     * Send a push message to wake up the peer.
     *
     * Returns the maximum expected period until the promise will be resolved,
     * and the promise itself.
     */
    public sendPush(): [number, Promise<void>] {
        // Create new session
        if (this.pushSession === null) {
            this.pushSession = this.pushService.createSession(this.salty.permanentKeyBytes, this.pushSessionConfig);

            // Start and handle success/error
            this.pushPromise = this.pushSession.start()
                .then(() => this.resetPushSession(true))
                .catch((error) => {
                    // Reset push session
                    this.resetPushSession(false);

                    // Handle errors
                    if (error instanceof TimeoutError) {
                        this.showDeviceUnreachableDialog();
                    } else if (error instanceof PushError && error.statusCode === 400) {
                        // Can happen if the push token is invalid
                        this.showPushRejectedDialog();
                    } else {
                        this.failSession();
                    }
                });

            // Update state
            if (!this.$rootScope.$$phase) {
                this.$rootScope.$apply(() => this.stateService.updateConnectionBuildupState('push'));
            } else {
                this.stateService.updateConnectionBuildupState('push');
            }
        }

        // Retrieve the expected maximum period
        return [this.pushSessionExpectedPeriodMaxMs, this.pushPromise];
    }

    /**
     * Reset push session (if any) and hide the *device unreachable* dialog
     * (if any and if requested).
     */
    private resetPushSession(hideDeviceUnreachableDialog: boolean = true): void {
        // Hide unreachable dialog (if any)
        if (hideDeviceUnreachableDialog && this.deviceUnreachableDialog !== null) {
            this.$mdDialog.hide();
        }

        // Reset push session (if any)
        if (this.pushSession !== null) {
            this.pushSession.done();
            this.pushSession = null;
            this.pushPromise = null;
        }
    }

    /**
     * Show the *device unreachable* dialog.
     */
    public showDeviceUnreachableDialog(): void {
        // Show device unreachable dialog (if we were already
        // connected and if not already visible).
        if (
            this.pushService.isAvailable()
            && this.$state.includes('messenger')
            && this.deviceUnreachableDialog === null
        ) {
            this.deviceUnreachableDialog = this.$mdDialog.show({
                controller: DeviceUnreachableController,
                controllerAs: 'ctrl',
                templateUrl: 'partials/dialog.device-unreachable.html',
                parent: angular.element(document.body),
                escapeToClose: false,
                onRemoving: () => { this.deviceUnreachableDialog = null; },
            });
        }
    }

    public showPushRejectedDialog(): void {
        this.$mdDialog.show({
            controller: PushRejectedDialogController,
            controllerAs: 'ctrl',
            templateUrl: 'partials/dialog.push-rejected.html',
            parent: angular.element(document.body),
            escapeToClose: false,
        });
    }

    /**
     * Start the webclient service.
     * Return a promise that resolves once connected.
     */
    public start(skipPush: boolean = false): ng.IPromise<any> {
        this.log.debug('Starting WebClientService...');

        // Promise to track startup state
        if (this.startupPromise !== null) {
            this.log.debug('Reusing startup promise (was not resolved)');
        } else {
            this.log.debug('Creating new startup promise');
            this.startupPromise = this.$q.defer();
        }
        this.startupDone = false;
        this.handoverDone = false;

        // Connect
        this.salty.connect();

        // If push service is available, notify app
        if (this.pushService.isAvailable()) {
            if (skipPush === true) {
                this.log.debug('start(): Skipping push notification');
            } else {
                this.sendPush();
            }
        } else if (this.trustedKeyStore.hasTrustedKey()) {
            this.log.debug('Push service not available');
            this.stateService.updateConnectionBuildupState('manual_start');
        }

        return this.startupPromise.promise;
    }

    /**
     * Stop the webclient service.
     *
     * This is a forced stop, meaning that all connections are being closed.
     *
     * @reason The disconnect reason.
     * @send will send a disconnect message to the remote peer containing the
     *   disconnect reason if set to `true`.
     * @close will close the session (meaning all cached data will be
     *   invalidated) if set to `true`. Note that the session will always be
     *   closed in case `reason` indicates that the session is to be deleted,
     *   has been replaced, a protocol error occurred or in case `redirect` has
     *   been set to `true`.
     * @redirect will redirect to the welcome page if set to `true`.
     * @connectionBuildupState: The connection buildup state the state service
     *   will be reset to.
     */
    public stop(args: threema.WebClientServiceStopArguments): void {
        if (args.close === true) {
            throw new Error('args.close has been set to "true" but requires a redirect state instead');
        }
        this.log.info(`Stopping (reason=${args.reason}, send=${args.send}, close=${args.close}, ` +
            'connectionBuildupState=' +
            `${args.connectionBuildupState !== undefined ? args.connectionBuildupState : 'n/a'})`);
        let close = args.close !== false;
        let remove = false;

        // Stop push session
        this.resetPushSession(true);

        // Session deleted: Force close and delete
        if (args.reason === DisconnectReason.SessionDeleted) {
            close = true;
            remove = true;
        }

        // Session replaced or error'ed: Force close
        if (args.reason === DisconnectReason.SessionReplaced || args.reason === DisconnectReason.OutOfMemory ||
            args.reason === DisconnectReason.SessionError) {
            close = true;
        }

        // Send disconnect reason to the remote peer if requested
        if (args.send && this.stateService.state === threema.GlobalConnectionState.Ok) {
            // noinspection JSIgnoredPromiseFromCall
            this.sendUpdateWireMessage(WebClientService.SUB_TYPE_CONNECTION_DISCONNECT, false, undefined,
                {reason: args.reason});
        }

        // Stop timer
        if (this.ackTimer !== null) {
            self.clearTimeout(this.ackTimer);
            this.ackTimer = null;
        }
        if (this.pushTimer !== null) {
            this.cancelPush(0);
        }
        this.log.debug('Timer stopped');

        // Reset states
        // iOS devices are regularly disconnected, but this is normal behavior.
        // We therefore only reset the unread count if we are not using relayedData or are
        // closing the connection.
        const shouldResetUnreadCount = this.chosenTask !== threema.ChosenTask.RelayedData || close
        this.stateService.reset(args.connectionBuildupState, shouldResetUnreadCount);

        // Clear stored data (trusted key, push token, etc) if deleting the session
        if (remove) {
            this.trustedKeyStore.clearTrustedKey();
        }

        // Invalidate and clear caches
        if (close) {
            // Clear connection ids & caches
            this.previousConnectionId = null;
            this.previousIncomingChunkSequenceNumber = null;
            this.previousChunkCache = null;

            // Remove chosen task
            // Note: This implicitly prevents automatic connection attempts
            //       from the status controller.
            this.chosenTask = threema.ChosenTask.None;

            // Reset general client information
            this.clientInfo = null;

            // Clear fetched messages and the blob cache
            this.clearCache();

            // Remove all pending promises
            this.wireMessageFutures.clear();

            // Cancel pending timeouts
            this.timeoutService.cancelAll();

            // Reset the push service
            this.pushService.reset();

            // Closed!
            this.arpLog.debug('Session closed (cannot be resumed)');
        } else {
            // Only reuse a previous chunk cache if the handshake had been
            // completed
            if (this.handshakeCompleted) {
                // Move instances that we need to re-establish a previous session
                this.previousConnectionId = this.currentConnectionId;
                this.previousIncomingChunkSequenceNumber = this.currentIncomingChunkSequenceNumber;
                this.previousChunkCache = this.currentChunkCache;
            }
            this.arpLog.debug('Session remains open');
        }

        // Close data channel
        if (this.secureDataChannel !== null) {
            this.arpLog.debug('Closing data channel');
            this.secureDataChannel.dc.onopen = null;
            this.secureDataChannel.dc.onmessage = null;
            this.secureDataChannel.dc.onbufferedamountlow = null;
            this.secureDataChannel.dc.onerror = null;
            this.secureDataChannel.dc.onclose = null;
            this.secureDataChannel.dc.close();
        }

        // Close SaltyRTC connection
        if (this.relayedDataTask !== null) {
            this.relayedDataTask.off();
        }
        if (this.salty !== null) {
            this.arpLog.debug('Closing signaling');
            this.salty.off();
            this.salty.disconnect(true);
        }

        // Close peer connection
        if (this.pcHelper !== null) {
            this.pcHelper.onConnectionStateChange = null;
            this.pcHelper.close();
            this.arpLog.debug('Peer connection closed');
        } else {
            this.arpLog.debug('Peer connection was null');
        }

        // Done, redirect now if session closed
        if (close) {
            // Reject startup promise (if any)
            if (this.startupPromise !== null) {
                this.startupPromise.reject();
                this.startupPromise = null;
                this._resetInitializationSteps();
            }

            // Translate close flag
            const state = args.close !== false ? args.close : 'welcome';
            this.$state.go(state);
        }
    }

    /**
     * Mark a component as initialized
     */
    public registerInitializationStep(name: threema.InitializationStep) {
        if (this.initialized.has(name) ) {
            this.arpLog.warn('Initialization step "' + name + '" already registered');
            return;
        }

        this.arpLog.debug('Initialization step "' + name + '" done');
        this.initialized.add(name);

        // Check pending routines
        for (const routine of this.pendingInitializationStepRoutines) {
            const ready = routine.requiredSteps.every((requiredStep) => {
                return this.initialized.has(requiredStep);
            });

            if (ready) {
                this.arpLog.debug('Running routine after initialization "' + name + '" completed');

                // Important: Remove the routine BEFORE calling it to prevent
                //            it from being called more than once (due to nested
                //            calls to .registerInitializationStep).
                this.pendingInitializationStepRoutines.delete(routine);
                routine.callback.apply(this);
            }
        }
    }

    public setReceiverListener(listener: threema.ReceiverListener): void {
        this.receiverListener.push(listener);
    }

    /**
     * Send a connection info update.
     */
    private _sendConnectionInfo(connectionId: ArrayBuffer, resumeId?: ArrayBuffer, sequenceNumber?: number): void {
        const data = {id: connectionId};
        if (resumeId !== undefined && sequenceNumber !== undefined) {
            (data as any).resume = {
                id: resumeId,
                sequenceNumber: sequenceNumber,
            };
        }
        // noinspection JSIgnoredPromiseFromCall
        this.sendUpdateWireMessage(WebClientService.SUB_TYPE_CONNECTION_INFO, false, undefined, data);
    }

    /**
     * Request a connection ack update.
     */
    private _requestConnectionAck(): void {
        // noinspection JSIgnoredPromiseFromCall
        this.sendRequestWireMessage(WebClientService.SUB_TYPE_CONNECTION_ACK, false);
    }

    /**
     * Send a connection ack update.
     */
    private _sendConnectionAck(): void {
        // Send the current incoming sequence number for chunks
        // noinspection JSIgnoredPromiseFromCall
        this.sendUpdateWireMessage(WebClientService.SUB_TYPE_CONNECTION_ACK, false, undefined, {
            sequenceNumber: this.currentIncomingChunkSequenceNumber.get(),
        });

        // Clear pending ack timer (if any)
        if (this.ackTimer !== null) {
            self.clearTimeout(this.ackTimer);
            this.ackTimer = null;
        }
    }

    /**
     * Send a client info request.
     */
    public requestClientInfo(): void {
        this.arpLog.debug('Sending client info request');
        const browser = this.browserService.getBrowser();
        const data: object = {
            [WebClientService.ARGUMENT_USER_AGENT]: navigator.userAgent,
        };
        if (hasValue(browser.name)) {
            data[WebClientService.ARGUMENT_BROWSER_NAME] = browser.name;
        }
        if (hasValue(browser.version)) {
            data[WebClientService.ARGUMENT_BROWSER_VERSION] = browser.version;
        }
        const subType = WebClientService.SUB_TYPE_CLIENT_INFO;
        this.sendRequestWireMessage(subType, !this.requiresTemporaryIdBackwardsCompatibility, undefined, data)
            .catch(this.failSessionOnReject(WebClientService.TYPE_REQUEST, subType)); // critical request
    }

    /**
     * Send a receivers request.
     */
    public requestReceivers(): void {
        this.arpLog.debug('Sending receivers request');
        const subType = WebClientService.SUB_TYPE_RECEIVERS;
        this.sendRequestWireMessage(subType, !this.requiresTemporaryIdBackwardsCompatibility)
            .catch(this.failSessionOnReject(WebClientService.TYPE_REQUEST, subType)); // critical request
    }

    /**
     * Send a conversation request.
     */
    public requestConversations(): void {
        this.arpLog.debug('Sending conversation request');
        const subType = WebClientService.SUB_TYPE_CONVERSATIONS;
        const args = {[WebClientService.ARGUMENT_MAX_SIZE]: WebClientService.AVATAR_LOW_MAX_SIZE};
        this.sendRequestWireMessage(subType, !this.requiresTemporaryIdBackwardsCompatibility, args)
            .catch(this.failSessionOnReject(WebClientService.TYPE_REQUEST, subType)); // critical request
    }

    /**
     * Send a battery status request.
     */
    public requestBatteryStatus(): void {
        this.arpLog.debug('Sending battery status request');
        const subType = WebClientService.SUB_TYPE_BATTERY_STATUS;
        this.sendRequestWireMessage(subType, !this.requiresTemporaryIdBackwardsCompatibility)
            .catch(this.failSessionOnReject(WebClientService.TYPE_REQUEST, subType)); // critical request
    }

    /**
     * Send a profile request.
     */
    public requestProfile(): void {
        this.arpLog.debug('Sending profile request');
        const subType = WebClientService.SUB_TYPE_PROFILE;
        this.sendRequestWireMessage(subType, !this.requiresTemporaryIdBackwardsCompatibility)
            .catch(this.failSessionOnReject(WebClientService.TYPE_REQUEST, subType)); // critical request
    }

    /**
     * Send a message request for the specified receiver.
     *
     * This method will only be called when initializing a conversation in the
     * webclient. It is used to download all existing messages.
     *
     * New messages are not requested this way, instead they are sent as a
     * message update.
     */
    public requestMessages(receiver: threema.Receiver): string | null {
        this.arpLog.debug('requestMessages');

        // If there are no more messages available, stop here.
        if (!this.messages.hasMore(receiver)) {
            this.messages.notify(receiver, this.$rootScope);
            this.arpLog.debug('requestMessages: No more messages available');
            return null;
        }

        this.loadingMessages.set(receiver.type + receiver.id, true);

        // Check if messages have already been requested
        if (this.messages.isRequested(receiver)) {
            this.arpLog.debug('requestMessages: Already requested');
            return null;
        }

        // Get the reference msg id
        const refMsgId = this.messages.getReferenceMsgId(receiver);

        // Set requested
        this.messages.setRequested(receiver);

        // Create arguments
        const args = {
            [WebClientService.ARGUMENT_RECEIVER_TYPE]: receiver.type,
            [WebClientService.ARGUMENT_RECEIVER_ID]: receiver.id,
        } as any;

        // If a reference msg id has been set, send it along
        const msgId = this.messages.getReferenceMsgId(receiver);
        if (msgId !== null) {
            args[WebClientService.ARGUMENT_REFERENCE_MSG_ID] = msgId;
        }

        // Send request
        this.arpLog.debug('Sending message request for', receiver.type, receiver.id,
            'with message id', msgId);
        const subType = WebClientService.SUB_TYPE_MESSAGES;
        // TODO: Return the promise instead to unset the 'requested' flag?
        this.sendRequestWireMessage(subType, !this.requiresTemporaryIdBackwardsCompatibility, args)
            .catch(this.logOnReject(WebClientService.TYPE_REQUEST, subType));

        return refMsgId;
    }

    /**
     * Send an avatar request for the specified receiver.
     */
    public requestAvatar(receiver: threema.Receiver, highResolution: boolean): Promise<ArrayBuffer> {
        // Check if the receiver has an avatar or the avatar already exists
        const resolution = highResolution ? 'high' : 'low';
        const receiverInfo = this.receivers.getData(receiver);
        if (receiverInfo && receiverInfo.avatar && receiverInfo.avatar[resolution]) {
            // Avatar already exists
            // TODO: Do we get avatar changes via update?
            return Promise.resolve(receiverInfo.avatar[resolution]);
        }

        // If we're requesting our own avatar, change type from "me" to "contact"
        let receiverType = receiver.type;
        if (receiverType === 'me') {
            receiverType = 'contact';
        }
        // Create arguments and send request
        const args = {
            [WebClientService.ARGUMENT_RECEIVER_TYPE]: receiverType,
            [WebClientService.ARGUMENT_RECEIVER_ID]: receiver.id,
            [WebClientService.ARGUMENT_AVATAR_HIGH_RESOLUTION]: highResolution,
        } as any;

        if (!highResolution) {
           args[WebClientService.ARGUMENT_MAX_SIZE] = WebClientService.AVATAR_LOW_MAX_SIZE;
        }

        this.arpLog.debug('Sending', resolution, 'res avatar request for', receiver.type, receiver.id);
        const subType = WebClientService.SUB_TYPE_AVATAR;
        return this.sendRequestWireMessage(subType, true, args);
    }

    /**
     * Send a thumbnail request for the specified receiver.
     */
    public requestThumbnail(receiver: threema.Receiver, message: threema.Message): Promise<any> {
        // Check if the receiver has an avatar or the avatar already exists
        if (message.thumbnail !== undefined && message.thumbnail.img !== undefined) {
            return new Promise<any>((e) => {
                e(message.thumbnail.img);
            });
        }

        // Create arguments and send request
        const args = {
            [WebClientService.ARGUMENT_MESSAGE_ID]: message.id.toString(),
            [WebClientService.ARGUMENT_RECEIVER_TYPE]: receiver.type,
            [WebClientService.ARGUMENT_RECEIVER_ID]: receiver.id,
        };

        this.arpLog.debug('Sending thumbnail request for', receiver.type, message.id);
        const subType = WebClientService.SUB_TYPE_THUMBNAIL;
        return this.sendRequestWireMessage(subType, true, args);
    }

    /**
     * Request a blob.
     */
    public requestBlob(msgId: string, receiver: threema.Receiver): Promise<threema.BlobInfo> {
        const cached = this.blobCache.get(msgId + receiver.type);
        if (cached !== undefined) {
            this.arpLog.debug('Use cached blob');
            return new Promise((resolve) => {
                resolve(cached);
            });
        }
        const args = {
            [WebClientService.ARGUMENT_RECEIVER_TYPE]: receiver.type,
            [WebClientService.ARGUMENT_RECEIVER_ID]: receiver.id,
            [WebClientService.ARGUMENT_MESSAGE_ID]: msgId,
        };
        this.arpLog.debug('Sending blob request for message', msgId);
        return this.sendRequestWireMessage(WebClientService.SUB_TYPE_BLOB, true, args);
    }

    /**
     * Mark a message as read.
     */
    public requestRead(receiver, newestMessage: threema.Message): void {
        if (newestMessage.id === undefined) {
            // Message that hasn't been sent yet
            this.arpLog.warn('Called requestRead on a message without id');
            return;
        }
        if (newestMessage.type === 'status') {
            this.arpLog.warn('Called requestRead on a status message');
            return;
        }

        // Create arguments and send request
        const args = {
            [WebClientService.ARGUMENT_RECEIVER_TYPE]: receiver.type,
            [WebClientService.ARGUMENT_RECEIVER_ID]: receiver.id,
            [WebClientService.ARGUMENT_MESSAGE_ID]: newestMessage.id.toString(),
        };
        this.arpLog.debug('Sending read request for', receiver.type, receiver.id, '(msg ' + newestMessage.id + ')');
        const subType = WebClientService.SUB_TYPE_READ;
        this.sendRequestWireMessage(subType, !this.requiresTemporaryIdBackwardsCompatibility, args)
            .catch(this.logOnReject(WebClientService.TYPE_REQUEST, subType));
    }

    public requestContactDetail(contactReceiver: threema.ContactReceiver): Promise<any> {
        const args = {
            [WebClientService.ARGUMENT_IDENTITY]: contactReceiver.id,
        };
        return this.sendRequestWireMessage(WebClientService.SUB_TYPE_CONTACT_DETAIL, true, args);
    }

    /**
     * Send a message to the specified receiver.
     */
    public async sendMessage(
        baseReceiver: threema.BaseReceiver,
        sendType: threema.MessageContentType,
        data: threema.MessageData,
        options: {
            previewDataUrl?: string,
            waitUntilAcknowledged?: boolean,
        } = {},
    ): Promise<any> {
        // This is the expected message type that will be reflected
        // back once the message has been created successfully.
        let reflectedType: threema.MessageType;

        // Try to load receiver
        const receiver = this.receivers.getData(baseReceiver);

        if (isContactReceiver(receiver)) {
            // Check blocked flag
            if (receiver.isBlocked) {
                throw this.$translate.instant('error.CONTACT_BLOCKED');
            }

            // Check identity state
            if (receiver.state === 'INVALID') {
                throw this.$translate.instant('error.CONTACT_INVALID');
            }
        }

        // Decide on subtype
        let subType;
        switch (sendType) {
            case 'text':
                reflectedType = 'text';
                subType = WebClientService.SUB_TYPE_TEXT_MESSAGE;

                const textData = data as threema.TextMessageData;
                const msgLength = textData.text.length;

                // Ignore empty text messages
                if (msgLength === 0) {
                    this.log.warn('Ignored empty text message');
                    throw this.$translate.instant('error.ERROR_OCCURRED');
                }

                // Note: Not validating message length again here in the general case,
                // since that would require us to re-encode the text a second time
                // (because the compose area already checks the length). However, if a
                // quote is present, then the message may still be too long. In that case,
                // shorten the quote.
                if (data.quote !== undefined && data.quote !== null) {
                    // Do a rough estimation of the quote v1 overhead.
                    const quoteOverhead = 12 /* first line prefix */
                                        + (data.quote.text.match(/\n/g) || []).length * 2 /* prefix */
                                        + 16 /* safety margin */;

                    // Get combined text + quote length
                    const textByteLength = (new TextEncoder().encode(textData.text)).length;
                    const quoteByteLength = (new TextEncoder().encode(data.quote.text)).length;
                    const totalByteLength = textByteLength + quoteByteLength + quoteOverhead;

                    // If too long, shorten the quote.
                    const maxLength = this.getMaxTextLength();
                    if (totalByteLength > maxLength) {
                        const newLength = Math.max(3, maxLength - textByteLength - quoteOverhead - 3 /* byte length of ellipsis */);
                        const chunks = this.stringService.byteChunk(data.quote.text, newLength)
                        this.log.warn(`Quote too long, reducing length from ${quoteByteLength} to ≤${newLength} bytes`);
                        data.quote.text = chunks[0] + '…';
                    }
                }

                break;
            case 'file':
                subType = WebClientService.SUB_TYPE_FILE_MESSAGE;

                const fileData = data as threema.FileMessageData;

                // Validate max file size
                if (this.chosenTask === threema.ChosenTask.WebRTC) {
                    const task = this.salty.getTask() as saltyrtc.tasks.webrtc.WebRTCTask;
                    if (task.version === 'v0' && fileData.size > WebClientService.MAX_FILE_SIZE_WEBRTC_TASK_V0) {
                        throw this.$translate.instant('error.FILE_TOO_LARGE_WEB');
                    }
                }
                if (fileData.size > this.clientInfo.capabilities.maxFileSize) {
                    throw this.$translate.instant('error.FILE_TOO_LARGE', {
                        maxmb: Math.floor(this.clientInfo.capabilities.maxFileSize / 1024 / 1024),
                    });
                }

                // Determine reflected type
                reflectedType = 'file';
                if (fileData.sendAsFile !== true) {
                    // File will be dispatched to the app as a file but the actual type sent
                    // to the recipient depends on the MIME type.
                    const mimeType = fileData.fileType;
                    if (this.mimeService.isAudio(mimeType, this.clientInfo.os)) {
                        reflectedType = 'audio';
                    } else if (this.mimeService.isImage(mimeType)) {
                        reflectedType = 'image';
                    } else if (this.mimeService.isVideo(mimeType)) {
                        reflectedType = 'video';
                    }
                }

                break;
            default:
                this.log.error('Invalid message type:', sendType);
                throw this.$translate.instant('error.ERROR_OCCURRED');
        }

        // Request the conversation to be loaded
        // Note: This is required since we need to retrieve updates of the
        //       message we're going to send.
        if (this.messages.getList(receiver).length === 0) {
            await this.requestMessages(receiver);
        }

        // Create temporary message to be displayed until acknowledged by the
        // mobile device
        const id = this.createRandomWireMessageId();
        let temporaryMessage: threema.Message;
        try {
            temporaryMessage = this.messageService.createTemporary(
                id, receiver, reflectedType, data, options.previewDataUrl);
        } catch (error) {
            this.log.error(error);
            throw this.$translate.instant('error.ERROR_OCCURRED');
        }
        this.messages.addNewer(receiver, [temporaryMessage]);

        const args = {
            [WebClientService.ARGUMENT_RECEIVER_TYPE]: receiver.type,
            [WebClientService.ARGUMENT_RECEIVER_ID]: receiver.id,
        };

        // Send message
        const sendPromise = this.sendCreateWireMessage(subType, true, args, data, id);
        sendPromise.catch((error) => {
            this.arpLog.error('Error sending message:', error);

            // Remove temporary message
            this.messages.removeTemporary(receiver, temporaryMessage.temporaryId);

            // Determine error message
            let errorMessage;
            switch (error) {
                case 'fileTooLarge':
                    errorMessage = this.$translate.instant('error.FILE_TOO_LARGE_GENERIC');
                    break;
                case 'valueTooLong':
                    errorMessage = this.$translate.instant('validationError.modifyReceiver.valueTooLong');
                    break;
                case 'blocked':
                    errorMessage = this.$translate.instant('error.CONTACT_BLOCKED');
                    break;
                default:
                    errorMessage = this.$translate.instant('error.ERROR_OCCURRED');
            }

            // Show alert
            this.alerts.push({
                source: 'sendMessage',
                type: 'alert',
                message: errorMessage,
            } as threema.Alert);
        });

        // Wait until the wire message has been acknowledged (if requested)
        if (options.waitUntilAcknowledged) {
            await sendPromise;
        }
    }

    /**
     * Send a message a ack/decline message
     */
    public ackMessage(receiver, message: threema.Message, acknowledged: boolean = true): void {
        // Ignore empty text messages
        // TODO check into a util class
        if (message === null
            || message === undefined
            || message.isOutbox) {
            return;
        }

        const args = {
            [WebClientService.ARGUMENT_RECEIVER_TYPE]: receiver.type,
            [WebClientService.ARGUMENT_RECEIVER_ID]: receiver.id,
            [WebClientService.ARGUMENT_MESSAGE_ID]: message.id.toString(),
            [WebClientService.ARGUMENT_MESSAGE_ACKNOWLEDGED]: acknowledged,
        };
        const subType = WebClientService.SUB_TYPE_ACK;
        this.sendRequestWireMessage(subType, !this.requiresTemporaryIdBackwardsCompatibility, args)
            .catch(this.logOnReject(WebClientService.TYPE_REQUEST, subType));
    }

    /**
     * Delete a message.
     */
    public deleteMessage(receiver, message: threema.Message): void {
        // Ignore empty text messages
        if (message === null || message === undefined) {
            return;
        }

        const args = {
            [WebClientService.ARGUMENT_RECEIVER_TYPE]: receiver.type,
            [WebClientService.ARGUMENT_RECEIVER_ID]: receiver.id,
            [WebClientService.ARGUMENT_MESSAGE_ID]: message.id.toString(),
        };
        const subType = WebClientService.SUB_TYPE_MESSAGE;
        // TODO: ARP defines error codes but they aren't handled by the caller
        this.sendDeleteWireMessage(subType, true, args)
            .catch(this.logOnReject(WebClientService.TYPE_DELETE, subType));
    }

    public sendMeIsTyping(receiver: threema.ContactReceiver, isTyping: boolean): void {
        const args = {[WebClientService.ARGUMENT_RECEIVER_ID]: receiver.id};
        const data = {[WebClientService.ARGUMENT_IS_TYPING]: isTyping};
        // noinspection JSIgnoredPromiseFromCall
        this.sendUpdateWireMessage(WebClientService.SUB_TYPE_TYPING, false, args, data);
    }

    public sendKeyPersisted(): void {
        const subType = WebClientService.SUB_TYPE_KEY_PERSISTED;
        this.sendRequestWireMessage(subType, !this.requiresTemporaryIdBackwardsCompatibility)
            .catch(this.logOnReject(WebClientService.TYPE_REQUEST, subType));
    }

    /**
     * Send a conversation opened update.
     */
    public sendActiveConversation(conversation: threema.Conversation): void {
        // noinspection JSIgnoredPromiseFromCall
        this.sendUpdateWireMessage(WebClientService.SUB_TYPE_ACTIVE_CONVERSATION, true, {
            [WebClientService.ARGUMENT_RECEIVER_TYPE]: conversation.type,
            [WebClientService.ARGUMENT_RECEIVER_ID]: conversation.id,
        }, undefined);
    }

    /**
     * Add a contact receiver.
     */
    public addContact(threemaId: string): Promise<threema.ContactReceiver> {
        const data = {
            [WebClientService.ARGUMENT_IDENTITY]: threemaId,
        };
        const subType = WebClientService.SUB_TYPE_CONTACT;
        return this.sendCreateWireMessage(subType, true, undefined, data);
    }

    /**
     * Modify a contact name or an avatar
     */
    public modifyContact(
        threemaId: string,
        firstName?: string,
        lastName?: string,
        avatar?: ArrayBuffer | null,
    ): Promise<threema.ContactReceiver> {
        // Prepare payload data
        const data = {};
        if (firstName !== undefined) {
            data[WebClientService.ARGUMENT_FIRST_NAME] = firstName;
        }
        if (lastName !== undefined) {
            data[WebClientService.ARGUMENT_LAST_NAME] = lastName;
        }
        if (avatar !== undefined) {
            data[WebClientService.ARGUMENT_AVATAR] = avatar;
        }

        // Get contact
        const contact: threema.ContactReceiver = this.contacts.get(threemaId);

        // If no changes happened, resolve the promise immediately.
        if (Object.keys(data).length === 0) {
            this.arpLog.warn('Trying to modify contact without any changes');
            return Promise.resolve(contact);
        }

        // Send update
        const args = {
            [WebClientService.ARGUMENT_IDENTITY]: threemaId,
        };
        const subType = WebClientService.SUB_TYPE_CONTACT;
        const promise = this.sendUpdateWireMessage(subType, true, args, data);

        // If necessary, force an avatar reload
        if (avatar !== undefined) {
            this.contacts.get(threemaId).avatar = {};
            // noinspection JSIgnoredPromiseFromCall
            this.requestAvatar(contact, false);
        }

        return promise;
    }

    /*
     * Modify a conversation.
     */
    public modifyConversation(conversation: threema.Conversation, isPinned?: boolean): Promise<null> {
        const DATA_STARRED = 'isStarred';

        // Prepare payload data
        const args = {
            [WebClientService.ARGUMENT_RECEIVER_TYPE]: conversation.type,
            [WebClientService.ARGUMENT_RECEIVER_ID]: conversation.id,
        };
        const data = {};
        if (hasValue(isPinned)) {
            data[DATA_STARRED] = isPinned;
        }

        // If no changes happened, resolve the promise immediately.
        if (Object.keys(data).length === 0) {
            this.arpLog.warn('Trying to modify conversation without any changes');
            return Promise.resolve(null);
        }

        // Send update
        const subType = WebClientService.SUB_TYPE_CONVERSATION;
        return this.sendUpdateWireMessage(subType, true, args, data);
    }

    /**
     * Create a group receiver.
     */
    public createGroup(
        members: string[],
        name: string | null = null,
        avatar?: ArrayBuffer | null,
    ): Promise<threema.GroupReceiver> {
        const data = {
            [WebClientService.ARGUMENT_MEMBERS]: members,
            [WebClientService.ARGUMENT_NAME]: name,
        } as object;

        if (hasValue(avatar)) {
            data[WebClientService.ARGUMENT_AVATAR] = avatar;
        }

        const subType = WebClientService.SUB_TYPE_GROUP;
        return this.sendCreateWireMessage(subType, true, undefined, data);
    }

    /**
     * Modify a group receiver.
     */
    public modifyGroup(
        id: string,
        members: string[],
        name?: string,
        avatar?: ArrayBuffer | null,
    ): Promise<threema.GroupReceiver> {
        // Prepare payload data
        const data = {
            [WebClientService.ARGUMENT_MEMBERS]: members,
        } as object;
        if (name !== undefined) {
            data[WebClientService.ARGUMENT_NAME] = name;
        }
        if (avatar !== undefined) {
            data[WebClientService.ARGUMENT_AVATAR] = avatar;
        }

        // Send update
        const args = {
            [WebClientService.ARGUMENT_RECEIVER_ID]: id,
        };
        const subType = WebClientService.SUB_TYPE_GROUP;
        const promise = this.sendUpdateWireMessage(subType, true, args, data);

        // If necessary, reset avatar to force a avatar reload
        if (avatar !== undefined) {
            this.groups.get(id).avatar = {};
        }
        return promise;
    }

    public leaveGroup(group: threema.GroupReceiver): Promise<any> {
        if (group === null || group === undefined || !group.access.canLeave) {
            // TODO: Not a valid error code (see ARP)
            return Promise.reject('not allowed');
        }

        const args = {
            [WebClientService.ARGUMENT_RECEIVER_ID]: group.id,
            [WebClientService.ARGUMENT_DELETE_TYPE]: WebClientService.DELETE_GROUP_TYPE_LEAVE,
        };
        const subType = WebClientService.SUB_TYPE_GROUP;
        return this.sendDeleteWireMessage(subType, true, args);
    }

    public deleteGroup(group: threema.GroupReceiver): Promise<any> {
        if (group === null || group === undefined || !group.access.canDelete) {
            // TODO: Not a valid error code (see ARP)
            return Promise.reject('not allowed');
        }

        const args = {
            [WebClientService.ARGUMENT_RECEIVER_ID]: group.id,
            [WebClientService.ARGUMENT_DELETE_TYPE]: WebClientService.DELETE_GROUP_TYPE_DELETE,
        };
        const subType = WebClientService.SUB_TYPE_GROUP;
        return this.sendDeleteWireMessage(subType, true, args);
    }

    /**
     * Force-sync a group.
     */
    public syncGroup(group: threema.GroupReceiver): Promise<any> {
        if (group === null || group === undefined || !group.access.canSync) {
            // TODO: Not a valid error code (see ARP)
            return Promise.reject('not allowed');
        }

        const args = {
            [WebClientService.ARGUMENT_RECEIVER_ID]: group.id,
        };
        const subType = WebClientService.SUB_TYPE_GROUP_SYNC;
        return this.sendRequestWireMessage(subType, true, args);
    }

    /**
     * Create a new distribution list receiver.
     */
    public createDistributionList(
        members: string[],
        name: string = null,
    ): Promise<threema.DistributionListReceiver> {
        const data = {
            [WebClientService.ARGUMENT_MEMBERS]: members,
            [WebClientService.ARGUMENT_NAME]: name,
        };
        const subType = WebClientService.SUB_TYPE_DISTRIBUTION_LIST;
        return this.sendCreateWireMessage(subType, true, undefined, data);
    }

    public modifyDistributionList(
        id: string,
        members: string[],
        name: string = null,
    ): Promise<threema.DistributionListReceiver> {
        const args = {
            [WebClientService.ARGUMENT_RECEIVER_ID]: id,
        };
        const data = {
            [WebClientService.ARGUMENT_MEMBERS]: members,
            [WebClientService.ARGUMENT_NAME]: name,
        } as any;
        const subType = WebClientService.SUB_TYPE_DISTRIBUTION_LIST;
        return this.sendUpdateWireMessage(subType, true, args, data);
    }

    public deleteDistributionList(distributionList: threema.DistributionListReceiver): Promise<any> {
        if (distributionList === null || distributionList === undefined || !distributionList.access.canDelete) {
            // TODO: Not a valid error code (see ARP)
            return Promise.reject('not allowed');
        }

        const args = {
            [WebClientService.ARGUMENT_RECEIVER_ID]: distributionList.id,
        };
        const subType = WebClientService.SUB_TYPE_DISTRIBUTION_LIST;
        return this.sendDeleteWireMessage(subType, true, args);
    }

    /**
     * Remove all messages of a receiver
     * @param {threema.Receiver} receiver
     * @returns {Promise<any>}
     */
    public cleanReceiverConversation(receiver: threema.Receiver): Promise<any> {
        if (receiver === null || receiver === undefined) {
            return Promise.reject('invalidIdentity');
        }

        const args = {
            [WebClientService.ARGUMENT_RECEIVER_TYPE]: receiver.type,
            [WebClientService.ARGUMENT_RECEIVER_ID]: receiver.id,
        };
        const subType = WebClientService.SUB_TYPE_CLEAN_RECEIVER_CONVERSATION;
        return this.sendDeleteWireMessage(subType, true, args);
    }

    /**
     * Modify own profile.
     */
    public modifyProfile(nickname?: string, avatar?: ArrayBuffer | null): Promise<null> {
        // Prepare payload data
        const data = {};
        if (nickname !== undefined && nickname !== null) {
            data[WebClientService.ARGUMENT_NICKNAME] = nickname;
        }
        if (avatar !== undefined) {
            data[WebClientService.ARGUMENT_AVATAR] = avatar;
        }

        // If no changes happened, resolve the promise immediately.
        if (Object.keys(data).length === 0) {
            this.arpLog.warn('Trying to modify profile without any changes');
            return Promise.resolve(null);
        }

        const subType = WebClientService.SUB_TYPE_PROFILE;
        return this.sendUpdateWireMessage(subType, true, undefined, data);
    }

    /**
     * Return whether the specified contact is currently typing.
     */
    public isTyping(contact: threema.ContactReceiver): boolean {
        return this.typing.isTyping(contact);
    }

    /**
     * Return the curring quoted message model
     */
    public getQuote(receiver: threema.Receiver): threema.Quote | undefined {
        return this.drafts.getQuote(receiver);
    }

    /**
     * Set or remove (if message is null) a quoted message model.
     */
    public setQuote(receiver: threema.Receiver, message: threema.Message | null): void {
        // Remove current quote
        this.drafts.removeQuote(receiver);

        if (message !== null) {
            const quoteText = this.messageService.getQuoteText(message);
            const hasMessageId = message.id != null && message.id.length > 0;

            if (hasValue(quoteText) || (this.appCapabilities.quotesV2 && hasMessageId)) {
                const quote = {
                    identity: message.isOutbox ? this.me.id : message.partnerId,
                    text: quoteText ?? this.$translate.instant(`messageTypes.${message.type}`),
                } as threema.Quote;
                if (hasMessageId) {
                    quote.messageId = message.id;
                }

                this.drafts.setQuote(receiver, quote);
                this.$rootScope.$broadcast('onQuoted', {
                    receiver: receiver,
                    quote: quote,
                });
            }
        }
    }

    /**
     * Set or remove (if string is null) a draft message
     */
    public setDraft(receiver: threema.Receiver, message: string = null): void {
        if (message === null || message.trim().length === 0) {
            this.drafts.removeText(receiver);
        } else {
            this.drafts.setText(receiver, message.trim());
        }

    }

    /**
     * return draft text
     */
    public getDraft(receiver: threema.Receiver): string {
        return this.drafts.getText(receiver);
    }

    /**
     * Reset data related to initialization.
     */
    private _resetInitializationSteps(): void {
        this.arpLog.debug('Reset initialization steps');
        this.initialized.clear();
        this.pendingInitializationStepRoutines = new Set();
    }

    /**
     * Reset data fields.
     */
    private _resetFields(): void {
        // Reset initialization data
        this._resetInitializationSteps();

        // Create container instances
        this.receivers = this.container.createReceivers();
        this.conversations = this.container.createConversations();
        this.messages = this.container.createMessages();
        this.typingInstance = this.container.createTyping();

        // Add converters (pre-processors)
        this.conversations.setConverter(this.container.Converter.addReceiverToConversation(this.receivers));

        // Add filters
        this.conversations.setFilter(this.container.Filters.hasData(this.receivers));
    }

    private _requestInitialData(): void {
        // If all conversations are reloaded, clear the message cache
        // to get in sync (we don't know if a message was removed, updated etc..)
        this.messages.clear(this.$rootScope);

        // Request initial data
        this.requestClientInfo();
        this.requestProfile();
        this.requestReceivers();
        this.requestConversations();
        this.requestBatteryStatus();
    }

    // TODO: Deprecated, remove soon.
    private _receiveResponseConfirmAction(message: threema.WireMessage): void {
        this.arpLog.debug('Received confirmAction response');
        const future = this.popWireMessageFuture(message);
        if (!message.ack.success) {
            future.reject(message.ack.error);
        } else {
            future.resolve();
        }
    }

    private _receiveResponseReceivers(message: threema.WireMessage): void {
        this.arpLog.debug('Received receivers response');
        const future = this.popWireMessageFuture(message, this.requiresTemporaryIdBackwardsCompatibility);

        // Handle error (if any)
        if ((!this.requiresTemporaryIdBackwardsCompatibility && message.ack !== undefined) && !message.ack.success) {
            future.reject(message.ack.error);
        }

        // Unpack and validate data
        const data = message.data;
        if (data === undefined) {
            this.arpLog.warn('Invalid receivers response, data missing');
            return future.reject('invalidResponse');
        }

        // Run delayed as it requires the profile to be initialised
        this.runAfterInitializationSteps([
            InitializationStep.Profile,
        ], () => {
            // Store receivers
            this.sortContacts(data.contact);
            this.receivers.set(data);
            this.registerInitializationStep(InitializationStep.Receivers);
            future.resolve();
        });
    }

    private _receiveResponseContactDetail(message: threema.WireMessage): void {
        this.arpLog.debug('Received contact detail response');
        const future = this.popWireMessageFuture(message);

        // Handle error (if any)
        if (!message.ack.success) {
            return future.reject(message.ack.error);
        }

        // Unpack and validate data
        const args = message.args;
        const data = message.data;
        if (args === undefined || data === undefined) {
            this.arpLog.error('Invalid contact response, args or data missing');
            return future.reject('invalidResponse');
        }

        // Set contact detail
        const contactReceiver = this.receivers.contacts
            .get(args[WebClientService.ARGUMENT_IDENTITY]) as threema.ContactReceiver;
        const receiver = data[WebClientService.SUB_TYPE_RECEIVER];
        if (hasValue(receiver)) {
            contactReceiver.systemContact =
                receiver[WebClientService.ARGUMENT_SYSTEM_CONTACT];
        }
        future.resolve(contactReceiver);
    }

    private _receiveUpdateAlert(message: threema.WireMessage): void {
        this.arpLog.debug('Received alert');
        this.alerts.push({
            source: message.args.source,
            type: message.args.type,
            message: message.data.message,
        } as threema.Alert);

    }

    /**
     * A connectionAck request arrived.
     */
    private _receiveRequestConnectionAck(message: threema.WireMessage) {
        this._sendConnectionAck();
    }

    /**
     * A connectionAck update arrived.
     */
    private _receiveUpdateConnectionAck(message: threema.WireMessage) {
        this.arpLog.debug('Received connection ack');
        if (!hasValue(message.data)) {
            this.arpLog.warn('Invalid connectionAck message: data missing');
            return;
        }
        if (!hasValue(message.data.sequenceNumber)) {
            this.arpLog.warn('Invalid connectionAck message: sequenceNumber missing');
            return;
        }
        const sequenceNumber = message.data.sequenceNumber;

        // Remove chunks which have already been received by the remote side
        const size = this.currentChunkCache.byteLength;
        let result;
        this.arpLog.debug(`Pruning cache (local-sn=${this.currentChunkCache.sequenceNumber.get()}, ` +
            `remote-sn=${sequenceNumber})`);
        try {
            result = this.currentChunkCache.prune(sequenceNumber);
        } catch (error) {
            this.arpLog.error(error);
            this.failSession();
            return;
        }
        this.arpLog.debug(`Chunk cache pruned, acknowledged: ${result.acknowledged}, left: ${result.left}, size: ` +
            `${size} -> ${this.currentChunkCache.byteLength}`);

        // Clear pending ack requests
        if (this.pendingAckRequest !== null && sequenceNumber >= this.pendingAckRequest) {
            this.pendingAckRequest = null;
        }
    }

    /**
     * A connectionDisconnect message arrived.
     */
    private _receiveUpdateConnectionDisconnect(message: threema.WireMessage) {
        this.arpLog.debug('Received connectionDisconnect');

        if (!hasValue(message.data) || !hasValue(message.data.reason)) {
            this.arpLog.warn('Invalid connectionDisconnect message: data or reason missing');
            return;
        }
        const reason = message.data.reason;

        this.arpLog.debug(`Disconnecting requested (reason: ${reason})`);

        let alertMessage: string;
        switch (reason) {
            case DisconnectReason.SessionStopped:
                alertMessage = 'connection.SESSION_STOPPED';
                break;
            case DisconnectReason.SessionDeleted:
                alertMessage = 'connection.SESSION_DELETED';
                break;
            case DisconnectReason.WebclientDisabled:
                alertMessage = 'connection.WEBCLIENT_DISABLED';
                break;
            case DisconnectReason.SessionReplaced:
                alertMessage = 'connection.SESSION_REPLACED';
                break;
            case DisconnectReason.OutOfMemory:
                alertMessage = 'connection.OUT_OF_MEMORY';
                break;
            case DisconnectReason.SessionError:
                alertMessage = 'connection.SESSION_ERROR';
                break;
            default:
                alertMessage = 'connection.SESSION_ERROR';
                this.arpLog.error('Unknown disconnect reason:', reason);
                break;
        }

        // Stop and show an alert on the welcome page
        const isWelcome = this.$state.includes('welcome');
        this.stop({
            reason: reason,
            send: false,
            // TODO: Use welcome.{reason} once we have it
            close: 'welcome',
        });

        // Note: This is required to reset the mode and potentially
        //       re-establish a connection if needed.
        // TODO: Remove once we have created pages for each mode on the
        //       'welcome' page.
        if (isWelcome) {
            this.$state.reload().catch((error) => {
                this.log.error('Unable to reload state:', error);
            });
        }
        this.showAlert(alertMessage);
    }

    /**
     * A connectionInfo message arrived.
     */
    private _receiveConnectionInfo(message: threema.WireMessage) {
        this.arpLog.debug('Received connectionInfo from device');
        if (!hasValue(message.data)) {
            this.connectionInfoFuture.reject('Invalid connectionInfo message: data missing');
            return;
        }
        if (!hasValue(message.data.id)) {
            this.connectionInfoFuture.reject('Invalid connectionInfo message: data.id is missing');
            return;
        }
        if (!(message.data.id instanceof ArrayBuffer)) {
            this.connectionInfoFuture.reject('Invalid connectionInfo message: data.id is of invalid type');
            return;
        }
        const resume = message.data.resume;
        if (resume !== undefined) {
            if (!hasValue(resume.id)) {
                this.connectionInfoFuture.reject('Invalid connectionInfo message: data.resume.id is missing');
                return;
            }
            if (!hasValue(resume.sequenceNumber)) {
                const error = 'Invalid connectionInfo message: data.resume.sequenceNumber is missing';
                this.connectionInfoFuture.reject(error);
                return;
            }
            if (!(resume.id instanceof ArrayBuffer)) {
                this.connectionInfoFuture.reject('Invalid connectionInfo message: data.resume.id is of invalid type');
                return;
            }
            if (resume.sequenceNumber < 0 || resume.sequenceNumber > WebClientService.SEQUENCE_NUMBER_MAX) {
                const error = 'Invalid connectionInfo message: data.resume.sequenceNumber is invalid';
                this.connectionInfoFuture.reject(error);
                return;
            }
        }
        this.connectionInfoFuture.resolve(message.data);
    }

    /**
     * Process an incoming 'contact', 'group' or 'distributionList' message as
     * a reply to a previous 'create' or 'update' message of that sub-type.
     */
    private _receiveReplyReceiver<T extends threema.Receiver>(
        message: threema.WireMessage,
        receiverType: threema.ReceiverType,
        future: Future<any>,
    ): void {
        this.arpLog.debug(`Received ${receiverType} ${message.subType}`);

        // Handle error (if any)
        if (message.ack !== undefined && !message.ack.success) {
            return future.reject(message.ack.error);
        }

        // Unpack and validate data
        const data = message.data;
        if (data === undefined) {
            this.arpLog.error(`Invalid ${receiverType} response, 'data' is missing`);
            return future.reject('invalidResponse');
        }

        // Get receiver instance
        const receiver = data[WebClientService.SUB_TYPE_RECEIVER] as T;

        // Update receiver type if not set
        if (receiver.type === undefined) {
            receiver.type = receiverType;
        }

        // Extend models
        if (isContactReceiver(receiver)) {
            this.receivers.extendContact(receiver);
        } else if (isGroupReceiver(receiver)) {
            this.receivers.extendGroup(receiver);
        } else if (isDistributionListReceiver(receiver)) {
            this.receivers.extendDistributionList(receiver);
        }
        future.resolve(receiver);
    }

    private _receiveCreateContact(message: threema.WireMessage): void {
        const future = this.popWireMessageFuture(message);
        this._receiveReplyReceiver(message, 'contact', future);
    }

    private _receiveCreateGroup(message: threema.WireMessage): void {
        const future = this.popWireMessageFuture(message);
        this._receiveReplyReceiver(message, 'group', future);
    }

    private _receiveCreateDistributionList(message: threema.WireMessage): void {
        const future = this.popWireMessageFuture(message);
        this._receiveReplyReceiver(message, 'distributionList', future);
    }

    private _receiveCreateMessage(wireMessage: threema.WireMessage): void {
        this.arpLog.debug('Received create message response');
        const future = this.popWireMessageFuture(wireMessage);

        // Handle error (if any)
        if (!wireMessage.ack.success) {
            return future.reject(wireMessage.ack.error);
        }

        // Unpack data and arguments
        const args = wireMessage.args;
        const data = wireMessage.data;
        if (args === undefined || data === undefined) {
            this.arpLog.warn('Invalid create message received, arguments or data missing');
            return future.reject('invalidResponse');
        }

        const receiverType: threema.ReceiverType = args[WebClientService.ARGUMENT_RECEIVER_TYPE];
        const receiverId: string = args[WebClientService.ARGUMENT_RECEIVER_ID];
        const messageId: string = data[WebClientService.ARGUMENT_MESSAGE_ID];
        if (receiverType === undefined || receiverId === undefined || messageId === undefined) {
            this.arpLog.warn("Invalid create received: 'type', 'id' or 'messageId' missing");
            return future.reject('invalidResponse');
        }

        // Map the previously used temporary id to the one chosen by the app
        const receiver = {
            type: receiverType,
            id: receiverId,
        } as threema.Receiver;
        const message = this.messages.bindTemporaryToMessageId(
            receiver,
            wireMessage.ack.id,
            messageId,
        );
        future.resolve(messageId);

        // Add a special future that resolves once the message has been
        // identified as sent. As long as an unacknowledged wire message future
        // exists, the app will be continuously awoken if the connection
        // has been lost.
        if (!this.messageService.isSentOrSendingFailed(message)) {
            const sentId = `${message.id}-sent`;
            this.wireMessageFutures.set(sentId, new Future());
            this.arpLogV.debug(`Added special wire message future: ${sentId}`);
        }
    }

    private _receiveResponseConversations(message: threema.WireMessage) {
        this.arpLog.debug('Received conversations response');
        const future = this.popWireMessageFuture(message, this.requiresTemporaryIdBackwardsCompatibility);

        // Handle error (if any)
        if ((!this.requiresTemporaryIdBackwardsCompatibility && message.ack !== undefined) && !message.ack.success) {
            future.reject(message.ack.error);
        }

        // Validate data
        const data = message.data as threema.Conversation[];
        if (data === undefined) {
            this.arpLog.warn('Invalid conversation response, data missing');
            return future.reject('invalidResponse');
        }

        // Run delayed as it requires the receivers to be available
        this.runAfterInitializationSteps([
            InitializationStep.Receivers,
        ], () => {
            // If a avatar was set on a conversation, convert and copy to the receiver
            for (const conversation of data) {
                if (conversation.avatar !== undefined && conversation.avatar !== null) {
                    const receiver: threema.Receiver = this.receivers.getData({
                        id: conversation.id,
                        type: conversation.type,
                    });
                    if (receiver !== undefined && receiver.avatar === undefined) {
                        receiver.avatar = {
                            low: conversation.avatar,
                        };
                    }
                    // Remove avatar from conversation
                    delete conversation.avatar;
                }
            }

            // Store conversations & done
            this.conversations.set(data);
            this.updateUnreadCount();
            this.registerInitializationStep(InitializationStep.Conversations);
            future.resolve();
        });
    }

    private _receiveResponseMessages(message: threema.WireMessage): void {
        this.arpLog.debug('Received messages response');
        const future = this.popWireMessageFuture(message, this.requiresTemporaryIdBackwardsCompatibility);

        // Handle error (if any)
        if ((!this.requiresTemporaryIdBackwardsCompatibility && message.ack !== undefined) && !message.ack.success) {
            future.reject(message.ack.error);
        }

        // Unpack data and arguments
        const args = message.args;
        const data = message.data as threema.Message[];
        if (args === undefined || data === undefined) {
            this.arpLog.warn('Invalid messages response, data or arguments missing');
            return future.reject('invalidResponse');
        }

        // Unpack required argument fields
        const type: string = args[WebClientService.ARGUMENT_RECEIVER_TYPE];
        const id: string = args[WebClientService.ARGUMENT_RECEIVER_ID];
        let more: boolean = args[WebClientService.ARGUMENT_HAS_MORE];
        if (type === undefined || id === undefined || more === undefined) {
            this.arpLog.warn('Invalid messages response, argument field missing');
            return future.reject('invalidResponse');
        }
        if (!isValidReceiverType(type)) {
            this.arpLog.warn('Invalid messages response, unknown receiver type (' + type + ')');
            return future.reject('invalidResponse');
        }
        if (this.userConfig.ARP_LOG_TRACE) {
            this.logChatMessages(message.type, message.subType, type, id, 'new', data);
        }
        const receiver: threema.BaseReceiver = {type: type, id: id};

        // If there's no data returned, override `more` field.
        if (data.length === 0) {
            more = false;
        }

        // Set as loaded
        this.loadingMessages.delete(receiver.type + receiver.id);

        // Check if the messages have been requested
        // TODO: Isn't this a bogus check since we know that we have made the
        //       request at this point?
        if (!this.messages.isRequested(receiver)) {
            this.arpLog.warn("Ignoring message response that hasn't been requested");
            return future.reject('invalidResponse');
        }

        // Add messages
        this.messages.addOlder(receiver, data);

        // Clear pending request
        this.messages.clearRequested(receiver);

        // Set "more" flag to indicate that more (older) messages are available.
        this.messages.setMore(receiver, more);

        // Notify listeners
        this.messages.notify(receiver, this.$rootScope);

        // Done
        future.resolve();
    }

    private _receiveResponseAvatar(message: threema.WireMessage): void {
        this.arpLog.debug('Received avatar response');
        const future = this.popWireMessageFuture(message);

        // Handle error (if any)
        if (!message.ack.success) {
            future.reject(message.ack.error);
        }

        // Unpack data and arguments
        const args = message.args;
        if (args === undefined) {
            this.arpLog.warn('Invalid message response: arguments missing');
            return future.reject('invalidResponse');
        }

        // Check for avatar data
        const avatar = message.data;
        if (avatar === undefined) {
            // A receiver without an avatar - fine!
            return future.resolve(null);
        }

        // Unpack required argument fields
        const type = args[WebClientService.ARGUMENT_RECEIVER_TYPE];
        const id = args[WebClientService.ARGUMENT_RECEIVER_ID];
        const highResolution = args[WebClientService.ARGUMENT_AVATAR_HIGH_RESOLUTION];
        if (type === undefined || id === undefined || highResolution === undefined) {
            this.arpLog.warn('Invalid avatar response, argument field missing');
            return future.reject('invalidResponse');
        }

        // Set avatar for receiver according to resolution
        const field: string = highResolution ? 'high' : 'low';
        const receiverData = this.receivers.getData(args);
        if (!hasValue(receiverData.avatar)) {
            receiverData.avatar = {};
        }
        receiverData.avatar[field] = avatar;
        future.resolve(avatar);
    }

    private _receiveResponseThumbnail(message: threema.WireMessage): void {
        this.arpLog.debug('Received thumbnail response');
        const future = this.popWireMessageFuture(message);

        // Handle error (if any)
        if (!message.ack.success) {
            future.reject(message.ack.error);
        }

        // Unpack data and arguments
        const args = message.args;
        if (args === undefined) {
            this.arpLog.warn('Invalid message response: arguments missing');
            return future.reject('invalidResponse');
        }

        // Check for thumbnail data
        const thumbnail = message.data;
        if (thumbnail === undefined) {
            // A message without a thumbnail - fine!
            return future.resolve(null);
        }

        // Unpack required argument fields
        const type = args[WebClientService.ARGUMENT_RECEIVER_TYPE];
        const id = args[WebClientService.ARGUMENT_RECEIVER_ID];
        const messageId: string = args[WebClientService.ARGUMENT_MESSAGE_ID];
        if (type === undefined || id === undefined || messageId === undefined ) {
            this.arpLog.warn('Invalid thumbnail response, argument field missing');
            return future.reject('invalidResponse');
        }

        // Set thumbnail
        this.messages.setThumbnail( this.receivers.getData(args), messageId, thumbnail);
        future.resolve(thumbnail);
    }

    private _receiveResponseBlob(message: threema.WireMessage): void {
        this.arpLog.debug('Received blob response');
        const future = this.popWireMessageFuture(message);

        // Handle error (if any)
        if (!message.ack.success) {
            return future.reject(message.ack.error);
        }

        // Unpack data and arguments
        const args = message.args;
        const data = message.data;
        if (args === undefined) {
            this.arpLog.warn('Invalid message response, args missing');
            return future.reject('invalidResponse');
        }

        // Unpack required argument fields
        const receiverType = args[WebClientService.ARGUMENT_RECEIVER_TYPE];
        const receiverId = args[WebClientService.ARGUMENT_RECEIVER_ID];
        const msgId: string = args[WebClientService.ARGUMENT_MESSAGE_ID];
        if (receiverType === undefined || receiverId === undefined || msgId === undefined) {
            this.arpLog.warn('Invalid blob response, argument field missing');
            return future.reject('invalidResponse');
        }

        // Unpack data
        const blobInfo: threema.BlobInfo = {
            buffer: data[WebClientService.DATA_FIELD_BLOB_BLOB],
            mimetype: data[WebClientService.DATA_FIELD_BLOB_TYPE],
            filename: data[WebClientService.DATA_FIELD_BLOB_NAME],
        };
        if (blobInfo.buffer === undefined || blobInfo.mimetype === undefined || blobInfo.filename === undefined) {
            this.arpLog.warn('Invalid blob response, data field missing');
            return future.reject('invalidResponse');
        }

        // Store blob
        this.blobCache.set(msgId + receiverType, blobInfo);
        future.resolve(blobInfo);
    }

    private _receiveUpdateConfirm(message: threema.WireMessage): void {
        this.arpLog.debug('Received wire message acknowledgement');
        const future = this.popWireMessageFuture(message);
        if (!message.ack.success) {
            future.reject(message.ack.error);
        } else {
            future.resolve();
        }
    }

    private _receiveUpdateMessages(wireMessage: threema.WireMessage): void {
        this.arpLog.debug('Received messages update');
        const future = this.popWireMessageFuture(wireMessage, true);

        // Handle error (if any)
        if (wireMessage.ack !== undefined && !wireMessage.ack.success) {
            return future.reject(wireMessage.ack.error);
        }

        // Unpack data and arguments
        const args = wireMessage.args;
        const data: threema.Message[] = wireMessage.data;
        if (args === undefined || data === undefined) {
            this.arpLog.warn('Invalid message update, data or arguments missing');
            return future.reject('invalidResponse');
        }

        // Unpack required argument fields
        const type: string = args[WebClientService.ARGUMENT_RECEIVER_TYPE];
        const id: string = args[WebClientService.ARGUMENT_RECEIVER_ID];
        const mode: string = args[WebClientService.ARGUMENT_MODE];
        if (type === undefined || id === undefined || mode === undefined) {
            this.arpLog.warn('Invalid message update, argument field missing');
            return future.reject('invalidResponse');
        }
        if (!isValidReceiverType(type)) {
            this.arpLog.warn('Invalid messages update, unknown receiver type (' + type + ')');
            return future.reject('invalidResponse');
        }
        if (this.userConfig.ARP_LOG_TRACE) {
            this.logChatMessages(wireMessage.type, wireMessage.subType, type, id, mode, data);
        }
        const receiver: threema.BaseReceiver = {type: type, id: id};

        // React depending on mode
        let notify = false;
        for (const message of data) {
            // Pop special future to be resolved if the message has been
            // identified as sent.
            if (this.messageService.isSentOrSendingFailed(message)) {
                const sentId = `${message.id}-sent`;
                const sentFuture = this.wireMessageFutures.get(sentId);
                if (sentFuture !== undefined) {
                    this.wireMessageFutures.delete(sentId);
                    this.arpLogV.debug(`Removed special wire message future: ${sentId}`);
                    sentFuture.resolve();
                }
            }

            switch (mode) {
                case WebClientService.ARGUMENT_MODE_NEW:
                    // It's possible that this message already exists (placeholder message on send).
                    // Try to update it first. If not, add it as a new msg.
                    if (!this.messages.update(receiver, message)) {
                        this.messages.addNewer(receiver, [message]);

                        // If we have received a new message, it is highly unlikely that the contact is still typing
                        this.typing.unsetTyping(receiver);
                    }
                    notify = true;
                    break;
                case WebClientService.ARGUMENT_MODE_MODIFIED:
                    if (!this.messages.update(receiver, message)) {
                        const log = `Received message update for unknown message (id ${message.id})`;
                        this.arpLog.error(log);
                        if (this.userConfig.ARP_LOG_TRACE) {
                            this.messages.addStatusMessage(receiver, 'Warning: ' + log);
                            notify = true;
                        }
                    }
                    break;
                case WebClientService.ARGUMENT_MODE_REMOVED:
                    if (!this.messages.remove(receiver, message.id)) {
                        this.arpLog.error(`Received message deletion for unknown message (id ${message.id})`);
                    }
                    notify = true;
                    break;
                default:
                    this.arpLog.warn('Invalid message response, unknown mode:', mode);
            }
        }
        if (notify) {
            this.messages.notify(receiver, this.$rootScope);
        }
        future.resolve();
    }

    private _receiveUpdateReceiver(message: threema.WireMessage): void {
        this.arpLog.debug('Received receiver update');

        // Unpack data and arguments
        const args = message.args;
        const data = message.data;
        if (args === undefined || data === undefined) {
            this.arpLog.warn('Invalid receiver update, data or arguments missing');
            return;
        }

        // Unpack required argument fields
        const type = args[WebClientService.ARGUMENT_RECEIVER_TYPE] as threema.ReceiverType;
        const id = args[WebClientService.ARGUMENT_RECEIVER_ID];
        const mode: 'new' | 'modified' | 'removed' = args[WebClientService.ARGUMENT_MODE];
        if (type === undefined || mode === undefined || id === undefined) {
            this.arpLog.warn('Invalid receiver update, argument field missing');
            return;
        }

        // React depending on mode
        switch (mode) {
            case WebClientService.ARGUMENT_MODE_NEW:
            case WebClientService.ARGUMENT_MODE_MODIFIED:
                // Add or update a certain receiver
                const updatedReceiver = this.receivers.extend(type, data);

                // Remove all cached messages if the receiver was moved to "locked" state
                if (updatedReceiver !== undefined && updatedReceiver.locked) {
                    this.messages.clearReceiverMessages(updatedReceiver);
                }
                break;
            case WebClientService.ARGUMENT_MODE_REMOVED:
                // Remove a certain receiver
                (this.receivers.get(type) as Map<string, threema.Receiver>).delete(id);
                break;
            default:
                this.arpLog.warn('Invalid receiver response, unknown mode:', mode);
        }
    }

    private _receiveUpdateReceivers(message: threema.WireMessage): void {
        this.arpLog.debug('Received receivers update');

        // Unpack data and arguments
        const args = message.args;
        const data = message.data;
        if (args === undefined || data === undefined) {
            this.arpLog.warn('Invalid receiver update, data or arguments missing');
            return;
        }

        // Unpack required argument fields
        const type = args[WebClientService.ARGUMENT_RECEIVER_TYPE] as threema.ReceiverType;
        if (type === undefined) {
            this.arpLog.warn('Invalid receivers update, argument field missing');
            return;
        }

        // Refresh lists of receivers
        switch (type) {
            case 'contact':
                this.sortContacts(data);
                this.receivers.setContacts(data);
                break;
            case 'group':
                this.receivers.setGroups(data);
                break;
            case 'distributionList':
                this.receivers.setDistributionLists(data);
                break;
            default:
                this.arpLog.warn('Unknown receiver type:', type);
        }
    }

    private _receiveUpdateTyping(message: threema.WireMessage): void {
        this.arpLog.debug('Received typing update');

        // Unpack data and arguments
        const args = message.args;
        const data = message.data;
        if (args === undefined || data === undefined) {
            this.arpLog.warn('Invalid typing update, data or arguments missing');
            return;
        }

        // Unpack required argument fields
        const identity: string = args[WebClientService.ARGUMENT_RECEIVER_ID];
        if (identity === undefined) {
            this.arpLog.warn('Invalid typing update, argument field missing');
            return;
        }

        // Unpack required data fields
        const isTyping: boolean = data[WebClientService.ARGUMENT_IS_TYPING];
        if (isTyping === undefined) {
            this.arpLog.warn('Invalid typing update, data field missing');
            return;
        }

        // Store or remove typing notification.
        // Note that we know that the receiver must be a contact, because
        // groups and distribution lists can't type.
        const receiver = {id: identity, type: 'contact'}  as threema.ContactReceiver;
        if (isTyping === true) {
            this.typing.setTyping(receiver);
        } else {
            this.typing.unsetTyping(receiver);
        }
    }

    private _receiveUpdateConversation(message: threema.WireMessage) {
        this.arpLog.debug('Received conversation update');

        // Validate data
        const args = message.args;
        const data = message.data as threema.ConversationWithPosition;
        if (args === undefined || data === undefined) {
            this.arpLog.warn('Invalid conversation update, data or arguments missing');
            return;
        }

        // Get receiver
        const receiver = this.receivers.getData({type: data.type, id: data.id});
        if (!hasValue(receiver)) {
            const log = `Received conversation update for unknown ${data.type} receiver`;
            this.arpLog.error(log);
            return;
        }

        // Unpack required argument fields
        const type: string = args[WebClientService.ARGUMENT_MODE];
        switch (type) {
            case WebClientService.ARGUMENT_MODE_NEW:
                if (this.conversations.find(data) !== null) {
                    this.arpLog.error('Received update/conversation with mode=new for existing conversation');
                    // Ignore message
                    break;
                }
                this.conversations.add(data);
                break;
            case WebClientService.ARGUMENT_MODE_MODIFIED:
                // A conversation update *can* mean that a new message arrived.
                // To find out, we'll look at the unread count. If it has been
                // incremented, it must be a new message.
                if (data.unreadCount > 0) {
                    const oldConversation = this.conversations.updateOrAdd(data, true);
                    if (oldConversation === null) {
                        this.onNewMessage(data.latestMessage, data, receiver);
                    } else {
                        // Check for unread count changes
                        const unreadCountIncreased = data.unreadCount > oldConversation.unreadCount;
                        const unreadCountDecreased = data.unreadCount < oldConversation.unreadCount;

                        // If the unreadcount has increased, we received a new message.
                        // Otherwise, if it has decreased, hide the notification.
                        if (unreadCountIncreased) {
                            this.onNewMessage(data.latestMessage, data, receiver);
                        } else if (unreadCountDecreased) {
                            this.notificationService.hideNotification(data.type + '-' + data.id);
                        }
                    }
                } else {
                    // Update the conversation and hide any notifications
                    this.conversations.updateOrAdd(data, false);
                    this.notificationService.hideNotification(data.type + '-' + data.id);
                }

                break;
            case WebClientService.ARGUMENT_MODE_REMOVED:
                // Remove conversation
                this.conversations.remove(data);

                // Remove all cached messages for the receiver
                this.messages.clearReceiverMessages(receiver);

                // Call on-removed listener
                this.receiverListener.forEach((listener: threema.ReceiverListener) => {
                    this.arpLog.debug('Call on removed listener');
                    listener.onConversationRemoved(receiver);
                });
                break;
            default:
                this.arpLog.warn('Received conversation without a mode');
                break;
        }

        this.updateUnreadCount();
    }

    private _receiveUpdateAvatar(message: threema.WireMessage) {
        this.arpLog.debug('Received avatar update');
        const args = message.args;
        const data = message.data as ArrayBuffer;
        if (args === undefined) {
            this.arpLog.warn('Invalid avatar update, arguments missing');
            return;
        }

        // Get receiver
        const receiver = this.receivers.getData({type: args.type, id: args.id});
        if (receiver === undefined) {
            this.arpLog.error('Received avatar update for nonexistent receiver');
            return;
        }

        // Set (or clear) low-res avatar, invalidate high-res avatar
        receiver.avatar = {
            low: hasValue(data) ? data : undefined,
            high: undefined,
        };
    }

    /**
     * Process an incoming battery status message.
     */
    private _receiveUpdateBatteryStatus(message: threema.WireMessage): void {
        this.arpLog.debug('Received battery status');
        const future = this.popWireMessageFuture(message, true);

        // Handle error (if any)
        if (message.ack !== undefined && !message.ack.success) {
            return future.reject(message.ack.error);
        }

        // Unpack data and arguments
        const data = message.data as threema.BatteryStatus;
        if (data === undefined) {
            this.arpLog.warn('Invalid battery status message, data missing');
            return future.reject('invalidResponse');
        }

        // Set battery status
        this.batteryStatusService.setStatus(data);
        future.resolve();
    }

    private _receiveUpdateContact(message: threema.WireMessage): void {
        const future = this.popWireMessageFuture(message);
        this._receiveReplyReceiver(message, 'contact', future);
    }

    private _receiveUpdateGroup(message: threema.WireMessage): void {
        const future = this.popWireMessageFuture(message);
        this._receiveReplyReceiver(message, 'group', future);
    }

    private _receiveUpdateDistributionList(message: threema.WireMessage): void {
        const future = this.popWireMessageFuture(message);
        this._receiveReplyReceiver(message, 'distributionList', future);
    }

    /**
     * Process an incoming profile update message.
     */
    private _receiveUpdateProfile(message: threema.WireMessage): void {
        this.arpLog.debug('Received profile update');

        // Unpack data and arguments
        const data = message.data as threema.ProfileUpdate;
        if (data === undefined) {
            this.arpLog.warn('Invalid profile update message, data missing');
            return;
        }

        // Update public nickname
        if (hasValue(data.publicNickname)) {
            if (data.publicNickname === this.me.id) {
                // Unset nickname
                this.me.publicNickname = undefined;
                this.me.displayName = this.$translate.instant('messenger.ME');
            } else {
                // Update nickname
                this.me.publicNickname = data.publicNickname;
                this.me.displayName = data.publicNickname;
            }
        }

        // Update avatar
        if (data.avatar !== undefined) {
            if (data.avatar === null) {
                this.me.avatar = {};
            } else {
                this.me.avatar = { high: data.avatar };
            }

            // Request new low-res avatar
            void this.requestAvatar(this.me, false);
        }
    }

    /**
     * The peer sends the device information string. This can be used to
     * identify the active session.
     */
    private _receiveResponseClientInfo(message: threema.WireMessage): void {
        this.arpLog.debug('Received client info response');
        const future = this.popWireMessageFuture(message, this.requiresTemporaryIdBackwardsCompatibility);

        // Handle error (if any)
        if ((!this.requiresTemporaryIdBackwardsCompatibility && message.ack !== undefined) && !message.ack.success) {
            future.reject(message.ack.error);
        }

        // Validate data
        const data = message.data;
        if (data === undefined) {
            this.arpLog.warn('Invalid client info, data field missing');
            return future.reject('invalidResponse');
        }

        /**
         * Return the field if it's not undefined, otherwise return the default.
         */
        function getOrDefault<T>(field: T, defaultVal: T): T {
            if (field === undefined) {
                return defaultVal;
            }
            return field;
        }

        // Set clientInfo attribute
        this.clientInfo = {
            device: data.device,
            os: data.os,
            osVersion: data.osVersion,
            isWork: hasValue(data.isWork) ? data.isWork : false,  // TODO: Backwards compat hack, remove after 08/2019
            pushToken: data.pushToken,
            configuration: {
                voipEnabled: getOrDefault<boolean>(data.configuration.voipEnabled, true),
                voipForceTurn: getOrDefault<boolean>(data.configuration.voipForceTurn, false),
                largeSingleEmoji: getOrDefault<boolean>(data.configuration.largeSingleEmoji, true),
                showInactiveIDs: getOrDefault<boolean>(data.configuration.showInactiveIDs, true),
            },
            capabilities: {
                maxGroupSize: getOrDefault<number>(data.capabilities.maxGroupSize, 50),
                maxFileSize: getOrDefault<number>(data.capabilities.maxFileSize, 50 * 1024 * 1024),
                maxMessageBodySize: getOrDefault<number>(data.capabilities.maxMessageBodySize, 3500),
                distributionLists: getOrDefault<boolean>(data.capabilities.distributionLists, true),
                quotesV2: getOrDefault<boolean>(data.capabilities.quotesV2, false),
                imageFormat: data.capabilities.imageFormat,
                groupReactions: getOrDefault<boolean>(data.capabilities.groupReactions, false),
                mdm: data.capabilities.mdm,
            },
        };

        this.arpLog.debug('Client device:', this.clientInfo.device);
        this.arpLog.debug('Client capabilities:', this.clientInfo.capabilities);

        // Store `clientInfo.os` to `localStorage`
        try {
            localStorage.setItem("lastConnectedClientOS", this.clientInfo.os);
        } catch (error) {
            this.log.error(`Could not write to localSotrage: ${error}`);
        }

        // Store push token
        if (this.clientInfo.pushToken) {
            this.pushToken = this.clientInfo.pushToken;
            switch (this.clientInfo.os) {
                case threema.OperatingSystem.Android:
                    // Note: HMS and Threema Gatway push tokens are prefixed to differentiate them
                    // from FCM tokens. This prefix needs to be stripped.
                    const hmsPrefix = `${threema.PushTokenType.Hms};`;
                    const threemaGatewayPrefix = `${threema.PushTokenType.ThreemaGateway};`;
                    if (this.pushToken.startsWith(hmsPrefix)) {
                        this.pushToken = this.pushToken.substring(hmsPrefix.length);
                        this.pushTokenType = threema.PushTokenType.Hms;
                    } else if (this.pushToken.startsWith(threemaGatewayPrefix)) {
                        this.pushToken = this.pushToken.substring(threemaGatewayPrefix.length);
                        this.pushTokenType = threema.PushTokenType.ThreemaGateway;
                    } else {
                        this.pushTokenType = threema.PushTokenType.Fcm;
                    }
                    break;
                case threema.OperatingSystem.Ios:
                    this.pushTokenType = threema.PushTokenType.Apns;
                    break;
                default:
                    this.arpLog.error('Invalid operating system in client info');
            }
        }
        if (this.pushToken !== null && this.pushTokenType !== null) {
            this.pushService.init(this.pushToken, this.pushTokenType);
        }

        // If this is a work app, set a class on the HTML body
        // that can be used for customization.
        if (this.clientInfo.isWork) {
            this.themeService.changeTheme(threema.Theme.Work);
        }

        this.registerInitializationStep(InitializationStep.ClientInfo);
        future.resolve();
    }

    /**
     * The peer sends information about the current user profile.
     */
    private _receiveResponseProfile(message: threema.WireMessage): void {
        this.arpLog.debug('Received profile response');
        const future = this.popWireMessageFuture(message, this.requiresTemporaryIdBackwardsCompatibility);

        // Handle error (if any)
        if ((!this.requiresTemporaryIdBackwardsCompatibility && message.ack !== undefined) && !message.ack.success) {
            future.reject(message.ack.error);
        }

        // Validate data
        const data = message.data as threema.Profile;
        if (data === undefined) {
            this.arpLog.warn('Invalid client info, data field missing');
            return future.reject('invalidResponse');
        }

        // Create 'me' receiver with profile + dummy data
        // TODO: Send both high-res and low-res avatars
        const hasPublicNickname = hasValue(data.publicNickname) && data.publicNickname !== data.identity;
        this.receivers.setMe({
            type: 'me',
            id: data.identity,
            publicNickname: data.publicNickname,
            displayName: hasPublicNickname ? data.publicNickname : this.$translate.instant('messenger.ME'),
            publicKey: data.publicKey,
            avatar: {
                high: data.avatar,
            },
            featureMask: 0xFF,
            verificationLevel: 3,
            state: 'ACTIVE',
            locked: false,
            visible: true,
            hidden: false,
            access: {
                canChangeAvatar: true,
                canChangeFirstName: true,
                canChangeLastName: true,
            },
            color: '#000000',
        });

        this.registerInitializationStep(InitializationStep.Profile);
        future.resolve();
    }

    public async setPassword(password: string, isAutoSession: boolean) {
        // If a password has been set, store trusted key and push token
        if (await this._maybeTrustKeys(password, isAutoSession)) {
            // Saved trusted key, send information to client
            this.sendKeyPersisted();
        }
    }

    /**
     * Reset all Fields and clear the blob cache
     */
    public clearCache(): void {
        this._resetFields();
        this.blobCache.clear();
    }

    /**
     * Return the max text length
     */
    public getMaxTextLength(): number {
        return this.clientInfo.capabilities.maxMessageBodySize;
    }

    /**
     * Returns the max group member size
     */
    public getMaxGroupMemberSize(): number {
        return this.clientInfo.capabilities.maxGroupSize;
    }

    /**
     * Whether a notification should be triggered.
     */
    private shouldNotify(settings: threema.SimplifiedNotificationSettings, message: threema.Message): boolean {
        if (settings.dnd.enabled) {
            // Do not show any notifications on muted chats
            if (settings.dnd.mentionOnly) {
                let textToSearch = '';
                if (message.type === 'text') {
                    textToSearch = message.body;
                } else if (message.caption) {
                    textToSearch = message.caption;
                }
                let quotedMe = false;
                if (message.quote) {
                    textToSearch += ' ' + message.quote.text;
                    quotedMe = message.quote.identity === this.me.id;
                }
                const forMe = textToSearch.indexOf('@[' + this.me.id + ']') !== -1;
                const forAll = textToSearch.indexOf('@[@@@@@@@@]') !== -1;
                return forMe || forAll || quotedMe;
            } else {
                return false;
            }
        } else {
            return true;
        }
    }

    /**
     * Called when a new message arrives.
     */
    private onNewMessage(
        message: threema.Message,
        conversation: threema.Conversation,
        sender: threema.Receiver,
    ): void {
        // Ignore message from active receivers (and if the browser tab is visible)
        if (document.hasFocus()
                && this.receiverService.compare(conversation, this.receiverService.getActive())) {
            return;
        }

        // Do not show any notifications on private chats
        if (sender.locked === true) {
            return;
        }

        // Consider conversation notification settings
        const simplifiedNotification = this.notificationService.getAppNotificationSettings(conversation);
        if (!this.shouldNotify(simplifiedNotification, message)) {
            return;
        }

        // Determine sender and partner name (used for notification)
        let senderName = sender.id;
        if (sender.displayName) {
            senderName = sender.displayName;
        } else if (isContactReceiver(sender)) {
            senderName = '~' + sender.publicNickname;
        }
        const partner = this.receivers.getData({
            id: message.partnerId,
            type: 'contact',
        } as threema.Receiver) as threema.ContactReceiver;
        const partnerName = partner.displayName || ('~' + partner.publicNickname);

        // Show notification
        this.$translate('messenger.MESSAGE_NOTIFICATION_SUBJECT', {messageCount: conversation.unreadCount})
            .then((titlePrefix) =>  {
                const title = `${titlePrefix} ${senderName}`;
                let body = '';
                const messageType = message.type;
                const caption = message.caption;
                let captionString = '';
                if (caption !== undefined) {
                    captionString = captionString + ': ' + caption;
                }
                const messageTypeString = this.$translate.instant('messageTypes.' + messageType);
                switch (messageType as threema.MessageType) {
                    case 'text':
                        body = message.body;
                        break;
                    case 'location':
                        body = messageTypeString + ': ' + message.location.description;
                        break;
                    case 'file':
                        if (message.file.type === 'image/gif') {
                            body = this.$translate.instant('messageTypes.' + 'gif') + captionString;
                            break;
                        }
                        // Display caption, if available otherwise use filename
                        if (captionString.length > 0) {
                            body = messageTypeString + captionString;
                        } else {
                            body = messageTypeString + ': ' + message.file.name;
                        }
                        break;
                    case 'ballot':
                        // TODO Show ballot title if ballot messages are implemented in the web version
                        body = messageTypeString;
                        break;
                    case 'voipStatus':
                        let translationKey: string;
                        switch ((message as threema.Message).voip.status) {
                            case 1:
                                translationKey = 'CALL_MISSED';
                                break;
                            case 2:
                                translationKey = message.isOutbox ? 'CALL_FINISHED_IN' : 'CALL_FINISHED_OUT';
                                break;
                            case 3:
                                translationKey = 'CALL_REJECTED';
                                break;
                            case 4:
                                translationKey = 'CALL_ABORTED';
                                break;
                            default:
                                // No default
                        }

                        if (translationKey !== undefined) {
                            body = this.$translate.instant('voip.' + translationKey);
                        }
                        break;
                    default:
                        // Image, video and audio
                        body = messageTypeString + captionString;
                }
                if (conversation.type === 'group') {
                    body = partnerName + ': ' + body;
                }
                const tag = conversation.type + '-' + conversation.id;
                const avatar = (sender.avatar && sender.avatar.low)
                    ? bufferToUrl(sender.avatar.low, 'image/png', this.arpLog)
                    : null;
                this.notificationService.showNotification(tag, title, body, avatar, () => {
                    this.$state.go('messenger.home.conversation', {
                        type: conversation.type,
                        id: conversation.id,
                        initParams: null,
                    });
                }, undefined, undefined, simplifiedNotification.sound.muted);
            });
    }

    /**
     * If a password has been set, store own private permanent key and public
     * key of the peer in the trusted key store.
     */
    private async _maybeTrustKeys(password: string, isAutoSession: boolean): Promise<boolean> {
        if (hasValue(password) && password.length > 0) {
            await this.trustedKeyStore.storeTrustedKey(
                this.salty.keyStore.secretKeyBytes,
                this.salty.peerPermanentKeyBytes,
                this.pushToken,
                this.pushTokenType,
                password,
                isAutoSession,
            );
            this.log.info('Stored trusted key');
            return true;
        }
        return false;
    }

    public updatePushToken(token: string, tokenType: threema.PushTokenType): void {
        this.pushToken = token;
        this.pushTokenType = tokenType;
    }

    private sendRequestWireMessage(
        subType: string,
        retransmit: boolean,
        args?: object,
        data?: any,
        id?: string,
    ): Promise<any> {
        return this.sendWireMessage(WebClientService.TYPE_REQUEST, subType, retransmit, args, data, id);
    }

    private sendUpdateWireMessage(
        subType: string,
        retransmit: boolean,
        args?: object,
        data?: any,
        id?: string,
    ): Promise<any> {
        return this.sendWireMessage(WebClientService.TYPE_UPDATE, subType, retransmit, args, data, id);
    }

    private sendCreateWireMessage(
        subType: string,
        retransmit: boolean,
        args?: object,
        data?: any,
        id?: string,
    ): Promise<any> {
        return this.sendWireMessage(WebClientService.TYPE_CREATE, subType, retransmit, args, data, id);
    }

    private sendDeleteWireMessage(
        subType: string,
        retransmit: boolean,
        args?: object,
        data?: any,
        id?: string,
    ): Promise<any> {
        return this.sendWireMessage(WebClientService.TYPE_DELETE, subType, retransmit, args, data, id);
    }

    private createRandomWireMessageId() {
        let id;
        do {
            id = randomString(6);
        } while (this.wireMessageFutures.has(id));
        return id;
    }

    private sendWireMessage(
        type: string,
        subType: string,
        retransmit: boolean,
        args?: object,
        data?: any,
        id?: string,
    ): Promise<any> {
        const message: threema.WireMessage = {
            type: type,
            subType: subType,
        };

        // Create a promise with a random ID (if retransmitting)
        // Note: We do this in order to keep track of which messages the app
        //       has processed (NOT only received). A message that has not been
        //       processed yet is an indicator to wake the app up again after a
        //       connection loss.
        let promise: Promise<any>;
        if (retransmit) {
            // Ensure ID uniqueness (if supplied) or create random ID
            if (id === undefined) {
                id = this.createRandomWireMessageId();
            } else if (this.wireMessageFutures.has(id))  {
                throw new Error('Duplicate id for wire message detected');
            }
            message.id = id;

            // TODO: Remove when removing temporaryId backwards compatibility
            // Set temporary ID
            if (args === undefined) {
                args = {};
            }
            args[WebClientService.ARGUMENT_TEMPORARY_ID] = message.id;

            // Create & store future
            const future: Future<any> = new Future();
            this.arpLogV.debug(`Added wire message future: ${id} -> ${type}/${subType}`);
            this.wireMessageFutures.set(message.id, future);
            promise = future;
        } else {
            promise = Promise.resolve({
                id: '',
                success: true,
            });
        }

        // Set args and data (if any)
        if (args !== undefined) {
            message.args = args;
        }
        if (data !== undefined) {
            message.data = data;
        }

        // Send message & return promise (or undefined)
        this.send(message, retransmit);
        return promise;
    }

    private static validateWireMessageAcknowledgement(ack: threema.WireMessageAcknowledgement): void {
        if (!hasValue(ack.id)) {
            throw new Error("Invalid wire message acknowledgement: 'id' is missing");
        }
        if (!hasValue(ack.success)) {
            throw new Error("Invalid wire message acknowledgement: 'success' is missing");
        }
        switch (ack.success) {
            case true:
                break;
            case false:
                if (!hasValue(ack.error)) {
                    throw new Error("Invalid wire message acknowledgement: 'error' is missing");
                }
                break;
            default:
                throw new Error("Invalid wire message acknowledgement: 'success' is not a boolean");
        }
    }

    /**
     * Find and return the wire message future corresponding to the message.
     *
     * This will automatically validate that the 'ack' field of the message is
     * correct. Also, note that the future will be removed from the map of
     * pending wire message futures.
     *
     * @param message The message that (may) contain an acknowledgement.
     * @param optional If set to `true`, no error will be thrown if the message
     *   did not contain an acknowledgement.
     *
     * Throws an exception in case the acknowledgement field is invalid.
     * Throws an exception in case the wire message does not contain an
     *   acknowledgement and the acknowledgement is not optional.
     * Throws an exception if no future could be found.
     *
     * In any exception case, if the associated future could be found, it will
     *   be rejected with 'invalidResponse' before the exception is being
     *   thrown. The case of 'ack.success == false' does NOT count as an
     *   exception case.
     */
    private popWireMessageFuture(message: threema.WireMessage, optional = false): Future<any> {
        // Transfer old temporaryId-related fields into new 'ack' field.
        // TODO: Remove when removing temporaryId backwards compatibility
        if (message.ack === undefined &&
            message.args !== undefined &&
            message.args[WebClientService.ARGUMENT_TEMPORARY_ID] !== undefined
        ) {
            // Not all messages with 'temporaryId' had a 'success' field, so
            // we need to patch it.
            if (message.args[WebClientService.ARGUMENT_SUCCESS] === undefined) {
                message.args[WebClientService.ARGUMENT_SUCCESS] = true;
            }
            message.ack = {
                id: message.args[WebClientService.ARGUMENT_TEMPORARY_ID],
                success: message.args[WebClientService.ARGUMENT_SUCCESS],
                error: message.args[WebClientService.ARGUMENT_ERROR],
            };
        }

        // Validate message
        let error: Error;
        if (hasValue(message.ack)) {
            try {
                WebClientService.validateWireMessageAcknowledgement(message.ack);
            } catch (e) {
                error = e;
            }
        } else if (!optional) {
            throw new Error('Wire message did not contain an acknowledgement');
        } else {
            // Nit: We could use a fake future here for performance
            return new Future();
        }
        const id = message.ack.id;

        // Get associated future
        const future = this.wireMessageFutures.get(id);
        if (future !== undefined) {
            // Remove the future from the map
            this.wireMessageFutures.delete(id);
            this.arpLogV.debug(`Removed wire message future: ${id} -> ` +
                `${message.type}/${message.subType}`);
        } else if (error === undefined) {
            error = new Error(`Wire message future not found for id: ${id}`);
        }

        // Handle error (reject future and throw)
        if (error !== undefined) {
            if (future !== undefined) {
                future.reject('invalidResponse');
            }
            throw error;
        }

        // Done
        return future;
    }

    private _receiveRequest(type: string, message: threema.WireMessage): void {
        switch (type) {
            case WebClientService.SUB_TYPE_CONNECTION_ACK:
                this._receiveRequestConnectionAck(message);
                break;
            default:
                this.arpLog.warn(`Ignored request/${type}`);
                break;
        }
    }

    private _receiveResponse(type: string, message: threema.WireMessage): void {
        switch (type) {
            case WebClientService.SUB_TYPE_CONFIRM_ACTION:
                this._receiveResponseConfirmAction(message);
                break;
            case WebClientService.SUB_TYPE_RECEIVERS:
                this._receiveResponseReceivers(message);
                break;
            case WebClientService.SUB_TYPE_CONVERSATIONS:
                this._receiveResponseConversations(message);
                break;
            case WebClientService.SUB_TYPE_MESSAGES:
                this._receiveResponseMessages(message);
                break;
            case WebClientService.SUB_TYPE_AVATAR:
                this._receiveResponseAvatar(message);
                break;
            case WebClientService.SUB_TYPE_THUMBNAIL:
                this._receiveResponseThumbnail(message);
                break;
            case WebClientService.SUB_TYPE_BLOB:
                this._receiveResponseBlob(message);
                break;
            case WebClientService.SUB_TYPE_CLIENT_INFO:
                this._receiveResponseClientInfo(message);
                break;
            case WebClientService.SUB_TYPE_PROFILE:
                this._receiveResponseProfile(message);
                break;
            case WebClientService.SUB_TYPE_CONTACT_DETAIL:
                this._receiveResponseContactDetail(message);
                break;
            default:
                this.arpLog.warn(`Ignored response/${type}`);
                break;
        }
    }

    private _receiveUpdate(type: string, message: threema.WireMessage): void {
        switch (type) {
            case WebClientService.SUB_TYPE_CONFIRM:
                this._receiveUpdateConfirm(message);
                break;
            case WebClientService.SUB_TYPE_RECEIVER:
                this._receiveUpdateReceiver(message);
                break;
            case WebClientService.SUB_TYPE_RECEIVERS:
                this._receiveUpdateReceivers(message);
                break;
            case WebClientService.SUB_TYPE_MESSAGES:
                this._receiveUpdateMessages(message);
                break;
            case WebClientService.SUB_TYPE_TYPING:
                this._receiveUpdateTyping(message);
                break;
            case WebClientService.SUB_TYPE_CONVERSATION:
                this._receiveUpdateConversation(message);
                break;
            case WebClientService.SUB_TYPE_AVATAR:
                this._receiveUpdateAvatar(message);
                break;
            case WebClientService.SUB_TYPE_BATTERY_STATUS:
                this._receiveUpdateBatteryStatus(message);
                break;
            case WebClientService.SUB_TYPE_CONTACT:
                this._receiveUpdateContact(message);
                break;
            case WebClientService.SUB_TYPE_GROUP:
                this._receiveUpdateGroup(message);
                break;
            case WebClientService.SUB_TYPE_DISTRIBUTION_LIST:
                this._receiveUpdateDistributionList(message);
                break;
            case WebClientService.SUB_TYPE_PROFILE:
                this._receiveUpdateProfile(message);
                break;
            case WebClientService.SUB_TYPE_ALERT:
                this._receiveUpdateAlert(message);
                break;
            case WebClientService.SUB_TYPE_CONNECTION_ACK:
                this._receiveUpdateConnectionAck(message);
                break;
            case WebClientService.SUB_TYPE_CONNECTION_DISCONNECT:
                this._receiveUpdateConnectionDisconnect(message);
                break;
            default:
                this.arpLog.warn(`Ignored update/${type}`);
                break;
        }
    }

    private _receiveCreate(type: string, message: threema.WireMessage): void {
        switch (type) {
            case WebClientService.SUB_TYPE_CONTACT:
                this._receiveCreateContact(message);
                break;
            case WebClientService.SUB_TYPE_GROUP:
                this._receiveCreateGroup(message);
                break;
            case WebClientService.SUB_TYPE_DISTRIBUTION_LIST:
                this._receiveCreateDistributionList(message);
                break;
            case WebClientService.SUB_TYPE_TEXT_MESSAGE: // fallthrough
            case WebClientService.SUB_TYPE_FILE_MESSAGE:
                this._receiveCreateMessage(message);
                break;
            default:
                this.arpLog.warn(`Ignored response/${type}`);
                break;
        }
    }

    /**
     * Encode an object using the msgpack format.
     */
    private msgpackEncode(data: any): Uint8Array {
        return msgpack.encode(data, this.msgpackEncoderOptions);
    }

    /**
     * Decode an object using the msgpack format.
     */
    private msgpackDecode(bytes: Uint8Array): any {
        return msgpack.decode(bytes, this.msgpackDecoderOptions);
    }

    /**
     * Send a message via the underlying transport.
     */
    private send(message: threema.WireMessage, retransmit: boolean): void {
        this.arpLog.debug('Sending', message.type + '/' + message.subType, 'message');
        if (this.userConfig.ARP_LOG_TRACE) {
            // Sanitise outgoing message before logging
            this.arpLogV.debug('Outgoing:', message.type, '/', message.subType, new ConfidentialWireMessage(message));
        }

        // TODO: Fix chosenTask may be different between connections in the
        //       future. Do not rely on it when sending while not being
        //       connected.
        switch (this.chosenTask) {
            case threema.ChosenTask.WebRTC:
                {
                    // Send bytes through WebRTC DataChannel
                    const bytes: Uint8Array = this.msgpackEncode(message);
                    if (this.userConfig.MSGPACK_LOG_TRACE) {
                        this.msgpackLog.debug('Outgoing message payload: ' + msgpackVisualizer(bytes));
                    }
                    const box = this.secureDataChannelCrypto.encrypt(bytes);
                    const chunker = new chunkedDc.UnreliableUnorderedChunker(
                        this.secureDataChannelMessageId++, box.toUint8Array(), this.secureDataChannelChunkLength);
                    for (const chunk of chunker) {
                        this.arpLogV.debug(`Data channel ${this.secureDataChannel.dc.label} outgoing ` +
                            `chunk of length ${chunk.byteLength}`);
                        this.secureDataChannel.write(chunk);
                    }
                }
                break;
            case threema.ChosenTask.RelayedData:
                {
                    // Don't queue handshake messages
                    // TODO: Add this as a method argument
                    const canQueue = message.subType !== WebClientService.SUB_TYPE_CONNECTION_INFO;

                    // Send bytes through e2e encrypted WebSocket
                    const bytes: Uint8Array = this.msgpackEncode(message);
                    if (this.userConfig.MSGPACK_LOG_TRACE) {
                        this.msgpackLog.debug('Outgoing message payload: ' + msgpackVisualizer(bytes));
                    }

                    // Increment the outgoing message sequence number
                    const messageSequenceNumber = this.outgoingMessageSequenceNumber.increment();
                    const chunker = new chunkedDc.UnreliableUnorderedChunker(
                        messageSequenceNumber, bytes, WebClientService.RELAYED_DATA_CHUNK_SIZE);
                    for (const chunk of chunker) {
                        // Send (and cache)
                        this.sendChunk(chunk, retransmit, canQueue, true);
                    }

                    // Check if we need to request an acknowledgement
                    // Note: We only request if none is pending.
                    if (this.pendingAckRequest === null &&
                        this.currentChunkCache.byteLength > WebClientService.CHUNK_CACHE_SIZE_MAX) {
                        // Warning: This field MUST be set before requesting the
                        //          connection ack or you will end up with an
                        //          infinite recursion.
                        this.pendingAckRequest = this.currentChunkCache.sequenceNumber.get();
                        this._requestConnectionAck();
                    }
                }
                break;
            default:
                this.arpLog.error('Trying to send message, but no chosen task set');
        }
    }

    /**
     * Send a chunk via the underlying transport.
     */
    private sendChunk(chunk: Uint8Array, retransmit: boolean, canQueue: boolean, cache: boolean): void {
        // TODO: Support for sending in chunks via data channels will be added later
        if (this.chosenTask !== threema.ChosenTask.RelayedData) {
            throw new Error(`Cannot send chunk, not supported by task: ${this.chosenTask}`);
        }
        const shouldQueue = canQueue && this.previousChunkCache !== null;
        let chunkCache: ChunkCache;

        // Enqueue in the chunk cache that is pending to be transferred and
        // send a wakeup push.
        if (shouldQueue) {
            chunkCache = this.previousChunkCache;
            this.arpLog.debug('Currently not connected, queueing chunk');
            if (!this.pushService.isAvailable()) {
                this.log.warn('Push service not available, cannot wake up peer!');
                retransmit = false;
            }
            if (retransmit) {
                // TODO: Apply the chunk **push** blacklist instead of the
                //       retransmit flag!
                this.sendPush();
            }
        } else {
            chunkCache = this.currentChunkCache;
        }

        // Add to chunk cache
        if (cache) {
            this.arpLogV.debug(`Caching chunk (retransmit/push=${retransmit}:`, chunk);
            try {
                chunkCache.append(retransmit ? chunk : null);
            } catch (error) {
                this.arpLog.error(error);
                this.failSession();
                return;
            }
        }

        // Send if ready
        if (!shouldQueue) {
            this.arpLogV.debug(`Sending chunk (retransmit/push=${retransmit}:`, chunk);

            // Send chunk
            this.relayedDataTask.sendMessage(chunk.buffer);

            // Send a push if no incoming chunks within the next two seconds.
            // Note: This has a cooldown phase of 10 seconds.
            if (retransmit && this.startupDone) {
                this.schedulePush();
            }
        }
    }

    /**
     * Handle an incoming chunk from the underlying transport.
     */
    private receiveChunk(chunk: Uint8Array): void {
        this.arpLogV.debug('Received chunk:', chunk);

        // Update incoming sequence number
        try {
            this.currentIncomingChunkSequenceNumber.increment();
        } catch (error) {
            this.arpLog.error(`Unable to continue session: ${error}`);
            this.failSession();
            return;
        }

        // Schedule the periodic ack timer
        this.scheduleConnectionAck();

        // Cancel scheduled push since data has been received
        this.cancelPush();

        // Process chunk
        // Warning: Nothing should be called after the unchunker has processed
        //          the chunk since the message event is synchronous and can
        //          result in a call to .stop!
        this.unchunker.add(chunk);
    }

    /**
     * Handle incoming message bytes from the SecureDataChannel.
     */
    private handleIncomingMessageBytes(bytes: Uint8Array): void {
        this.arpLog.debug('New incoming message (' + bytes.byteLength + ' bytes)');
        if (this.userConfig.MSGPACK_LOG_TRACE) {
            this.msgpackLog.debug('Incoming message payload: ' + msgpackVisualizer(bytes));
        }

        // Decode bytes
        const message: threema.WireMessage = this.msgpackDecode(bytes);
        return this.handleIncomingMessage(message);
    }

    /**
     * Handle incoming incoming from the SecureDataChannel
     * or from the relayed data WebSocket.
     */
    private handleIncomingMessage(message: threema.WireMessage): void {
        this.arpLog.debug(`Received ${message.type}/${message.subType} message`);

        // Validate message to keep contract defined by `threema.WireMessage` type
        if (message.type === undefined) {
            this.arpLog.warn('Ignoring invalid message (no type attribute)');
            return;
        } else if (message.subType === undefined) {
            this.arpLog.warn('Ignoring invalid message (no subType attribute)');
            return;
        }

        // If desired, log message type / subtype
        if (this.userConfig.ARP_LOG_TRACE) {
            // Sanitise incoming message before logging
            // Note: Deep-copy message to prevent issues with JS debugger
            this.arpLogV.debug(`Incoming: ${message.type}/${message.subType}`,
                new ConfidentialWireMessage(copyDeepOrReference(message)));
        }

        // Process data
        this.$rootScope.$apply(() => {
            this.receive(message);
        });
    }

    /**
     * Receive a new incoming decrypted message.
     * This method runs inside the digest loop.
     */
    private receive(message: threema.WireMessage): void {
        // Intercept handshake message
        if (!this.connectionInfoFuture.done) {
            // Check for unexpected messages
            if (message.type !== WebClientService.TYPE_UPDATE ||
                message.subType !== WebClientService.SUB_TYPE_CONNECTION_INFO) {
                this.arpLog.error('Unexpected message before handshake has been completed');
                this.failSession();
                return;
            }

            // Dispatch and return
            this._receiveConnectionInfo(message);
            return;
        }

        // Determine message handler
        let messageHandler: (type, message) => void;
        switch (message.type) {
            case WebClientService.TYPE_REQUEST:
                messageHandler = this._receiveRequest;
                break;
            case WebClientService.TYPE_RESPONSE:
                messageHandler = this._receiveResponse;
                break;
            case WebClientService.TYPE_CREATE:
                messageHandler = this._receiveCreate;
                break;
            case WebClientService.TYPE_UPDATE:
                messageHandler = this._receiveUpdate;
                break;
            default:
                this.arpLog.warn(`Ignored message ${message.type}/${message.subType}`);
                break;
        }

        // Dispatch message
        if (messageHandler !== undefined) {
            try {
                messageHandler.apply(this, [message.subType, message]);
            } catch (error) {
                this.arpLog.error('Unable to handle incoming wire message:', error);
                console.trace(error); // tslint:disable-line:no-console
                return;
            }
        }

        // Catch unhandled wire message acknowledgements
        // Nit: We could cache that we have already scraped the message for a
        //      wire message acknowledgement instead of double-parsing.
        let future: Future<any>;
        try {
            future = this.popWireMessageFuture(message);
        } catch {
            // Yes, I really know what I'm doing, thanks eslint...
        }
        if (future !== undefined) {
            this.arpLog.warn(`Unhandled message acknowledgement for type ${message.type}:`, message.ack);
            future.reject('unhandled');
        }
    }

    private runAfterInitializationSteps(requiredSteps: threema.InitializationStep[], callback: any): void {
        for (const requiredStep of requiredSteps) {
            if (!this.initialized.has(requiredStep)) {
                this.arpLog.debug('Required initialization step', requiredStep, 'not completed, add pending routine');
                this.pendingInitializationStepRoutines.add({
                    requiredSteps: requiredSteps,
                    callback: callback,
                } as threema.InitializationStepRoutine);
                return;
            }
        }
        callback.apply(this);
    }

    /**
     * Update the unread count in the window title.
     */
    private updateUnreadCount(): void {
        const totalUnreadCount = this.conversations
            .get()
            .reduce((a: number, b: threema.Conversation) => a + b.unreadCount, 0);
        this.stateService.unreadCount = totalUnreadCount;
    }

    /**
     * Return the configuration object from the client info data.
     */
    public get appConfig(): threema.AppConfig {
        return this.clientInfo.configuration;
    }

    /**
     * Return the capabilities object from the client info data.
     */
    public get appCapabilities(): threema.AppCapabilities {
        return this.clientInfo.capabilities;
    }

    /**
     * Sort a list of contacts in-place.
     */
    private sortContacts(contacts: threema.ContactReceiver[]): void {
        const getSortableName = (name: string) => name.startsWith('~') ? name.substr(1) : name;

        let options;
        if (this.browserService.supportsExtendedLocaleCompare()) {
            options = {
                usage: 'sort',
                sensitivity: 'variant',
            };
        }

        const compareFunc = (a: threema.Receiver, b: threema.Receiver) => {
            if (a.id.startsWith('*') && !b.id.startsWith('*')) { return 1; }
            if (!a.id.startsWith('*') && b.id.startsWith('*')) { return -1; }
            const left = getSortableName(a.displayName);
            const right = getSortableName(b.displayName);
            return left.localeCompare(right, undefined, options);
        };
        contacts.sort(compareFunc);
    }

    /**
     * Clear all "is typing" flags.
     */
    public clearIsTypingFlags(): void {
        this.typing.clearAll();
    }

    private handleGlobalConnectionStateChange(stateChange: threema.GlobalConnectionStateChange): void {
        const isOk = stateChange.state === threema.GlobalConnectionState.Ok;
        const wasOk = stateChange.prevState === threema.GlobalConnectionState.Ok;
        if (!isOk && wasOk && this.batteryStatusService.dataAvailable) {
            this.batteryStatusTimeout = this.timeoutService.register(
                () => {
                    this.batteryStatusService.clearStatus();
                    this.batteryStatusTimeout = null;
                },
                60000,
                true,
                'batteryStatusHide',
            );
        } else if (isOk && this.batteryStatusTimeout !== null) {
            this.timeoutService.cancel(this.batteryStatusTimeout);
            this.batteryStatusTimeout = null;
        }
    }

    /**
     * Log chat message's metadata for debugging purposes.
     */
    private logChatMessages(
        type: string, subType: string, receiverType: string, receiver: string, mode: string,
        messages: threema.Message[],
    ) {
        for (const message of messages) {
            let id: string = message.id;
            if (this.clientInfo.os === threema.OperatingSystem.Ios) {
                try {
                    id = u8aToHex(base64ToU8a(message.id));
                } catch { /* ignored */ }
            }
            this.arpLogV.debug('Chat message:', `${type}/${subType}: receiver=${receiverType}/${receiver}, ` +
                `mode=${mode}, direction=${message.isOutbox ? 'out' : 'in'}, id=${id}, type=${message.type}, ` +
                `state=${message.state !== undefined ? message.state : '?'}, is-status=${message.isStatus}, ` +
                `date=${message.date}`);
        }
    }

    /**
     * Return true if the push token is an APNs non-VoIP push token.
     */
    public hasAppleNonVoipPushToken(): boolean {
        return this.pushTokenType === threema.PushTokenType.Apns
            && this.pushToken !== null
            && !this.pushToken.endsWith('.voip');
    }
}
