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

import {StateService as UiStateService} from '@uirouter/angularjs';

import {SettingsService} from './settings';

export class NotificationService {

    private static SETTINGS_NOTIFICATIONS = 'notifications';
    private static SETTINGS_NOTIFICATION_PREVIEW = 'notificationPreview';
    private static SETTINGS_NOTIFICATION_SOUND = 'notificationSound';
    private static NOTIFICATION_SOUND = 'sounds/notification.mp3';

    private $log: ng.ILogService;
    private $window: ng.IWindowService;
    private $state: UiStateService;

    private settingsService: SettingsService;
    private logTag = '[NotificationService]';

    // Whether user has granted notification permission
    private notificationPermission: boolean = null;
    // Whether user wants to receive desktop notifications
    private desktopNotifications: boolean = null;
    // Whether the browser supports notifications
    private notificationAPIAvailable: boolean = null;
    // Whether the user wants notification preview
    private notificationPreview: boolean = null;
    // Whether the user wants notification sound
    private notificationSound: boolean = null;

    // Cache notifications
    private notificationCache: any = {};

    public static $inject = ['$log', '$window', '$state', 'SettingsService'];

    constructor($log: ng.ILogService, $window: ng.IWindowService,
                $state: UiStateService, settingsService: SettingsService) {
        this.$log = $log;
        this.$window = $window;
        this.$state = $state;
        this.settingsService = settingsService;
    }

    public init(): void {
        this.checkNotificationAPI();
        this.fetchSettings();
    }

    /**
     * Ask user for desktop notification permissions.
     *
     * Possible values for 'notificationPermission'
     *      - denied: User has denied the notification permission
     *      - granted: User has granted the notification permission
     *      - default: User has visits Threema Web the first time.
     *                 It stays default unless he denies/grants us the
     *                 notification permission or if the result is sth. else
     * If the user grants the permission, the 'desktopNotification' flag
     * becomes true and is stored in the local storage.
     */
    private requestNotificationPermission(): void {
        if (this.notificationAPIAvailable) {
            const Notification = this.$window.Notification;
            this.$log.debug(this.logTag, 'Requesting notification permission...');
            Notification.requestPermission((result) => {
                switch (result) {
                    case 'denied':
                        this.notificationPermission = false;
                        break;
                    case 'granted':
                        this.notificationPermission = true;
                        this.desktopNotifications = true;
                        this.storeSetting(NotificationService.SETTINGS_NOTIFICATIONS, 'true');
                        break;
                    case 'default':
                        this.desktopNotifications = false;
                        this.notificationPermission = null;
                        break;
                    default:
                        this.notificationPermission = false;
                        break;
                }
                this.$log.debug(this.logTag, 'Notification permission', this.notificationPermission);
            });
        }
    }

    /**
     * Check the notification api availability and permission state
     *
     * If the api is available, 'notificationAPIAvailable' becomes true and
     * the permission state is checked
     */
    private checkNotificationAPI(): void {
        this.notificationAPIAvailable = ('Notification' in this.$window);
        this.$log.debug(this.logTag, 'Notification API available:', this.notificationAPIAvailable);
        if (this.notificationAPIAvailable) {
            const Notification = this.$window.Notification;
            switch (Notification.permission) {
                // denied means the user must manually re-grant permission via browser settings
                case 'denied':
                    this.notificationPermission = false;
                    break;
                case 'granted':
                    this.notificationPermission = true;
                    break;
                case 'default':
                    this.notificationPermission = null;
                    break;
                default:
                    this.notificationPermission = false;
                    break;
            }
        }
        this.$log.debug(this.logTag, 'Initial notificationPermission', this.notificationPermission);
    }

