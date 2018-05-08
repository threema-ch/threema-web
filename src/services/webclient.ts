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

/// <reference types="@saltyrtc/task-webrtc" />
/// <reference types="@saltyrtc/task-relayed-data" />

import * as msgpack from 'msgpack-lite';
import {hasFeature, hexToU8a, msgpackVisualizer} from '../helpers';
import {isContactReceiver, isDistributionListReceiver, isGroupReceiver} from '../typeguards';
import {BatteryStatusService} from './battery';
import {BrowserService} from './browser';
import {TrustedKeyStoreService} from './keystore';
import {MessageService} from './message';
import {MimeService} from './mime';
import {NotificationService} from './notification';
import {PeerConnectionHelper} from './peerconnection';
import {PushService} from './push';
import {QrCodeService} from './qrcode';
import {ReceiverService} from './receiver';
import {StateService} from './state';
import {TitleService} from './title';
import {VersionService} from './version';

// Aliases
import InitializationStep = threema.InitializationStep;
import ContactReceiverFeature = threema.ContactReceiverFeature;

/**
 * This service handles everything related to the communication with the peer.
 */
export class WebClientService {
    private static AVATAR_LOW_MAX_SIZE = 48;
    private static MAX_TEXT_LENGTH = 3500;
    private static MAX_FILE_SIZE = 15 * 1024 * 1024;

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
    private static SUB_TYPE_CONFIRM_ACTION = 'confirmAction';
    private static SUB_TYPE_PROFILE = 'profile';
    private static ARGUMENT_MODE = 'mode';
    private static ARGUMENT_MODE_NEW = 'new';
    private static ARGUMENT_MODE_MODIFIED = 'modified';
    private static ARGUMENT_MODE_REMOVED = 'removed';
    private static ARGUMENT_RECEIVER_TYPE = 'type';
    private static ARGUMENT_RECEIVER_ID = 'id';
    private static ARGUMENT_TEMPORARY_ID = 'temporaryId';
    private static ARGUMENT_REFERENCE_MSG_ID = 'refMsgId';
    private static ARGUMENT_AVATAR = 'avatar';
    private static ARGUMENT_AVATAR_HIGH_RESOLUTION = 'highResolution';
    private static ARGUMENT_NICKNAME = 'nickname';
    private static ARGUMENT_IS_TYPING = 'isTyping';
    private static ARGUMENT_MESSAGE_ID = 'messageId';
    private static ARGUMENT_HAS_MORE = 'more';
    private static ARGUMENT_MESSAGE_ACKNOWLEDGED = 'acknowledged';
    private static ARGUMENT_IDENTITY = 'identity';
    private static ARGUMENT_SUCCESS = 'success';
    private static ARGUMENT_MESSAGE = 'message';
    private static ARGUMENT_SYSTEM_CONTACT = 'systemContact';
    private static ARGUMENT_NAME = 'name';
    private static ARGUMENT_MEMBERS = 'members';
    private static ARGUMENT_FIRST_NAME = 'firstName';
    private static ARGUMENT_LAST_NAME = 'lastName';
    private static ARGUMENT_DELETE_TYPE = 'deleteType';
    private static ARGUMENT_ERROR = 'error';
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

    private logTag: string = '[WebClientService]';

    // Angular services
    private $state: ng.ui.IStateService;
    private $log: ng.ILogService;
    private $rootScope: any;
    private $q: ng.IQService;
    private $window: ng.IWindowService;
    private $translate: ng.translate.ITranslateService;
    private $filter: any;
    private $timeout: ng.ITimeoutService;

    // Custom services
    private batteryStatusService: BatteryStatusService;
    private browserService: BrowserService;
    private messageService: MessageService;
    private mimeService: MimeService;
    private notificationService: NotificationService;
    private pushService: PushService;
    private qrCodeService: QrCodeService;
    private receiverService: ReceiverService;
    private titleService: TitleService;
    private versionService: VersionService;

    // State handling
    private startupPromise: ng.IDeferred<{}> = null; // TODO: deferred type
    private startupDone: boolean = false;
    private pendingInitializationStepRoutines: threema.InitializationStepRoutine[] = [];
    private initialized: Set<threema.InitializationStep> = new Set();
    private stateService: StateService;
    private lastPush: Date = null;

    // SaltyRTC
    private saltyRtcHost: string = null;
    public salty: saltyrtc.SaltyRTC = null;
    private webrtcTask: saltyrtc.tasks.webrtc.WebRTCTask = null;
    private relayedDataTask: saltyrtc.tasks.relayed_data.RelayedDataTask = null;
    private secureDataChannel: saltyrtc.tasks.webrtc.SecureDataChannel = null;
    public chosenTask: threema.ChosenTask = threema.ChosenTask.None;

    // Messenger data
    public messages: threema.Container.Messages;
    public conversations: threema.Container.Conversations;
    public receivers: threema.Container.Receivers;
    public alerts: threema.Alert[] = [];
    private pushToken: string = null;
    private pushTokenType: threema.PushTokenType = null;

    // Pending messages when waiting for a responder to connect
    private outgoingMessageQueue: threema.WireMessage[] = [];

    // Other
    private config: threema.Config;
    private container: threema.Container.Factory;
    private typingInstance: threema.Container.Typing;
    private drafts: threema.Container.Drafts;
    private pcHelper: PeerConnectionHelper = null;
    private clientInfo: threema.ClientInfo;
    private trustedKeyStore: TrustedKeyStoreService;
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

    // pending rtc promises
    private requestPromises: Map<string, threema.PromiseCallbacks> = new Map();

    public static $inject = [
        '$log', '$rootScope', '$q', '$state', '$window', '$translate', '$filter', '$timeout',
        'Container', 'TrustedKeyStore',
        'StateService', 'NotificationService', 'MessageService', 'PushService', 'BrowserService',
        'TitleService', 'QrCodeService', 'MimeService', 'ReceiverService',
        'VersionService', 'BatteryStatusService',
        'CONFIG',
    ];
    constructor($log: ng.ILogService,
                $rootScope: any,
                $q: ng.IQService,
                $state: ng.ui.IStateService,
                $window: ng.IWindowService,
                $translate: ng.translate.ITranslateService,
                $filter: ng.IFilterService,
                $timeout: ng.ITimeoutService,
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
                versionService: VersionService,
                batteryStatusService: BatteryStatusService,
                CONFIG: threema.Config) {

        // Angular services
        this.$log = $log;
        this.$rootScope = $rootScope;
        this.$q = $q;
        this.$state = $state;
        this.$window = $window;
        this.$translate = $translate;
        this.$filter = $filter;
        this.$timeout = $timeout;

        // Own services
        this.batteryStatusService = batteryStatusService;
        this.browserService = browserService;
        this.messageService = messageService;
        this.mimeService = mimeService;
        this.notificationService = notificationService;
        this.pushService = pushService;
        this.qrCodeService = qrCodeService;
        this.receiverService = receiverService;
        this.titleService = titleService;
        this.versionService = versionService;

        // Configuration object
        this.config = CONFIG;

        // State
        this.stateService = stateService;

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
     * Return QR code payload.
     */
    public buildQrCodePayload(persistent: boolean): string {
        return this.qrCodeService.buildQrCodePayload(
            this.salty.permanentKeyBytes,
            this.salty.authTokenBytes,
            hexToU8a(this.config.SALTYRTC_SERVER_KEY),
            this.saltyRtcHost, this.config.SALTYRTC_PORT,
            persistent);
    }

    /**
     * Initialize the webclient service.
     */
    public init(keyStore?: saltyrtc.KeyStore, peerTrustedKey?: Uint8Array, resetFields = true): void {
        // Reset state
        this.stateService.reset();

        // Create WebRTC task instance
        const maxPacketSize = this.browserService.getBrowser().firefox ? 16384 : 65536;
        this.webrtcTask = new saltyrtcTaskWebrtc.WebRTCTask(true, maxPacketSize);

        // Create Relayed Data task instance
        this.relayedDataTask = new saltyrtcTaskRelayedData.RelayedDataTask(this.config.DEBUG);

        // Create new keystore if necessary
        if (!keyStore) {
            keyStore = new saltyrtcClient.KeyStore();
        }

        // Determine SaltyRTC host
        if (this.config.SALTYRTC_HOST !== null) {
            // Static URL
            this.saltyRtcHost = this.config.SALTYRTC_HOST;
        } else {
            // Construct URL using prefix and suffix
            this.saltyRtcHost = this.config.SALTYRTC_HOST_PREFIX
                + keyStore.publicKeyHex.substr(0, 2)
                + this.config.SALTYRTC_HOST_SUFFIX;
        }

        // Create SaltyRTC client
        let builder = new saltyrtcClient.SaltyRTCBuilder()
            .connectTo(this.saltyRtcHost, this.config.SALTYRTC_PORT)
            .withServerKey(this.config.SALTYRTC_SERVER_KEY)
            .withKeyStore(keyStore)
            .usingTasks([this.webrtcTask, this.relayedDataTask])
            .withPingInterval(30);
        if (keyStore !== undefined && peerTrustedKey !== undefined) {
            builder = builder.withTrustedPeerKey(peerTrustedKey);
        }
        this.salty = builder.asInitiator();

        if (this.config.DEBUG) {
            this.$log.debug('Public key:', this.salty.permanentKeyHex);
            this.$log.debug('Auth token:', this.salty.authTokenHex);
        }

        // We want to know about new responders.
        this.salty.on('new-responder', () => {
            if (!this.startupDone) {
                // Peer handshake
                this.stateService.updateConnectionBuildupState('peer_handshake');
            }
        });

        // We want to know about state changes
        this.salty.on('state-change', (ev: saltyrtc.SaltyRTCEvent) => {
            // Wrap this in a $timeout to execute at the end of the event loop.
            this.$timeout(() => {
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
                            // Do nothing, state will be updated once SecureDataChannel is open
                            break;
                        case 'closing':
                        case 'closed':
                            this.stateService.updateConnectionBuildupState('closed');
                            break;
                        default:
                            this.$log.warn(this.logTag, 'Unknown signaling state:', state);
                    }
                }
                this.stateService.updateSignalingConnectionState(state, this.chosenTask);
            }, 0);
        });

