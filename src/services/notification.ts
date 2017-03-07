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

import Receiver = threema.Receiver;
import SettingsService = threema.SettingsService;
export class NotificationService implements threema.NotificationService {

    private static SETTINGS_NOTIFICATIONS = 'notifications';
    private static SETTINGS_NOTIFICATION_PREVIEW = 'notificationPreview';

    private $log: ng.ILogService;
    private $window: ng.IWindowService;
    private $state: ng.ui.IStateService;

    private settingsService: SettingsService;

    // Whether user has granted notification permission
    private notificationPermission: boolean = null;
    // Whether user wants to receive desktop notifications
    private desktopNotifications: boolean = null;
    // Whether the browser supports notifications
    private notificationAPIAvailable: boolean = null;
    // Whether the user wants notification preview
    private notificationPreview: boolean = null;

    // Cache notifications
    private notificationCache: any = {};

    public static $inject = ['$log', '$window', '$state', 'SettingsService'];

    constructor($log: ng.ILogService, $window: ng.IWindowService, $state: ng.ui.IStateService, settingsService: SettingsService) {
        this.$log = $log;
        this.$window = $window;
        this.$state = $state;
        this.settingsService = settingsService;
    }

    /**
     * Ask user for desktop notification permissions.
     *
     * Updates internal `maxNotify` flag. If the user accepts, the is set to to
     * true. If the user declines, the flag is set to false. If the
     * user makes no choice, the flag is set to null
     */
    private requestNotificationPermission(): void {
        const Notification = this.$window.Notification;
        console.info("Requesting notification permission...");
        Notification.requestPermission((result) => {
            switch (result) {
                case 'denied':
                    this.notificationPermission = false;
                    break;
                case 'granted':
                    this.notificationPermission = true;
                    this.desktopNotifications = true;
                    this.settingsService.storeUntrustedKeyValuePair(NotificationService.SETTINGS_NOTIFICATIONS, "true");
                    break;
                case 'default':
                    this.desktopNotifications = false;
                    this.notificationPermission = null;
                    break;
                default:
                    this.notificationPermission = false;
                    break;
            }
        });
    }

    /**
     * Check the notification api availability and permission state
     *
     * Denied: Don´t ask again, user must manually re-grant permission
     * via browser settings
     * Granted: We have the (browser-)permission to send notifications
     * Default: Initially state on first visit
     */
    public checkNotificationAPI(): void {
        console.info("Checking notification API...");
        this.notificationAPIAvailable = ('Notification' in this.$window);
        console.log("The notification api is " + this.notificationAPIAvailable);
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

    public fetchSettings(): void {
        console.info("Fetching notification settings...");
        let notifications = this.settingsService.retrieveUntrustedKeyValuePair(NotificationService.SETTINGS_NOTIFICATIONS);
        let preview = this.settingsService.retrieveUntrustedKeyValuePair(NotificationService.SETTINGS_NOTIFICATION_PREVIEW);
        if (notifications.length > 0) {
            if (notifications === 'true') {
                this.desktopNotifications = true;
                // check permission because user may have revoked them
                this.requestNotificationPermission();
            } else if (notifications === 'false') {
                // user does not want notifications
                this.desktopNotifications = false;
            } else {
                // neither true nor false was in local storage, so we have to ask the user if he wants notifications
                this.requestNotificationPermission();
            }
        } else {
            console.info("Preference not set. Requesting permission.");
            this.requestNotificationPermission();
        }

        if (preview === 'false') {
            this.notificationPreview = false;
        } else {
            this.notificationPreview = true;
            this.settingsService.storeUntrustedKeyValuePair(NotificationService.SETTINGS_NOTIFICATION_PREVIEW, "true");
        }


    }

    public getNotificationPermission(): boolean {
        console.info("Notification Permission: " + this.notificationPermission);
        return this.notificationPermission;
    }

    public getWantsNotifications(): boolean {
        console.info("Wants notifications: " + this.desktopNotifications);
        return this.desktopNotifications;
    }

    public getWantsPreview(): boolean {
        return this.notificationPreview;
    }

    public isNotificationApiAvailable(): boolean {
        return this.notificationAPIAvailable;
    }

    public setWantsNotifications(wantsNotifications: boolean): void {
        if (wantsNotifications) {
            this.requestNotificationPermission();
        } else {
            this.desktopNotifications = false;
            this.settingsService.storeUntrustedKeyValuePair(NotificationService.SETTINGS_NOTIFICATIONS, "false");
        }
    }

    public setWantsPreview(wantsPreview: boolean): void {
        this.notificationPreview = wantsPreview;
        this.settingsService.storeUntrustedKeyValuePair(NotificationService.SETTINGS_NOTIFICATION_PREVIEW, wantsPreview.toString());
    }

    /**
     * Notify the user via Desktop Notification API.
     *
     * Return a boolean indicating whether the notification has been shown.
     *
     * @param tag A tag used to group similar notifications.
     * @param title The notification title
     * @param body The notification body
     * @param avatar URL to the avatar file
     * @param clickCallback Callback function to be executed on click
     */
    public showNotification(tag: string, title: string, body: string,
                            avatar: string = '/img/threema-64x64.png', clickCallback: any): boolean {
        // Only show notifications if user granted permission to do so
        if (this.notificationPermission !== true || this.desktopNotifications !== true) {
            return false;
        }

        if (!this.notificationPreview) {
            body = '';
        }

        // If the cache is not empty, append old messages
        if (this.notificationCache[tag]) {
            body += '\n' + this.notificationCache[tag].body;
        }

        // Show notification
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
            notification.close();
            this.clearCache(tag);
        };

        // Update notification cache
        this.notificationCache[tag] = notification;

        return true;
    }

    /**
     * Clear the notification cache for the specified tag.
     */
    public clearCache(tag: string) {
        delete this.notificationCache[tag];
    }
}
