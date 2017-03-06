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

    private $log: ng.ILogService;
    private $window: ng.IWindowService;
    private $state: ng.ui.IStateService;

    private settingsService: SettingsService;

    // Whether user has granted notification permission
    private mayNotify: boolean = null;

    // Whether user wants to receive desktop notifications
    private desktopNotifications: boolean = null;

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
     * Notifications API is not available, the flag is set to null.
     */
    public requestNotificationPermission(): void {
        /*        if (!('Notification' in this.$window)) {
         // API not available
         this.mayNotify = null;
         } else {
         const Notification = this.$window.Notification;
         if (Notification.permission === 'granted') {
         // Already granted
         this.mayNotify = true;
         } else if (Notification.permission === 'denied') {
         // Not granted
         this.mayNotify = false;
         } else {*/
        // Ask user
        const Notification = this.$window.Notification;
        Notification.requestPermission((result) => {
            if (result === 'granted') {
                this.mayNotify = true;
                this.desktopNotifications = true;
                this.settingsService.storeUntrustedKeyValuePair(NotificationService.SETTINGS_NOTIFICATIONS, "true");
            } else {
                this.mayNotify = false;
                this.desktopNotifications = false;
            }
        });
    }

    public checkNotificationAPI(): void {
        if (!('Notification' in this.$window)) {
            // API not available
            this.mayNotify = null;
        } else {
            const Notification = this.$window.Notification;
            if (Notification.permission === 'granted') {
                // Already granted
                this.mayNotify = true;
            } else if (Notification.permission === 'denied') {
                // Not granted
                this.mayNotify = false;
            }
        }
    }

    public fetchSettings(): void {
        console.info("Fetching notification settings...");
        let notifications = this.settingsService.retrieveUntrustedKeyValuePair(NotificationService.SETTINGS_NOTIFICATIONS);
        if (notifications.length > 0) {
            if (notifications === 'true') {
                // check permission because user may have revoked them
                this.requestNotificationPermission();
            } else if (notifications === 'false') {
                // don´t ask for permissoin
                this.desktopNotifications = false;
            } else {
                // neither true nor false was in local storage, so we have to ask the user if he wants notifications
                this.requestNotificationPermission();
            }
        } else {
            console.info("Preference not set. Requesting permission.");
            this.requestNotificationPermission();
        }

    }

    public getNotificationPermission(): boolean {
        console.info("Notification Permission: " + this.mayNotify);
        return this.mayNotify;
    }

    public getWantsNotifications(): boolean {
        console.info("Wants notifications: " + this.mayNotify);
        return this.desktopNotifications;
    }

    public setWantsNotifications(wantsNotifications: boolean): void {
        if (wantsNotifications) {
            this.requestNotificationPermission();
        } else {
            this.desktopNotifications = false;
            this.settingsService.storeUntrustedKeyValuePair(NotificationService.SETTINGS_NOTIFICATIONS, "false");
        }
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
        if (this.mayNotify !== true || this.desktopNotifications !== true) {
            return false;
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