    /**
     * Get the initial settings from local storage
     */
    private fetchSettings(): void {
        this.$log.debug(this.logTag, 'Fetching settings...');
        const notifications = this.retrieveSetting(NotificationService.SETTINGS_NOTIFICATIONS);
        const preview = this.retrieveSetting(NotificationService.SETTINGS_NOTIFICATION_PREVIEW);
        const sound = this.retrieveSetting(NotificationService.SETTINGS_NOTIFICATION_SOUND);
        if (notifications === 'true') {
            this.$log.debug(this.logTag, 'Desktop notifications:', notifications);
            this.desktopNotifications = true;
            // check permission because user may have revoked them
            this.requestNotificationPermission();
        } else if (notifications === 'false') {
            this.$log.debug(this.logTag, 'Desktop notifications:', notifications);
            // user does not want notifications
            this.desktopNotifications = false;
        } else {
            this.$log.debug(this.logTag, 'Desktop notifications:', notifications, 'Asking user...');
            // Neither true nor false was in local storage, so we have to ask the user if he wants notifications
            // If he grants (or already has granted) us the permission, we will set the flag true (default setting)
            this.requestNotificationPermission();
        }
        if (preview === 'false') {
            this.$log.debug(this.logTag, 'Notification preview:', preview);
            this.notificationPreview = false;
        } else {
            // set the flag true if true/nothing or sth. else is in local storage (default setting)
            this.$log.debug(this.logTag, 'Notification preview:', preview, 'Using default value (true)');
            this.notificationPreview = true;
            this.storeSetting(NotificationService.SETTINGS_NOTIFICATION_PREVIEW, 'true');
        }
        if (sound === 'true') {
            this.$log.debug(this.logTag, 'Notification sound:', sound);
            this.notificationSound = true;
        } else {
            // set the flag false if false/nothing or sth. else is in local storage (default setting)
            this.$log.debug(this.logTag, 'Notification sound:', sound, 'Using default value (false)');
            this.notificationSound = false;
            this.storeSetting(NotificationService.SETTINGS_NOTIFICATION_SOUND, 'false');
        }
    }

    /**
     * Returns if the user has granted the notification permission
     */
    public getNotificationPermission(): boolean {
        return this.notificationPermission;
    }

    /**
     * Returns if the user wants to receive notifications
     */
    public getWantsNotifications(): boolean {
        return this.desktopNotifications;
    }

    /**
     * Returns if the user wants a message preview in the notification
     */
    public getWantsPreview(): boolean {
        return this.notificationPreview;
    }

    /**
     * Returns if the user wants sound when a new message arrives
     */
    public getWantsSound(): boolean {
        return this.notificationSound;
    }

    /**
     * Returns if the notification api is available
     */
    public isNotificationApiAvailable(): boolean {
        return this.notificationAPIAvailable;
    }

    /**
     * Sets if the user wants desktop notifications
     */
    public setWantsNotifications(wantsNotifications: boolean): void {
        this.$log.debug(this.logTag, 'Requesting notification preference change to', wantsNotifications);
        if (wantsNotifications) {
            this.requestNotificationPermission();
        } else {
            this.desktopNotifications = false;
            this.storeSetting(NotificationService.SETTINGS_NOTIFICATIONS, 'false');
        }
    }

    /**
     * Sets if the user wants a message preview
     */
    public setWantsPreview(wantsPreview: boolean): void {
        this.$log.debug(this.logTag, 'Requesting preview preference change to', wantsPreview);
        this.notificationPreview = wantsPreview;
        this.storeSetting(NotificationService.SETTINGS_NOTIFICATION_PREVIEW, wantsPreview ? 'true' : 'false');
    }

    /**
     * Sets if the user wants sound when a new message arrives
     */
    public setWantsSound(wantsSound: boolean): void {
        this.$log.debug(this.logTag, 'Requesting sound preference change to', wantsSound);
        this.notificationSound = wantsSound;
        this.storeSetting(NotificationService.SETTINGS_NOTIFICATION_SOUND, wantsSound ? 'true' : 'false');
    }

    /**
     * Stores the given key/value pair in local storage
     */
    private storeSetting(key: string, value: string): void {
        this.settingsService.storeUntrustedKeyValuePair(key, value);
    }

    /**
     * Retrieves the value for the given key from local storage
     */
    private retrieveSetting(key: string): string {
        return this.settingsService.retrieveUntrustedKeyValuePair(key);
    }

