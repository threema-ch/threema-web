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

interface Notification {
    actions: string[];
    badge: string;
    body: string;
    data: any;
    dir: 'auto' | 'ltr' | 'rtl';
    lang: string;
    tag: string;
    icon: string;
    requireInteraction: boolean;
    silent: boolean;
    timestamp: any;
    title: string;
    vibrate: number[];
    close(): void;

    onclick: (Event) => void;
    onerror: () => void;
}

interface NotificationInit {
    dir?: 'auto' | 'ltr' | 'rtl';
    lang?: string;
    badge?: string;
    body?: string;
    tag?: string;
    icon?: string;
    data?: any;
    vibrate?: number[];
    renotify?: boolean;
    silent?: boolean;
    sound?: string;
    noscreen?: boolean;
    sticky?: boolean;
}

interface NotificationStatic {
    new(title: string, options?: NotificationInit): Notification;
    permission: string;
    requestPermission(callback: (string) => void): void;
    requestPermission(): Promise<string>;
}

interface Window {
    Notification: NotificationStatic;
}