        // Once the connection is established, if this is a WebRTC connection,
        // initiate the peer connection and start the handover.
        this.salty.once('state-change:task', () => {

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

                // Firefox <53 does not yet support TLS. Skip it, to save allocations.
                if (browser.firefox && browser.version && browser.version < 53) {
                    this.skipIceTls();
                }

                // Safari does not support our dual-stack TURN servers.
                if (browser.safari) {
                    this.skipIceDs();
                }

                this.pcHelper = new PeerConnectionHelper(this.$log, this.$q, this.$timeout,
                    this.$rootScope, this.webrtcTask,
                    this.config.ICE_SERVERS,
                    !this.config.ICE_DEBUGGING);

                // On state changes in the PeerConnectionHelper class, let state service know about it
                this.pcHelper.onConnectionStateChange = (state: threema.TaskConnectionState) => {
                    this.stateService.updateTaskConnectionState(state);
                };

                // Initiate handover
                this.webrtcTask.handover(this.pcHelper.peerConnection);

            // Otherwise, no handover is necessary.
            } else {
                this.onHandover(resetFields);
                return;
            }
        });

        // Handle a disconnect request
        this.salty.on('application', (applicationData: any) => {
            if (applicationData.data.type === 'disconnect') {
                this.onApplicationDisconnect(applicationData);
            }
        });

        // Handle disconnecting of a peer
        this.salty.on('peer-disconnected', (ev: saltyrtc.SaltyRTCEvent) => {
            this.$rootScope.$apply(() => {
                this.onPeerDisconnected(ev.data);
            });
        });

        // Wait for handover to be finished
        this.salty.on('handover', () => {
            this.$log.debug(this.logTag, 'Handover done');
            this.onHandover(resetFields);
        });

        // Handle SaltyRTC errors
        this.salty.on('connection-error', (ev) => {
            this.$log.error('Connection error:', ev);
        });
        this.salty.on('connection-closed', (ev) => {
            this.$log.warn('Connection closed:', ev);
        });
    }

    /**
     * For the WebRTC task, this is called when the DataChannel is open.
     * For the relayed data task, this is called once the connection is established.
     */
    private onConnectionEstablished(resetFields: boolean) {
        // Reset fields if requested
        if (resetFields) {
            this._resetFields();
        }

        // Determine whether to request initial data
        const requestInitialData: boolean =
            (resetFields === true) ||
            (this.chosenTask === threema.ChosenTask.WebRTC);

        // Only request initial data if this is not a soft reconnect
        let requiredInitializationSteps;
        if (requestInitialData) {
            requiredInitializationSteps = [
                InitializationStep.ClientInfo,
                InitializationStep.Conversations,
                InitializationStep.Receivers,
                InitializationStep.Profile,
            ];
        } else {
            requiredInitializationSteps = [];
        }

        // Resolve startup promise once initialization is done
        if (this.startupPromise !== null) {
            this.runAfterInitializationSteps(requiredInitializationSteps, () => {
                this.stateService.updateConnectionBuildupState('done');
                this.startupPromise.resolve();
                this.startupPromise = null;
                this.startupDone = true;
                this._resetInitializationSteps();
            });
        }

        // Request initial data
        if (requestInitialData) {
            this._requestInitialData();
        }

        // Fetch current version
        // Delay it to prevent the dialog from being closed by the messenger constructor,
        // which closes all open dialogs.
        this.$timeout(() => this.versionService.checkForUpdate(), 7000);

        // Notify state service about data loading
        this.stateService.updateConnectionBuildupState('loading');

        // Process pending messages
        if (this.outgoingMessageQueue.length > 0) {
            this.$log.debug(this.logTag, 'Sending', this.outgoingMessageQueue.length, 'pending messages');
            for (const _ of this.outgoingMessageQueue.keys()) {
                this.send(this.outgoingMessageQueue.pop());
            }
        }
    }

    /**
     * Handover done.
     *
     * This can either be a real handover to WebRTC (Android), or simply
     * when the relayed data task takes over (iOS).
     */
    private onHandover(resetFields: boolean) {
        // Initialize NotificationService
        this.$log.debug(this.logTag, 'Initializing NotificationService...');
        this.notificationService.init();

        // If the WebRTC task was chosen, initialize the data channel
        if (this.chosenTask === threema.ChosenTask.WebRTC) {
            // Create secure data channel
            this.$log.debug(this.logTag, 'Create SecureDataChannel "' + WebClientService.DC_LABEL + '"...');
            this.secureDataChannel = this.pcHelper.createSecureDataChannel(
                WebClientService.DC_LABEL,
                (event: Event) => {
                    this.$log.debug(this.logTag, 'SecureDataChannel open');
                    this.onConnectionEstablished(resetFields);
                },
            );

            // Handle incoming messages
            this.secureDataChannel.onmessage = (ev: MessageEvent) => {
                const bytes = new Uint8Array(ev.data);
                this.handleIncomingMessageBytes(bytes);
            };
            this.secureDataChannel.onbufferedamountlow = (ev: Event) => {
                this.$log.debug('Secure data channel: Buffered amount low');
            };
            this.secureDataChannel.onerror = (e: ErrorEvent) => {
                this.$log.warn('Secure data channel: Error:', e.message);
                this.$log.debug(e);
            };
            this.secureDataChannel.onclose = (ev: Event) => {
                this.$log.warn('Secure data channel: Closed');
            };
        } else if (this.chosenTask === threema.ChosenTask.RelayedData) {
            // Handle messages directly
            this.relayedDataTask.on('data', (ev: saltyrtc.SaltyRTCEvent) => {
                this.handleIncomingMessage(ev.data, true);
            });

            // The communication channel is now open! Fetch initial data
            this.onConnectionEstablished(resetFields);
        }
    }

    /**
     * An 'application' message with type 'disconnect' arrived.
     */
    private onApplicationDisconnect(applicationData: any) {
        this.$log.debug(this.logTag, 'Disconnecting requested');
        const deleteStoredData = applicationData.data.forget === true;
        const resetPush = true;
        const redirect = true;
        this.stop(false, deleteStoredData, resetPush, redirect);
    }

    /**
     * A previously authenticated peer disconnected from the server.
     */
    private onPeerDisconnected(peerId: number) {
        switch (this.chosenTask) {
            case threema.ChosenTask.RelayedData:
                if (this.stateService.taskConnectionState === threema.TaskConnectionState.Connected) {
                    this.stateService.updateTaskConnectionState(threema.TaskConnectionState.Reconnecting);
                } else {
                    this.$log.debug(
                        this.logTag,
                        'Ignoring peer-disconnected event (state is '
                        + this.stateService.taskConnectionState + ')',
                    );
                }
                break;
            default:
                this.$log.debug(
                    this.logTag,
                    'Ignoring peer-disconnected event (chosen task is ' + this.chosenTask + ')',
                );
        }
    }

    /**
     * Send a push message to wake up the peer.
     * The push message will only be sent if the last push is less than 2 seconds ago.
     */
    private sendPush(wakeupType: threema.WakeupType): void {
        // Make sure not to flood the target device with pushes
        const minPushInterval = 2000;
        const now = new Date();
        if (this.lastPush !== null && (now.getTime() - this.lastPush.getTime()) < minPushInterval) {
            this.$log.debug(this.logTag,
                'Skipping push, last push was requested less than ' + (minPushInterval / 1000) + 's ago');
            return;
        }
        this.lastPush = now;

        // Actually send the push notification
        this.pushService.sendPush(this.salty.permanentKeyBytes, wakeupType)
            .catch(() => this.$log.warn(this.logTag, 'Could not notify app!'))
            .then(() => {
                const wakeupTypeString = wakeupType === threema.WakeupType.FullReconnect ? 'reconnect' : 'wakeup';
                this.$log.debug(this.logTag, 'Requested app', wakeupTypeString, 'via', this.pushTokenType, 'push');
                this.$rootScope.$apply(() => {
                    this.stateService.updateConnectionBuildupState('push');
                });
            });
    }

    /**
     * Start the webclient service.
     * Return a promise that resolves once connected.
     */
    public start(skipPush: boolean = false): ng.IPromise<any> {
        this.$log.debug(this.logTag, 'Starting WebClientService...');

        // Promise to track startup state
        this.startupPromise = this.$q.defer();
        this.startupDone = false;

        // Connect
        this.salty.connect();

        // If push service is available, notify app
        if (skipPush === true) {
            this.$log.debug(this.logTag, 'start(): Skipping push notification');
        } else if (this.pushService.isAvailable()) {
            this.sendPush(threema.WakeupType.FullReconnect);
        } else if (this.trustedKeyStore.hasTrustedKey()) {
            this.$log.debug(this.logTag, 'Push service not available');
            this.stateService.updateConnectionBuildupState('manual_start');
        }

        return this.startupPromise.promise;
    }

    /**
     * Stop the webclient service.
     *
     * This is a forced stop, meaning that all channels are closed.
     *
     * Parameters:
     *
     * - `requestedByUs`: Set this to `false` if the app requested to close the session.
     * - `deleteStoredData`: Whether to clear any trusted key or push token from the keystore.
     * - `resetPush`: Whether to reset the push service.
     * - `redirect`: Whether to redirect to the welcome page.
     */
    public stop(requestedByUs: boolean,
                deleteStoredData: boolean = false,
                resetPush: boolean = true,
                redirect: boolean = false): void {
        this.$log.info(this.logTag, 'Disconnecting...');

        if (requestedByUs && this.stateService.state === threema.GlobalConnectionState.Ok) {
            // Ask peer to disconnect too
            this.salty.sendApplicationMessage({type: 'disconnect', forget: deleteStoredData});
        }

        this.stateService.reset();

        // Reset the unread count
        this.resetUnreadCount();

        // Clear stored data (trusted key, push token, etc)
        if (deleteStoredData === true) {
            this.trustedKeyStore.clearTrustedKey();
        }

        // Clear push token
        if (resetPush === true) {
            this.pushService.reset();
        }

        // Close data channel
        if (this.secureDataChannel !== null) {
            this.$log.debug(this.logTag, 'Closing secure datachannel');
            this.secureDataChannel.close();
        }

        // Close SaltyRTC connection
        if (this.salty !== null) {
            this.$log.debug(this.logTag, 'Closing signaling');
            this.salty.disconnect();
        }

        // Function to redirect to welcome screen
        const redirectToWelcome = () => {
            if (redirect === true) {
                this.$timeout(() => {
                    this.$state.go('welcome');
                }, 0);
            }
        };

        // Close peer connection
        if (this.pcHelper !== null) {
            this.$log.debug(this.logTag, 'Closing peer connection');
            this.pcHelper.close()
                .then(
                    () => this.$log.debug(this.logTag, 'Peer connection was closed'),
                    (reason: string) => this.$log.warn(this.logTag, 'Peer connection could not be closed:', reason),
                )
                .finally(() => redirectToWelcome());
        } else {
            this.$log.debug(this.logTag, 'Peer connection was null');
            redirectToWelcome();
        }
    }

    /**
     * Remove "turns:" servers from the ICE_SERVERS configuration
     * if at least one "turn:" server with tcp transport is in the list.
     */
    public skipIceTls(): void {
        this.$log.debug(this.logTag, 'Requested to remove TURNS server from ICE configuration');
        const allUrls = [].concat(...this.config.ICE_SERVERS.map((conf) => conf.urls));
        if (allUrls.some((url) => url.startsWith('turn:') && url.endsWith('=tcp'))) {
            // There's at least one TURN server with TCP transport in the list
            for (const server of this.config.ICE_SERVERS) {
                // Remove TLS entries
                server.urls = server.urls.filter((url) => !url.startsWith('turns:'));
            }
        } else {
            this.$log.debug(this.logTag, 'No fallback TURN TCP server present, keeping TURNS server');
        }
    }

    /**
     * Safari has issues with dual-stack TURN servers:
     * https://bugs.webkit.org/show_bug.cgi?id=173307#c13
     * As a workaround, replace ds-turn.threema.ch servers
     * in the ICE_SERVERS configuration with turn.threema.ch.
     */
    public skipIceDs(): void {
        this.$log.debug(this.logTag, 'Requested to replace DS servers in ICE configuration');
        const allUrls = [].concat(...this.config.ICE_SERVERS.map((conf) => conf.urls));
        if (allUrls.some((url) => url.includes('ds-turn.threema.ch'))) {
            for (const server of this.config.ICE_SERVERS) {
                // Replace dual stack entries
                server.urls = server.urls.map((url) => {
                    return url.replace('ds-turn.threema.ch', 'turn.threema.ch');
                });
            }
        } else {
            this.$log.debug(this.logTag, 'No ds-turn ICE server present');
        }
    }

    /**
     * Mark a component as initialized
     */
    public registerInitializationStep(name: threema.InitializationStep) {
        if (this.initialized.has(name) ) {
            this.$log.warn(this.logTag, 'Initialization step "' + name + '" already registered');
            return;
        }

        this.$log.debug(this.logTag, 'Initialization step "' + name + '" done');
        this.initialized.add(name);

        // Check pending routines
        this.pendingInitializationStepRoutines = this.pendingInitializationStepRoutines.filter((routine) => {
            let isValid = true;
            for (const requiredStep of routine.requiredSteps) {
                if (!this.initialized.has(requiredStep)) {
                    isValid = false;
                    break;
                }
            }
            if (isValid) {
                this.$log.debug(this.logTag, 'Running routine after initialization "' + name + '" completed');
                routine.callback();
            }
            return !isValid;
        });
    }

    public setReceiverListener(listener: threema.ReceiverListener): void {
        this.receiverListener.push(listener);
    }

    /**
     * Send a client info request.
     */
    public requestClientInfo(): void {
        this.$log.debug('Sending client info request');
        const browser = this.browserService.getBrowser();
        const data: object = {
            [WebClientService.ARGUMENT_USER_AGENT]: navigator.userAgent,
        };
        if (browser.name) {
            data[WebClientService.ARGUMENT_BROWSER_NAME] = browser.name;
        }
        if (browser.version) {
            data[WebClientService.ARGUMENT_BROWSER_VERSION] = browser.version;
        }
        this._sendRequest(WebClientService.SUB_TYPE_CLIENT_INFO, undefined, data);
    }

    /**
     * Send a receivers request.
     */
    public requestReceivers(): void {
        this.$log.debug('Sending receivers request');
        this._sendRequest(WebClientService.SUB_TYPE_RECEIVERS);
    }

    /**
     * Send a conversation request.
     */
    public requestConversations(): void {
        this.$log.debug('Sending conversation request');
        this._sendRequest(WebClientService.SUB_TYPE_CONVERSATIONS, {
            [WebClientService.ARGUMENT_MAX_SIZE]: WebClientService.AVATAR_LOW_MAX_SIZE,
        });
    }

    /**
     * Send a battery status request.
     */
    public requestBatteryStatus(): void {
        this.$log.debug('Sending battery status request');
        this._sendRequest(WebClientService.SUB_TYPE_BATTERY_STATUS);
    }

    /**
     * Send a profile request.
     */
    public requestProfile(): void {
        this.$log.debug('Sending profile request');
        this._sendRequest(WebClientService.SUB_TYPE_PROFILE);
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
    public requestMessages(receiver: threema.Receiver): string {
        // If there are no more messages available, stop here.
        if (!this.messages.hasMore(receiver)) {
            this.messages.notify(receiver, this.$rootScope);
            return null;
        }

        this.loadingMessages.set(receiver.type + receiver.id, true);

        // Check if messages have already been requested
        if (this.messages.isRequested(receiver)) {
            return null;
        }

        // Get the reference msg id
        const refMsgId = this.messages.getReferenceMsgId(receiver);

        // Set requested
        // TODO: Add timeout to reset flag
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
        this.$log.debug('Sending message request for', receiver.type, receiver.id,
            'with message id', msgId);

        this._sendRequest(WebClientService.SUB_TYPE_MESSAGES, args);

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

        // Create arguments and send request
        const args = {
            [WebClientService.ARGUMENT_RECEIVER_TYPE]: receiver.type,
            [WebClientService.ARGUMENT_RECEIVER_ID]: receiver.id,
            [WebClientService.ARGUMENT_AVATAR_HIGH_RESOLUTION]: highResolution,
        } as any;

        if (!highResolution) {
           args[WebClientService.ARGUMENT_MAX_SIZE] = WebClientService.AVATAR_LOW_MAX_SIZE;
        }

        this.$log.debug('Sending', resolution, 'res avatar request for', receiver.type, receiver.id);
        return this._sendRequestPromise(WebClientService.SUB_TYPE_AVATAR, args, 10000);
    }

    /**
     * Send an thumbnail request for the specified receiver.
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

        this.$log.debug('Sending', 'thumbnail request for', receiver.type, message.id);
        return this._sendRequestPromise(WebClientService.SUB_TYPE_THUMBNAIL, args, 10000);
    }

    /**
     * Request a blob.
     */
    public requestBlob(msgId: string, receiver: threema.Receiver): Promise<threema.BlobInfo> {
        const cached = this.blobCache.get(msgId + receiver.type);

        if (cached !== undefined) {

            this.$log.debug('Use cached blob');
            return new Promise((resolve) => {
                resolve(cached);
            });
        }
        const args = {
            [WebClientService.ARGUMENT_RECEIVER_TYPE]: receiver.type,
            [WebClientService.ARGUMENT_RECEIVER_ID]: receiver.id,
            [WebClientService.ARGUMENT_MESSAGE_ID]: msgId,
        };
        this.$log.debug('Sending blob request for message', msgId);
        return this._sendRequestPromise(WebClientService.SUB_TYPE_BLOB, args);
    }

    /**
     * Mark a message as read.
     */
    public requestRead(receiver, newestMessage: threema.Message): void {
        if (newestMessage.id === undefined) {
            // Message that hasn't been sent yet
            return;
        }

        // Create arguments and send request
        const args = {
            [WebClientService.ARGUMENT_RECEIVER_TYPE]: receiver.type,
            [WebClientService.ARGUMENT_RECEIVER_ID]: receiver.id,
            [WebClientService.ARGUMENT_MESSAGE_ID]: newestMessage.id.toString(),
        };
        this.$log.debug('Sending read request for', receiver.type, receiver.id, '(msg ' + newestMessage.id + ')');
        this._sendRequest(WebClientService.SUB_TYPE_READ, args);
    }

    public requestContactDetail(contactReceiver: threema.ContactReceiver): Promise<any> {
        return this._sendRequestPromise(WebClientService.SUB_TYPE_CONTACT_DETAIL, {
            [WebClientService.ARGUMENT_IDENTITY]: contactReceiver.id,
        });
    }

    /**
     * Send a message to the specified receiver.
     */
    public sendMessage(receiver,
                       type: threema.MessageContentType,
                       message: threema.MessageData): Promise<Promise<any>> {
        return new Promise<any> (
            (resolve, reject) => {
                // Try to load receiver object
                const receiverObject = this.receivers.getData(receiver);
                // Check blocked flag
                if (receiverObject.type === 'contact'
                    && (receiverObject as threema.ContactReceiver).isBlocked) {
                    return reject(this.$translate.instant('error.CONTACT_BLOCKED'));
                }
                // Decide on subtype
                let subType;
                switch (type) {
                    case 'text':
                        subType = WebClientService.SUB_TYPE_TEXT_MESSAGE;

                        const textMessage = message as threema.TextMessageData;
                        const msgLength = textMessage.text.length;

                        // Ignore empty text messages
                        if (msgLength === 0) {
                            return reject();
                        }

                        // Ignore text messages that are too long.
                        if (msgLength > WebClientService.MAX_TEXT_LENGTH) {
                            return reject(this.$translate.instant('error.TEXT_TOO_LONG', {
                                max: WebClientService.MAX_TEXT_LENGTH,
                            }));
                        }

                        break;
                    case 'file':
                        // validate max file size
                        if ((message as threema.FileMessageData).size > WebClientService.MAX_FILE_SIZE) {
                            return reject(this.$translate.instant('error.FILE_TOO_LARGE'));
                        }

                        // Determine required feature mask
                        let requiredFeature: ContactReceiverFeature = ContactReceiverFeature.FILE;
                        let invalidFeatureMessage = 'error.FILE_MESSAGES_NOT_SUPPORTED';
                        if ((message as threema.FileMessageData).sendAsFile !== true) {
                            // check mime type
                            const mime = (message as threema.FileMessageData).fileType;

                            if (this.mimeService.isAudio(mime)) {
                                requiredFeature = ContactReceiverFeature.AUDIO;
                                invalidFeatureMessage = 'error.AUDIO_MESSAGES_NOT_SUPPORTED';
                            } else if (this.mimeService.isImage(mime)
                                || this.mimeService.isVideo(mime)) {
                                requiredFeature = ContactReceiverFeature.AUDIO;
                                invalidFeatureMessage = 'error.MESSAGE_NOT_SUPPORTED';
                            }
                        }

                        subType = WebClientService.SUB_TYPE_FILE_MESSAGE;

                        // check receiver
                        switch (receiver.type) {
                            case 'distributionList':
                                return reject(this.$translate.instant(invalidFeatureMessage, {
                                    receiverName: receiver.displayName}));
                            case 'group':
                                const unsupportedMembers = [];
                                const group = this.groups.get(receiver.id);

                                if (group === undefined) {
                                    return reject();
                                }
                                group.members.forEach((identity: string) => {
                                    if (identity !== this.me.id) {
                                        // tslint:disable-next-line: no-shadowed-variable
                                        const contact = this.contacts.get(identity);
                                        if (contact === undefined
                                            || !hasFeature(contact, requiredFeature, this.$log)) {
                                            unsupportedMembers.push(contact.displayName);
                                        }
                                    }
                                });

                                if (unsupportedMembers.length > 0) {
                                    return reject(this.$translate.instant(invalidFeatureMessage, {
                                        receiverName: unsupportedMembers.join(',')}));
                                }
                                break;
                            case 'contact':
                                const contact = this.contacts.get(receiver.id);
                                if (contact === undefined) {
                                    this.$log.error('Cannot retrieve contact');
                                    return reject(this.$translate.instant('error.ERROR_OCCURRED'));
                                } else if (!hasFeature(contact, requiredFeature, this.$log)) {
                                    this.$log.debug('Cannot send message: Feature level mismatch:',
                                        contact.featureMask, 'does not include', requiredFeature);
                                    return reject(this.$translate.instant(invalidFeatureMessage, {
                                        receiverName: contact.displayName}));
                                }
                                break;
                            default:
                                return reject();
                        }
                        break;
                    default:
                        this.$log.warn('Invalid message type:', type);
                        return reject();
                }

                const temporaryMessage = this.messageService.createTemporary(receiver, type, message);
                this.messages.addNewer(receiver, [temporaryMessage]);

                const args = {
                    [WebClientService.ARGUMENT_RECEIVER_TYPE]: receiver.type,
                    [WebClientService.ARGUMENT_RECEIVER_ID]: receiver.id,
                    [WebClientService.ARGUMENT_TEMPORARY_ID]: temporaryMessage.temporaryId,
                };

                // Send message and handling error promise
                this._sendCreatePromise(subType, args, message).catch((error) => {
                    this.$log.error('Error sending message:', error);

                    // Remove temporary message
                    this.messages.removeTemporary(receiver, temporaryMessage.temporaryId);

                    // Determine error message
                    let errorMessage;
                    switch (error) {
                        case 'file_too_large':
                            errorMessage = this.$translate.instant('error.FILE_TOO_LARGE');
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
                resolve();
            });
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
        this._sendRequest(WebClientService.SUB_TYPE_ACK, args);
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
        this._sendDeletePromise(WebClientService.SUB_TYPE_MESSAGE, args);
    }

    public sendMeIsTyping(receiver: threema.ContactReceiver, isTyping: boolean): void {
        const args = {[WebClientService.ARGUMENT_RECEIVER_ID]: receiver.id};
        const data = {[WebClientService.ARGUMENT_IS_TYPING]: isTyping};
        this._sendUpdate(WebClientService.SUB_TYPE_TYPING, args, data);
    }

    public sendKeyPersisted(): void {
        this._sendRequest(WebClientService.SUB_TYPE_KEY_PERSISTED);
    }

    /**
     * Add a contact receiver.
     */
    public addContact(threemaId: string): Promise<threema.ContactReceiver> {
        const args = null;
        const data = {
            [WebClientService.ARGUMENT_IDENTITY]: threemaId,
        };
        return this._sendCreatePromise(WebClientService.SUB_TYPE_CONTACT, args, data);
    }

    /**
     * Modify a contact name or a avatar
     */
    public modifyContact(threemaId: string,
                         firstName?: string,
                         lastName?: string,
                         avatar?: ArrayBuffer): Promise<threema.ContactReceiver> {
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

        // If no changes happened, resolve the promise immediately.
        if (Object.keys(data).length === 0) {
            this.$log.warn(this.logTag, 'Trying to modify contact without any changes');
            return Promise.resolve(this.contacts.get(threemaId));
        }

        // Send update
        const args = {
            [WebClientService.ARGUMENT_IDENTITY]: threemaId,
        };
        const promise = this._sendUpdatePromise(WebClientService.SUB_TYPE_CONTACT, args, data);

        // If necessary, reset avatar to force a avatar reload
        if (avatar !== undefined) {
            this.contacts.get(threemaId).avatar = {};
        }

        return promise;
    }

    /**
     * Create a group receiver.
     */
    public createGroup(
        members: string[],
        name: string = null,
        avatar?: ArrayBuffer,
    ): Promise<threema.GroupReceiver> {
        const args = null;
        const data = {
            [WebClientService.ARGUMENT_MEMBERS]: members,
            [WebClientService.ARGUMENT_NAME]: name,
        } as object;

        if (avatar !== undefined) {
            data[WebClientService.ARGUMENT_AVATAR] = avatar;
        }

        return this._sendCreatePromise(WebClientService.SUB_TYPE_GROUP, args, data);
    }

    /**
     * Modify a group receiver.
     */
    public modifyGroup(id: string,
                       members: string[],
                       name?: string,
                       avatar?: ArrayBuffer): Promise<threema.GroupReceiver> {
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
        const promise = this._sendUpdatePromise(WebClientService.SUB_TYPE_GROUP, args, data);

        // If necessary, reset avatar to force a avatar reload
        if (avatar !== undefined) {
            this.groups.get(id).avatar = {};
        }
        return promise;
    }

    public leaveGroup(group: threema.GroupReceiver): Promise<any> {
        if (group === null || group === undefined || !group.access.canLeave) {
            return new Promise((resolve, reject) => reject('not allowed'));
        }

        const args = {
            [WebClientService.ARGUMENT_RECEIVER_ID]: group.id,
            [WebClientService.ARGUMENT_DELETE_TYPE]: WebClientService.DELETE_GROUP_TYPE_LEAVE,
        };

        return this._sendDeletePromise(WebClientService.SUB_TYPE_GROUP, args);
    }

    public deleteGroup(group: threema.GroupReceiver): Promise<any> {
        if (group === null || group === undefined || !group.access.canDelete) {
            return new Promise<any> (
                (resolve, reject) => {
                    reject('not allowed');
                });
        }

        const args = {
            [WebClientService.ARGUMENT_RECEIVER_ID]: group.id,
            [WebClientService.ARGUMENT_DELETE_TYPE]: WebClientService.DELETE_GROUP_TYPE_DELETE,
        };

        return this._sendDeletePromise(WebClientService.SUB_TYPE_GROUP, args);
    }

    /**
     * Force-sync a group.
     */
    public syncGroup(group: threema.GroupReceiver): Promise<any> {
        if (group === null || group === undefined || !group.access.canSync) {
            return Promise.reject('not allowed');
        }

        const args = {
            [WebClientService.ARGUMENT_RECEIVER_ID]: group.id,
        };

        return this._sendRequestPromise(WebClientService.SUB_TYPE_GROUP_SYNC, args, 10000);
    }

    /**
     * Create a new distribution list receiver.
     */
    public createDistributionList(
        members: string[],
        name: string = null,
    ): Promise<threema.DistributionListReceiver> {
        const args = null;
        const data = {
            [WebClientService.ARGUMENT_MEMBERS]: members,
            [WebClientService.ARGUMENT_NAME]: name,
        };

        return this._sendCreatePromise(WebClientService.SUB_TYPE_DISTRIBUTION_LIST, args, data);
    }

    public modifyDistributionList(id: string,
                                  members: string[],
                                  name: string = null): Promise<threema.DistributionListReceiver> {
        const data = {
            [WebClientService.ARGUMENT_MEMBERS]: members,
            [WebClientService.ARGUMENT_NAME]: name,
        } as any;

        return this._sendUpdatePromise(WebClientService.SUB_TYPE_DISTRIBUTION_LIST, {
            [WebClientService.ARGUMENT_RECEIVER_ID]: id,
        }, data);
    }

    public deleteDistributionList(distributionList: threema.DistributionListReceiver): Promise<any> {
        if (distributionList === null || distributionList === undefined || !distributionList.access.canDelete) {
            return new Promise((resolve, reject) => reject('not allowed'));
        }

        const args = {
            [WebClientService.ARGUMENT_RECEIVER_ID]: distributionList.id,
        };

        return this._sendDeletePromise(WebClientService.SUB_TYPE_DISTRIBUTION_LIST, args);
    }

    /**
     * Remove all messages of a receiver
     * @param {threema.Receiver} receiver
     * @returns {Promise<any>}
     */
    public cleanReceiverConversation(receiver: threema.Receiver): Promise<any> {
        if (receiver === null || receiver === undefined) {
            return new Promise((resolve, reject) => reject('invalid receiver'));
        }

        const args = {
            [WebClientService.ARGUMENT_RECEIVER_TYPE]: receiver.type,
            [WebClientService.ARGUMENT_RECEIVER_ID]: receiver.id,
        };

        return this._sendDeletePromise(WebClientService.SUB_TYPE_CLEAN_RECEIVER_CONVERSATION, args);
    }

    /**
     * Modify own profile.
     */
    public modifyProfile(nickname?: string,
                         avatar?: ArrayBuffer): Promise<null> {

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
            this.$log.warn(this.logTag, 'Trying to modify profile without any changes');
            return Promise.resolve(null);
        }

        // Send update, get back promise
        return this._sendUpdatePromise(WebClientService.SUB_TYPE_PROFILE, null, data);
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
    public getQuote(receiver: threema.Receiver): threema.Quote {
        return this.drafts.getQuote(receiver);
    }

    /**
     * Set or remove (if message is null) a quoted message model.
     */
    public setQuote(receiver: threema.Receiver, message: threema.Message = null): void {
        // Remove current quote
        this.drafts.removeQuote(receiver);

        if (message !== null) {
            let quoteText;
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

            if (quoteText !== undefined) {
                const quote = {
                    identity: message.isOutbox ? this.me.id : message.partnerId,
                    text: quoteText,
                } as threema.Quote;

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
        this.$log.debug(this.logTag, 'Reset initialization steps');
        this.initialized.clear();
        this.pendingInitializationStepRoutines = [];
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
        this.messages.converter = this.container.Converter.unicodeToEmoji;
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

    /**
     * Return a PromiseRequestResult with success=false and the specified error code.
     */
    private promiseRequestError(error: string): threema.PromiseRequestResult<undefined> {
        return {
            success: false,
            error: error,
        };
    }

    private _receiveResponseConfirmAction(message: threema.WireMessage): threema.PromiseRequestResult<void> {
        this.$log.debug('Received receiver response');

        // Unpack and validate args
        const args = message.args;
        if (args === undefined) {
            this.$log.error('Invalid confirmAction response, args missing');
            return this.promiseRequestError('invalidResponse');
        }

        switch (args[WebClientService.ARGUMENT_SUCCESS]) {
            case true:
                return { success: true };
            case false:
                return this.promiseRequestError(args[WebClientService.ARGUMENT_ERROR]);
            default:
                this.$log.error('Invalid confirmAction response, success field is not a boolean');
                return this.promiseRequestError('invalidResponse');
        }
    }

    private _receiveResponseReceivers(message: threema.WireMessage): void {
        this.$log.debug('Received receivers response');

        // Unpack and validate data
        const data = message.data;
        if (data === undefined) {
            this.$log.warn('Invalid receivers response, data missing');
            return;
        }

        // Store receivers
        this.receivers.set(data);
        this.registerInitializationStep(InitializationStep.Receivers);
    }

    private _receiveResponseContactDetail(message: threema.WireMessage): threema.PromiseRequestResult<any> {
        this.$log.debug('Received contact detail');

        // Unpack and validate data
        const args = message.args;
        const data = message.data;
        if (args === undefined || data === undefined) {
            this.$log.error('Invalid contact response, args or data missing');
            return this.promiseRequestError('invalidResponse');
        }

        switch (args[WebClientService.ARGUMENT_SUCCESS]) {
            case true:
                const contactReceiver = this.receivers.contacts
                    .get(args[WebClientService.ARGUMENT_IDENTITY]) as threema.ContactReceiver;
                if (data[WebClientService.SUB_TYPE_RECEIVER]) {
                    contactReceiver.systemContact =
                        data[WebClientService.SUB_TYPE_RECEIVER][WebClientService.ARGUMENT_SYSTEM_CONTACT];
                }
                return {
                    success: true,
                    data: contactReceiver,
                };
            case false:
                return this.promiseRequestError(args[WebClientService.ARGUMENT_ERROR]);
            default:
                this.$log.error('Invalid contact response, success field is not a boolean');
                return this.promiseRequestError('invalidResponse');
        }
    }

    private _receiveAlert(message: threema.WireMessage): void {
        this.$log.debug('Received alert from device');
        this.alerts.push({
            source: message.args.source,
            type: message.args.type,
            message: message.data.message,
        } as threema.Alert);

    }

    /**
     * Process an incoming contact, group or distributionList response.
     */
    private _receiveResponseReceiver<T extends threema.Receiver>(
        message: threema.WireMessage,
        receiverType: threema.ReceiverType,
    ): threema.PromiseRequestResult<T> {
        this.$log.debug('Received ' + receiverType + ' response');

        // Unpack and validate data
        const args = message.args;
        const data = message.data;
        if (args === undefined || data === undefined) {
            this.$log.error('Invalid ' + receiverType + ' response, args or data missing');
            return this.promiseRequestError('invalidResponse');
        }

        switch (args[WebClientService.ARGUMENT_SUCCESS]) {
            case true:
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

                return {
                    success: true,
                    data: receiver,
                };
            case false:
                return this.promiseRequestError(args[WebClientService.ARGUMENT_ERROR]);
            default:
                this.$log.error('Invalid ' + receiverType + ' response, success field is not a boolean');
                return this.promiseRequestError('invalidResponse');
        }
    }

    /**
     * Handle new or modified contacts.
     */
    private _receiveUpdateContact(message: threema.WireMessage):
                                    threema.PromiseRequestResult<threema.ContactReceiver> {
        return this._receiveResponseReceiver(message, 'contact');
    }

    /**
     * Handle new or modified groups.
     */
    private _receiveResponseGroup(message: threema.WireMessage):
                                  threema.PromiseRequestResult<threema.GroupReceiver> {
        return this._receiveResponseReceiver(message, 'group');
    }

    /**
     * Handle new or modified distribution lists.
     */
    private _receiveResponseDistributionList(message: threema.WireMessage):
                                             threema.PromiseRequestResult<threema.DistributionListReceiver> {
        return this._receiveResponseReceiver(message, 'distributionList');
    }

    private _receiveResponseCreateMessage(message: threema.WireMessage): threema.PromiseRequestResult<string> {
        this.$log.debug('Received create message response');

        // Unpack data and arguments
        const args = message.args;
        const data = message.data;

        if (args === undefined || data === undefined) {
            this.$log.warn('Invalid create message received, arguments or data missing');
            return this.promiseRequestError('invalidResponse');
        }

        switch (args[WebClientService.ARGUMENT_SUCCESS]) {
            case true:
                const receiverType: threema.ReceiverType = args[WebClientService.ARGUMENT_RECEIVER_TYPE];
                const receiverId: string = args[WebClientService.ARGUMENT_RECEIVER_ID];
                const temporaryId: string = args[WebClientService.ARGUMENT_TEMPORARY_ID];

                const messageId: string = data[WebClientService.ARGUMENT_MESSAGE_ID];
                if (receiverType === undefined || receiverId === undefined ||
                    temporaryId === undefined || messageId === undefined) {
                    this.$log.warn('Invalid create received [type, id, temporaryId arg ' +
                        'or messageId in data missing]');
                    return this.promiseRequestError('invalidResponse');
                }

                this.messages.bindTemporaryToMessageId(
                    {
                        type: receiverType,
                        id: receiverId,
                    } as threema.Receiver,
                    temporaryId,
                    messageId,
                );

                return { success: true, data: messageId };
            case false:
                return this.promiseRequestError(args[WebClientService.ARGUMENT_ERROR]);
            default:
                this.$log.error('Invalid create message response, success field is not a boolean');
                return this.promiseRequestError('invalidResponse');
        }
    }

    private _receiveResponseConversations(message: threema.WireMessage) {
        this.$log.debug('Received conversations response');
        const data = message.data as threema.Conversation[];
        if (data === undefined) {
            this.$log.warn('Invalid conversation response, data missing');
        } else {
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
            this.conversations.set(data);
        }
        this.updateUnreadCount();
        this.registerInitializationStep(InitializationStep.Conversations);
    }

    private _receiveResponseMessages(message: threema.WireMessage): void {
        this.$log.debug('Received message response');

        // Unpack data and arguments
        const args = message.args;
        const data = message.data as threema.Message[];
        if (args === undefined || data === undefined) {
            this.$log.warn('Invalid message response, data or arguments missing');
            return;
        }

        // Unpack required argument fields
        const type: string = args[WebClientService.ARGUMENT_RECEIVER_TYPE];
        const id: string = args[WebClientService.ARGUMENT_RECEIVER_ID];
        let more: boolean = args[WebClientService.ARGUMENT_HAS_MORE];
        if (type === undefined || id === undefined || more === undefined) {
            this.$log.warn('Invalid message response, argument field missing');
            return;
        }

        // If there's no data returned, override `more` field.
        if (data.length === 0) {
            more = false;
        }

        // Check if the page was requested
        const receiver = {type: type, id: id} as threema.Receiver;

        // Set as loaded
        this.loadingMessages.delete(receiver.type + receiver.id);

        if (this.messages.isRequested(receiver)) {
            // Add messages
            this.messages.addOlder(receiver, data);

            // Clear pending request
            this.messages.clearRequested(receiver);

            // Set "more" flag to indicate that more (older) messages are available.
            this.messages.setMore(receiver, more);

            this.messages.notify(receiver, this.$rootScope);
        } else {
            this.$log.warn("Ignoring message response that hasn't been requested");
            return;
        }
    }

    private _receiveResponseAvatar(message: threema.WireMessage): threema.PromiseRequestResult<any> {
        this.$log.debug('Received avatar response');

        // Unpack data and arguments
        const args = message.args;
        if (args === undefined) {
            this.$log.warn('Invalid message response: arguments missing');
            return this.promiseRequestError('invalidResponse');
        }

        const avatar = message.data;
        if (avatar === undefined) {
            // It's ok, a receiver without a avatar
            return { success: true, data: null };
        }

        // Unpack required argument fields
        const type = args[WebClientService.ARGUMENT_RECEIVER_TYPE];
        const id = args[WebClientService.ARGUMENT_RECEIVER_ID];
        const highResolution = args[WebClientService.ARGUMENT_AVATAR_HIGH_RESOLUTION];
        if (type === undefined || id === undefined || highResolution === undefined) {
            this.$log.warn('Invalid avatar response, argument field missing');
            return this.promiseRequestError('invalidResponse');
        }

        // Set avatar for receiver according to resolution
        const field: string = highResolution ? 'high' : 'low';
        const receiverData = this.receivers.getData(args);
        if (receiverData.avatar === null || receiverData.avatar === undefined) {
            receiverData.avatar = {};
        }

        receiverData.avatar[field] = avatar;

        return { success: true, data: avatar };
    }

    private _receiveResponseThumbnail(message: threema.WireMessage): threema.PromiseRequestResult<any> {
        this.$log.debug('Received thumbnail response');

        // Unpack data and arguments
        const args = message.args;
        if (args === undefined) {
            this.$log.warn('Invalid message response: arguments missing');
            return {
                success: false,
                data: 'invalidResponse',
            };
        }

        const data = message.data;
        if ( data === undefined) {
            // It's ok, a message without a thumbnail
            return {
                success: true,
                data: null,
            };
        }

        // Unpack required argument fields
        const type = args[WebClientService.ARGUMENT_RECEIVER_TYPE];
        const id = args[WebClientService.ARGUMENT_RECEIVER_ID];
        const messageId: string = args[WebClientService.ARGUMENT_MESSAGE_ID];

        if (type === undefined || id === undefined || messageId === undefined ) {
            this.$log.warn('Invalid thumbnail response, argument field missing');
            return {
                success: false,
                data: 'invalidResponse',
            };
        }

        this.messages.setThumbnail( this.receivers.getData(args), messageId, data);

        return {
            success: true,
            data: data,
        };
    }

    private _receiveResponseBlob(message: threema.WireMessage): threema.PromiseRequestResult<threema.BlobInfo> {
        this.$log.debug('Received blob response');

        // Unpack data and arguments
        const args = message.args;
        const data = message.data;
        if (args === undefined ) {
            this.$log.warn('Invalid message response, arguments missing');
            return this.promiseRequestError('invalidResponse');
        }

        // Unpack required argument fields
        const receiverType = args[WebClientService.ARGUMENT_RECEIVER_TYPE];
        const receiverId = args[WebClientService.ARGUMENT_RECEIVER_ID];
        const msgId: string = args[WebClientService.ARGUMENT_MESSAGE_ID];
        const temporaryId: string = args[WebClientService.ARGUMENT_TEMPORARY_ID];
        const success: boolean = args[WebClientService.ARGUMENT_SUCCESS];
        if (receiverType === undefined || receiverId === undefined
            || msgId === undefined || temporaryId === undefined || success === undefined) {
            this.$log.warn('Invalid blob response, argument field missing');
            return this.promiseRequestError('invalidResponse');
        }

        // Check success flag
        if (success === false) {
            return this.promiseRequestError(args[WebClientService.ARGUMENT_ERROR]);
        }

        // Unpack data
        const blobInfo: threema.BlobInfo = {
            buffer: data[WebClientService.DATA_FIELD_BLOB_BLOB],
            mimetype: data[WebClientService.DATA_FIELD_BLOB_TYPE],
            filename: data[WebClientService.DATA_FIELD_BLOB_NAME],
        };
        if (blobInfo.buffer === undefined || blobInfo.mimetype === undefined || blobInfo.filename === undefined) {
            this.$log.warn('Invalid blob response, data field missing');
            return this.promiseRequestError('invalidResponse');
        }

        this.blobCache.set(msgId + receiverType, blobInfo);

        // Download to browser
        return {
            success: true,
            data: blobInfo,
        };
    }

    private _receiveUpdateMessages(message: threema.WireMessage): void {
        this.$log.debug('Received messages update');

        // Unpack data and arguments
        const args = message.args;
        const data: threema.Message[] = message.data;
        if (args === undefined || data === undefined) {
            this.$log.warn('Invalid message update, data or arguments missing');
            return;
        }

        // Unpack required argument fields
        const type: string = args[WebClientService.ARGUMENT_RECEIVER_TYPE];
        const id: string = args[WebClientService.ARGUMENT_RECEIVER_ID];
        const mode: string = args[WebClientService.ARGUMENT_MODE];
        if (type === undefined || id === undefined || mode === undefined) {
            this.$log.warn('Invalid message update, argument field missing');
            return;
        }
        const receiver = {type: type, id: id} as threema.Receiver;

        // React depending on mode
        for (const msg of data) {
            switch (mode) {
                case WebClientService.ARGUMENT_MODE_NEW:
                    this.$log.debug('New message', msg.id);

                    // It's possible that this message already exists (placeholder message on send).
                    // Try to update it first. If not, add it as a new msg.
                    if (!this.messages.update(receiver, msg)) {
                        this.messages.addNewer(receiver, [msg]);
                    }
                    break;
                case WebClientService.ARGUMENT_MODE_MODIFIED:
                    this.$log.debug('Modified message', msg.id);
                    this.messages.update(receiver, msg);
                    break;
                case WebClientService.ARGUMENT_MODE_REMOVED:
                    this.messages.remove(receiver, msg.id);
                    break;
                default:
                    this.$log.warn('Invalid message response, unknown mode:', mode);
            }
        }
    }

    private _receiveUpdateReceiver(message: threema.WireMessage): void {
        this.$log.debug('Received receiver update or delete');

        // Unpack data and arguments
        const args = message.args;
        const data = message.data;
        if (args === undefined || data === undefined) {
            this.$log.warn('Invalid receiver update, data or arguments missing');
            return;
        }

        // Unpack required argument fields
        const type = args[WebClientService.ARGUMENT_RECEIVER_TYPE] as threema.ReceiverType;
        const id = args[WebClientService.ARGUMENT_RECEIVER_ID];
        const mode: 'new' | 'modified' | 'removed' = args[WebClientService.ARGUMENT_MODE];
        if (type === undefined || mode === undefined || id === undefined) {
            this.$log.warn('Invalid receiver update, argument field missing');
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
                this.$log.warn('Invalid receiver response, unknown mode:', mode);
        }
    }

    private _receiveUpdateReceivers(message: threema.WireMessage): void {
        this.$log.debug('Received receivers update');

        // Unpack data and arguments
        const args = message.args;
        const data = message.data;
        if (args === undefined || data === undefined) {
            this.$log.warn('Invalid receiver update, data or arguments missing');
            return;
        }

        // Unpack required argument fields
        const type = args[WebClientService.ARGUMENT_RECEIVER_TYPE] as threema.ReceiverType;
        if (type === undefined) {
            this.$log.warn('Invalid receivers update, argument field missing');
            return;
        }

        // Refresh lists of receivers
        switch (type) {
            case 'contact':
                this.receivers.setContacts(data);
                break;
            case 'group':
                this.receivers.setGroups(data);
                break;
            case 'distributionList':
                this.receivers.setDistributionLists(data);
                break;
            default:
                this.$log.warn('Unknown receiver type:', type);
        }
    }

    private _receiveUpdateTyping(message: threema.WireMessage): void {
        this.$log.debug('Received typing update');

        // Unpack data and arguments
        const args = message.args;
        const data = message.data;
        if (args === undefined || data === undefined) {
            this.$log.warn('Invalid typing update, data or arguments missing');
            return;
        }

        // Unpack required argument fields
        const identity: string = args[WebClientService.ARGUMENT_RECEIVER_ID];
        if (identity === undefined) {
            this.$log.warn('Invalid typing update, argument field missing');
            return;
        }

        // Unpack required data fields
        const isTyping: boolean = data[WebClientService.ARGUMENT_IS_TYPING];
        if (isTyping === undefined) {
            this.$log.warn('Invalid typing update, data field missing');
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
        this.$log.debug('Received conversation update');
        const args = message.args;
        const data = message.data as threema.ConversationWithPosition;
        if (args === undefined || data === undefined) {
            this.$log.warn('Invalid conversation update, data or arguments missing');
            return;
        }

        // Unpack required argument fields
        const type: string = args[WebClientService.ARGUMENT_MODE];
        switch (type) {
            case WebClientService.ARGUMENT_MODE_NEW:
                this.conversations.add(data);
                break;
            case WebClientService.ARGUMENT_MODE_MODIFIED:
                // A conversation update *can* mean that a new message arrived.
                // To find out, we'll look at the unread count. If it has been
                // incremented, it must be a new message.
                if (data.unreadCount > 0) {
                    const oldConversation = this.conversations.updateOrAdd(data);
                    if (oldConversation === null) {
                        this.onNewMessage(data.latestMessage, data);
                    } else {
                        // Check for unread count changes
                        const unreadCountIncreased = data.unreadCount > oldConversation.unreadCount;
                        const unreadCountDecreased = data.unreadCount < oldConversation.unreadCount;

                        // If the unreadcount has increased, we received a new message.
                        // Otherwise, if it has decreased, hide the notification.
                        if (unreadCountIncreased) {
                            this.onNewMessage(data.latestMessage, data);
                        } else if (unreadCountDecreased) {
                            this.notificationService.hideNotification(data.type + '-' + data.id);
                        }
                    }
                } else {
                    // Update the conversation and hide any notifications
                    this.conversations.updateOrAdd(data);
                    this.notificationService.hideNotification(data.type + '-' + data.id);
                }

                break;
            case WebClientService.ARGUMENT_MODE_REMOVED:
                this.conversations.remove(data);
                // Remove all cached messages
                this.messages.clearReceiverMessages(data.receiver);
                this.receiverListener.forEach((listener: threema.ReceiverListener) => {
                    this.$log.debug('call on removed listener');
                    listener.onRemoved(data.receiver);
                });
                break;
            default:
                this.$log.warn('Received conversation without a mode');
                return;
        }

        this.updateUnreadCount();
    }

    /**
     * Process an incoming battery status message.
     */
    private _receiveUpdateBatteryStatus(message: threema.WireMessage): void {
        this.$log.debug('Received battery status');

        // Unpack data and arguments
        const data = message.data as threema.BatteryStatus;
        if (data === undefined) {
            this.$log.warn('Invalid battery status message, data missing');
            return;
        }

        // Set battery status
        this.batteryStatusService.setStatus(data);

        this.$log.debug('[BatteryStatusService]', this.batteryStatusService.toString());
    }

    /**
     * The peer sends the device information string. This can be used to
     * identify the active session.
     */
    private _receiveResponseClientInfo(message: threema.WireMessage): void {
        this.$log.debug('Received client info');
        const data = message.data;
        if (data === undefined) {
            this.$log.warn('Invalid client info, data field missing');
            return;
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
            isWork: data.isWork,
            pushToken: data.pushToken,
            configuration: {
                showLocationPreview: getOrDefault<boolean>(data.configuration.showLocationPreview, false),
                voipEnabled: getOrDefault<boolean>(data.configuration.voipEnabled, true),
                voipForceTurn: getOrDefault<boolean>(data.configuration.voipForceTurn, false),
                largeSingleEmoji: getOrDefault<boolean>(data.configuration.largeSingleEmoji, true),
                showInactiveIds: getOrDefault<boolean>(data.configuration.showInactiveIds, true),
            },
            capabilities: {
                maxGroupSize: getOrDefault<number>(data.capabilities.maxGroupSize, 50),
                distributionLists: getOrDefault<boolean>(data.capabilities.distributionLists, true),
                mdm: data.capabilities.mdm,
            },
        };

        this.$log.debug('Client device:', this.clientInfo.device);

        // Store push token
        if (this.clientInfo.pushToken) {
            this.pushToken = this.clientInfo.pushToken;
            switch (this.clientInfo.os) {
                case threema.OperatingSystem.Android:
                    this.pushTokenType = threema.PushTokenType.Gcm;
                    break;
                case threema.OperatingSystem.Ios:
                    this.pushTokenType = threema.PushTokenType.Apns;
                    break;
                default:
                    this.$log.error(this.logTag, 'Invalid operating system in client info');
            }
        }
        if (this.pushToken && this.pushTokenType) {
            this.pushService.init(this.pushToken, this.pushTokenType);
        }

        this.registerInitializationStep(InitializationStep.ClientInfo);
    }

    /**
     * The peer sends information about the current user profile.
     */
    private _receiveResponseProfile(message: threema.WireMessage): void {
        this.$log.debug('Received profile');
        const data = message.data;
        if (data === undefined) {
            this.$log.warn('Invalid client info, data field missing');
            return;
        }

        // Create 'me' receiver with profile + dummy data
        // TODO: Send both high-res and low-res avatars
        this.receivers.setMe({
            type: 'me',
            id: data.identity,
            publicNickname: data.publicNickname,
            displayName: data.publicNickname || data.identity,
            publicKey: data.publicKey,
            avatar: {
                high: data.avatar,
            },
            featureMask: 0xFF,
            verificationLevel: 3,
            state: 'ACTIVE',
            access: {
                canChangeAvatar: true,
                canChangeFirstName: true,
                canChangeLastName: true,
            },
            color: '#000000',
        });

        this.registerInitializationStep(InitializationStep.Profile);
    }

    public setPassword(password: string) {
        // If a password has been set, store trusted key and push token
        if (this._maybeTrustKeys(password)) {
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
        return WebClientService.MAX_TEXT_LENGTH;
    }

    /**
     * Returns the max group member size
     */
    public getMaxGroupMemberSize(): number {
        return this.clientInfo.capabilities.maxGroupSize;
    }

    /**
     * Called when a new message arrives.
     */
    private onNewMessage(message: threema.Message, conversation: threema.Conversation): void {
        // Ignore message from active receivers (and if the browser tab is visible)
        if (this.browserService.isVisible()
                && this.receiverService.compare(conversation, this.receiverService.getActive())) {
            return;
        }
        const sender: threema.Receiver = conversation.receiver;

        // Do not show any notifications on private chats
        if (sender === undefined || sender.locked) {
            return;
        }

        // Do not show any notifications on muted chats
        if (conversation.isMuted === true) {
            return;
        }

        // Determine sender and partner name (used for notification)
        let senderName = sender.id;
        if (sender.displayName) {
            senderName = sender.displayName;
        } else if (sender.type === 'contact') {
            senderName = '~' + (sender as threema.ContactReceiver).publicNickname;
        }
        const partner = this.receivers.getData({
            id: message.partnerId,
            type: 'contact',
        } as threema.Receiver) as threema.ContactReceiver;
        const partnerName = partner.displayName || ('~' + partner.publicNickname);

        // Show notification
        this.$translate('messenger.MESSAGE_NOTIFICATION_SUBJECT', {messageCount: 1 + conversation.unreadCount})
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
                    ? this.$filter('bufferToUrl')(sender.avatar.low, 'image/png')
                    : null;
                this.notificationService.showNotification(tag, title, body, avatar, () => {
                    this.$state.go('messenger.home.conversation', {
                        type: conversation.type,
                        id: conversation.id,
                        initParams: null,
                    });
                });
            });
    }

    /**
     * If a password has been set, store own private permanent key and public
     * key of the peer in the trusted key store.
     */
    private _maybeTrustKeys(password: string): boolean {
        if (password !== undefined && password !== null && password.length > 0) {
            this.trustedKeyStore.storeTrustedKey(
                this.salty.keyStore.publicKeyBytes,
                this.salty.keyStore.secretKeyBytes,
                this.salty.peerPermanentKeyBytes,
                this.pushToken,
                this.pushTokenType,
                password,
            );
            this.$log.info('Stored trusted key');
            return true;
        }
        return false;
    }

    public updatePushToken(token: string, tokenType: threema.PushTokenType): void {
        this.pushToken = token;
        this.pushTokenType = tokenType;
    }

    private _sendRequest(type, args?: object, data?: object): void {
        const message: threema.WireMessage = {
            type: WebClientService.TYPE_REQUEST,
            subType: type,
        };
        if (args !== undefined) {
            message.args = args;
        }
        if (data !== undefined) {
            message.data = data;
        }
        this.send(message);
    }

    private _sendUpdate(type, args?: object, data?: object): void {
        const message: threema.WireMessage = {
            type: WebClientService.TYPE_UPDATE,
            subType: type,
        };
        if (args !== undefined) {
            message.args = args;
        }
        if (data !== undefined) {
            message.data = data;
        }
        this.send(message);
    }

    private _sendPromiseMessage(message: threema.WireMessage, timeout: number = null): Promise<any> {
        // Create arguments on wired message
        if (message.args === undefined || message.args === null) {
            message.args = {};
        }
        let promiseId = message.args[WebClientService.ARGUMENT_TEMPORARY_ID];
        if (promiseId === undefined) {
            // Create a random id to identity the promise
            promiseId = 'p' + Math.random().toString(36).substring(7);
            message.args[WebClientService.ARGUMENT_TEMPORARY_ID] = promiseId;
        }

        return new Promise(
            (resolve, reject) => {
                const p = {
                    resolve: resolve,
                    reject: reject,
                } as threema.PromiseCallbacks;
                this.requestPromises.set(promiseId, p);

                if (timeout !== null && timeout > 0) {
                    this.$timeout(() => {
                        p.reject('timeout');
                        this.requestPromises.delete(promiseId);
                    }, timeout);
                }

                this.send(message);
            },
        );
    }

    /**
     * Send a request and return a promise.
     *
     * The promise will be resolved if a response arrives with the same temporary ID.
     *
     * @param timeout Optional request timeout in ms
     */
    private _sendRequestPromise(type, args = null, timeout: number = null): Promise<any> {
        const message: threema.WireMessage = {
            type: WebClientService.TYPE_REQUEST,
            subType: type,
            args: args,
        };
        return this._sendPromiseMessage(message, timeout);
    }

    private _sendCreatePromise(type, args = null, data: any = null, timeout: number = null): Promise<any> {
        const message: threema.WireMessage = {
            type: WebClientService.TYPE_CREATE,
            subType: type,
            args: args,
            data: data,
        };
        return this._sendPromiseMessage(message, timeout);
    }

    private _sendUpdatePromise(type, args = null, data: any = null, timeout: number = null): Promise<any> {
        const message: threema.WireMessage = {
            type: WebClientService.TYPE_UPDATE,
            subType: type,
            data: data,
            args: args,
        };
        return this._sendPromiseMessage(message, timeout);
    }

    private _sendCreate(type, data, args = null): void {
        const message: threema.WireMessage = {
            type: WebClientService.TYPE_CREATE,
            subType: type,
            data: data,
        };
        if (args) {
            message.args = args;
        }
        this.send(message);
    }

    private _sendDelete(type, args, data = null): void {
        const message: threema.WireMessage = {
            type: WebClientService.TYPE_DELETE,
            subType: type,
            data: data,
            args: args,
        };
        this.send(message);
    }

    private _sendDeletePromise(type, args, data: any = null, timeout: number = null): Promise<any> {
        const message: threema.WireMessage = {
            type: WebClientService.TYPE_DELETE,
            subType: type,
            data: data,
            args: args,
        };
        return this._sendPromiseMessage(message, timeout);
    }

    private _receiveRequest(type, message): void {
        this.$log.warn('Ignored request with type:', type);
    }

    private _receivePromise(message: any, receiveResult: threema.PromiseRequestResult<any>) {
        if (
            message !== undefined
            && message.args !== undefined
            && message.args[WebClientService.ARGUMENT_TEMPORARY_ID] !== undefined) {
            // find pending promise
            const promiseId = message.args[WebClientService.ARGUMENT_TEMPORARY_ID];

            if (this.requestPromises.has(promiseId)) {
                const promise = this.requestPromises.get(promiseId);
                if (receiveResult === null || receiveResult === undefined) {
                    promise.reject('unknown');
                } else if (receiveResult.success) {
                    promise.resolve(receiveResult.data);
                } else {
                    promise.reject(receiveResult.error);
                }
                // remove from map
                this.requestPromises.delete(promiseId);
            }
        }
    }

    private _receiveResponse(type, message): void {
        let receiveResult: threema.PromiseRequestResult<any>;
        switch (type) {
            case WebClientService.SUB_TYPE_CONFIRM_ACTION:
                receiveResult = this._receiveResponseConfirmAction(message);
                break;
            case WebClientService.SUB_TYPE_RECEIVERS:
                this._receiveResponseReceivers(message);
                break;
            case WebClientService.SUB_TYPE_CONVERSATIONS:
                this.runAfterInitializationSteps([
                    InitializationStep.Receivers,
                ], () => {
                    this._receiveResponseConversations(message);
                });
                break;
            case WebClientService.SUB_TYPE_MESSAGES:
                this._receiveResponseMessages(message);
                break;
            case WebClientService.SUB_TYPE_AVATAR:
                receiveResult = this._receiveResponseAvatar(message);
                break;
            case WebClientService.SUB_TYPE_THUMBNAIL:
                receiveResult = this._receiveResponseThumbnail(message);
                break;
            case WebClientService.SUB_TYPE_BLOB:
                receiveResult = this._receiveResponseBlob(message);
                break;
            case WebClientService.SUB_TYPE_CLIENT_INFO:
                this._receiveResponseClientInfo(message);
                break;
            case WebClientService.SUB_TYPE_PROFILE:
                this._receiveResponseProfile(message);
                break;
            case WebClientService.SUB_TYPE_CONTACT_DETAIL:
                receiveResult = this._receiveResponseContactDetail(message);
                break;
            default:
                this.$log.warn('Ignored response with type:', type);
                return;
        }

        this._receivePromise(message, receiveResult);
    }

    private _receiveUpdate(type, message): void {
        let receiveResult;
        switch (type) {
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
            case WebClientService.SUB_TYPE_BATTERY_STATUS:
                this._receiveUpdateBatteryStatus(message);
                break;
            case WebClientService.SUB_TYPE_CONTACT:
                receiveResult = this._receiveUpdateContact(message);
                break;
            case WebClientService.SUB_TYPE_GROUP:
                receiveResult = this._receiveResponseGroup(message);
                break;
            case WebClientService.SUB_TYPE_DISTRIBUTION_LIST:
                receiveResult = this._receiveResponseDistributionList(message);
                break;
            case WebClientService.SUB_TYPE_ALERT:
                this._receiveAlert(message);
                break;
            default:
                this.$log.warn('Ignored update with type:', type);
                return;
        }

        this._receivePromise(message, receiveResult);
    }

    private _receiveCreate(type, message): void {
        let receiveResult: threema.PromiseRequestResult<any>;
        switch (type) {
            case WebClientService.SUB_TYPE_CONTACT:
                receiveResult = this._receiveUpdateContact(message);
                break;
            case WebClientService.SUB_TYPE_GROUP:
                receiveResult = this._receiveResponseGroup(message);
                break;
            case WebClientService.SUB_TYPE_DISTRIBUTION_LIST:
                receiveResult = this._receiveResponseDistributionList(message);
                break;
            case WebClientService.SUB_TYPE_TEXT_MESSAGE:
            case WebClientService.SUB_TYPE_FILE_MESSAGE:
                receiveResult = this._receiveResponseCreateMessage(message);
                break;
            default:
                this.$log.warn('Ignored response with type:', type);
                return;
        }

        this._receivePromise(message, receiveResult);
    }

    private _receiveDelete(type, message): void {
        let receiveResult;
        switch (type) {
            case WebClientService.SUB_TYPE_CONTACT_DETAIL:
                receiveResult = this._receiveUpdateReceiver(message);
                break;
            default:
                this.$log.warn('Ignored delete with type:', type);
                return;
        }

        this._receivePromise(message, receiveResult);
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
     * Send a message through the secure data channel.
     */
    private send(message: threema.WireMessage): void {
        this.$log.debug('Sending', message.type + '/' + message.subType, 'message');
        if (this.config.MSG_DEBUGGING) {
            this.$log.debug('[Message] Outgoing:', message.type, '/', message.subType, message);
        }
        switch (this.chosenTask) {
            case threema.ChosenTask.WebRTC:
                // Send bytes through WebRTC DataChannel
                const bytes: Uint8Array = this.msgpackEncode(message);
                this.secureDataChannel.send(bytes);
                break;
            case threema.ChosenTask.RelayedData:
                // Send bytes through e2e encrypted WebSocket
                if (this.salty.state !== 'task') {
                    this.$log.debug(this.logTag, 'Currently not connected (state='
                        + this.salty.state + '), putting outgoing message in queue');
                    this.outgoingMessageQueue.push(message);
                    if (this.pushService.isAvailable()) {
                        this.sendPush(threema.WakeupType.Wakeup);
                    } else {
                        this.$log.warn(this.logTag, 'Push service not available, cannot wake up peer!');
                    }
                } else {
                    this.relayedDataTask.sendMessage(message);
                }
                break;
        }
    }

    /**
     * Handle incoming message bytes from the SecureDataChannel.
     */
    private handleIncomingMessageBytes(bytes: Uint8Array): void {
        this.$log.debug('New incoming message (' + bytes.byteLength + ' bytes)');
        if (this.config.MSGPACK_DEBUGGING) {
            this.$log.debug('Incoming message payload: ' + msgpackVisualizer(bytes));
        }

        // Decode bytes
        const message: threema.WireMessage = this.msgpackDecode(bytes);

        return this.handleIncomingMessage(message, false);
    }

    /**
     * Handle incoming incoming from the SecureDataChannel
     * or from the relayed data WebSocket.
     */
    private handleIncomingMessage(message: threema.WireMessage, log: boolean): void {
        if (log) {
            this.$log.debug('New incoming message');
        }

        // Validate message to keep contract defined by `threema.WireMessage` type
        if (message.type === undefined) {
            this.$log.warn('Ignoring invalid message (no type attribute)');
            return;
        } else if (message.subType === undefined) {
            this.$log.warn('Ignoring invalid message (no subType attribute)');
            return;
        }

        // If desired, log message type / subtype
        if (this.config.MSG_DEBUGGING) {
            // Deep copy message to prevent issues with JS debugger
            const deepcopy = JSON.parse(JSON.stringify(message));
            this.$log.debug('[Message] Incoming:', message.type, '/', message.subType, deepcopy);
        }

        // Process data
        this.$rootScope.$apply(() => {
            this.receive(message);
        });
    }

    /**
     * Receive a new incoming decrypted message.
     */
    private receive(message: threema.WireMessage): void {
        // Dispatch message
        switch (message.type) {
            case WebClientService.TYPE_REQUEST:
                this._receiveRequest(message.subType, message);
                break;
            case WebClientService.TYPE_RESPONSE:
                this._receiveResponse(message.subType, message);
                break;
            case WebClientService.TYPE_CREATE:
                this._receiveCreate(message.subType, message);
                break;
            case WebClientService.TYPE_UPDATE:
                this._receiveUpdate(message.subType, message);
                break;
            case WebClientService.TYPE_DELETE:
                this._receiveDelete(message.subType, message);
                break;
            default:
                this.$log.warn('Ignored message with type:', message.type);
        }
    }

    private runAfterInitializationSteps(requiredSteps: threema.InitializationStep[], callback: any): void {
        for (const requiredStep of requiredSteps) {
            if (!this.initialized.has(requiredStep)) {
                this.$log.debug(this.logTag,
                    'Required initialization step', requiredStep, 'not completed, add pending routine');
                this.pendingInitializationStepRoutines.push({
                    requiredSteps: requiredSteps,
                    callback: callback,
                } as threema.InitializationStepRoutine);
                return;
            }
        }

        callback();
    }

    private currentController: string;
    public setControllerName(name: string): void {
        this.currentController = name;
    }

    public getControllerName(): string {
        return this.currentController;
    }

    /**
     * Update the unread count in the window title.
     */
    private updateUnreadCount(): void {
        const totalUnreadCount = this.conversations
            .get()
            .reduce((a: number, b: threema.Conversation) => a + b.unreadCount, 0);
        this.titleService.updateUnreadCount(totalUnreadCount);
    }

    /**
     * Reset the unread count in the window title
     */
    private resetUnreadCount(): void {
        this.titleService.updateUnreadCount(0);
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
}