    /**
     * Parse the conversation notification settings and return a simplified version.
     */
    public getAppNotificationSettings(conversation: threema.Conversation): threema.SimplifiedNotificationSettings {
        if (!conversation.notifications) {
            return {
                sound: {muted: false},
                dnd: {enabled: false, mentionOnly: false},
            };
        }

        const sound = conversation.notifications.sound;
        const dnd = conversation.notifications.dnd;

        const simpleSound = {
            muted: !(sound.mode === threema.NotificationSoundMode.Default),
        };

        const simpleDnd = {
            enabled: dnd.mode === threema.NotificationDndMode.On,
            mentionOnly: (dnd.mentionOnly === undefined || dnd.mentionOnly === null) ? false : dnd.mentionOnly,
        };

        if (dnd.mode === threema.NotificationDndMode.Until) {
            if (!dnd.until || dnd.until <= 0) {
                simpleDnd.enabled = false;
            } else {
                const until: Date = new Date(dnd.until);
                const now: Date = new Date();
                simpleDnd.enabled = until > now;
            }
        }

        // Mention only does not make sense if DND is not enabled at all.
        if (!simpleDnd.enabled) {
            simpleDnd.mentionOnly = false;
        }

        return {
            sound: simpleSound,
            dnd: simpleDnd,
        };
    }

    /**
     * Return a simplified DND mode.
     *
     * This will return either 'on', 'off' or 'mention'.
     * The 'until' mode will be processed depending on the expiration timestamp.
     */
    public getDndModeSimplified(conversation: threema.Conversation): 'on' | 'mention' | 'off' {
        const simplified = this.getAppNotificationSettings(conversation);
        if (simplified.dnd.enabled) {
            return simplified.dnd.mentionOnly ? 'mention' : 'on';
        }
        return 'off';
    }

    /**
     * Notify the user via Desktop Notification API.
     *
     * Return a boolean indicating whether the notification has been shown.
     *
     * @param tag A tag used to group similar notifications.
     * @param title The notification title
     * @param body The notification body
     * @param avatar URL to the avatar file (optional, default is the Threema logo)
     * @param clickCallback Callback function to be executed on click (optional)
     * @param forceShowBody Show the notification body even if the user has disabled
     *            notification preview (optional, default false)
     * @param overwriteOlder Do not append message to pre-existing notifications with
     *            the same tag, replace them instead (optional, default false)
     */
    public showNotification(tag: string, title: string, body: string,
                            avatar: string = '/img/threema-64x64.png',
                            clickCallback?: any,
                            forceShowBody: boolean = false,
                            overwriteOlder: boolean = false,
                            forceMute: boolean = false): boolean {

        // Play sound on new message if the user wants to
        if (this.notificationSound && !forceMute) {
            const audio = new Audio(NotificationService.NOTIFICATION_SOUND);
            audio.play();
        }

        // Only show notifications if user granted permission to do so
        if (this.notificationPermission !== true || this.desktopNotifications !== true) {
            return false;
        }

        // Clear body string if the user does not want a notification preview
        if (!this.notificationPreview && !forceShowBody) {
            body = '';
            // Clear notification cache
            if (this.notificationCache[tag]) {
                this.clearCache(tag);
            }
        }

        // Clear cache if the user wants to overwrite older messages of the same tag
        if (overwriteOlder === true) {
            this.clearCache(tag);
        }

        // If the cache is not empty, append old messages
        if (this.notificationCache[tag]) {
            body += '\n' + this.notificationCache[tag].body;
        }

        // Show notification
        this.$log.debug(this.logTag, 'Showing notification', tag);
        const notification = new this.$window.Notification(title, {
            icon: avatar,
            body: body.trim(),
            tag: tag,
        });

        // Hide notification on click
        notification.onclick = () => {
            this.$window.focus();

            // Redirect to welcome screen
            if (clickCallback !== undefined) {
                clickCallback();
            }
            this.$log.debug(this.logTag, 'Hiding notification', tag, 'on click');
            notification.close();
            this.clearCache(tag);
        };

        // Update notification cache
        this.notificationCache[tag] = notification;

        return true;
    }

    /**
     * Hide the notification with the specified tag.
     *
     * Return whether the notification was hidden.
     */
    public hideNotification(tag: string): boolean {
        const notification = this.notificationCache[tag];
        if (notification !== undefined) {
            this.$log.debug(this.logTag, 'Hiding notification', tag);
            notification.close();
            this.clearCache(tag);
            return true;
        } else {
            return false;
        }
    }

    /**
     * Clear the notification cache for the specified tag.
     */
    public clearCache(tag: string) {
        delete this.notificationCache[tag];
    }
}
