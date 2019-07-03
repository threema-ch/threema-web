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

import {Logger} from 'ts-log';

import {arrayToBuffer, hasFeature, sleep} from '../helpers';
import * as clipboard from '../helpers/clipboard';

import {BrowserService} from '../services/browser';
import {LogService} from '../services/log';
import {WebClientService} from '../services/webclient';
import {DialogController} from './dialog';

export class TroubleshootingController extends DialogController {
    public static readonly $inject = [
        '$scope', '$mdDialog', '$mdToast', '$translate',
        'LogService', 'BrowserService', 'WebClientService',
    ];

    private readonly $scope: ng.IScope;
    private readonly $mdToast: ng.material.IToastService;
    private readonly $translate: ng.translate.ITranslateService;
    private readonly logService: LogService;
    private readonly browserService: BrowserService;
    private readonly webClientService: WebClientService;
    private readonly log: Logger;
    public isSending: boolean = false;
    public sendingFailed: boolean = false;
    public description: string = '';

    constructor(
        $scope: ng.IScope,
        $mdDialog: ng.material.IDialogService,
        $mdToast: ng.material.IToastService,
        $translate: ng.translate.ITranslateService,
        logService: LogService,
        browserService: BrowserService,
        webClientService: WebClientService,
    ) {
        super($mdDialog);
        this.$scope = $scope;
        this.$mdToast = $mdToast;
        this.$translate = $translate;
        this.logService = logService;
        this.browserService = browserService;
        this.webClientService = webClientService;
        this.log = logService.getLogger('Troubleshooting-C');
    }

    /**
     * Return whether the web client is currently connected (or able to
     * reconnect on its own).
     */
    public get isConnected(): boolean {
        return this.webClientService.readyToSubmit;
    }

    /**
     * Return whether the log is ready to be sent.
     *
     * This requires...
     *
     * - the web client to be connected (or able to reconnect on its own),
     * - a description of the problem to be populated, and
     * - sending to be not in progress already.
     */
    public get canSend(): boolean {
        return this.isConnected && this.description.length > 0 && !this.isSending;
    }

    /**
     * Send the log to *SUPPORT.
     */
    public async send(): Promise<void> {
        this.isSending = true;
        this.sendingFailed = false;

        // Serialise the log
        const log = new TextEncoder().encode(this.logService.memory.serialize());

        // Error handler
        const fail = () => {
            this.$scope.$apply(() => {
                this.isSending = false;
                this.sendingFailed = true;

                // Show toast
                this.$mdToast.show(this.$mdToast.simple()
                    .textContent(this.$translate.instant('troubleshooting.REPORT_VIA_THREEMA_FAILED'))
                    .position('bottom center'));
            });
        };

        // Add contact *SUPPORT (if needed)
        const support: threema.BaseReceiver = {
            id: '*SUPPORT',
            type: 'contact',
        };
        if (!this.webClientService.contacts.has(support.id)) {
            try {
                await this.webClientService.addContact(support.id);
            } catch (error) {
                this.log.error('Unable to add contact *SUPPORT:', error);
                return fail();
            }
        }

        // Workaround for iOS which does not fetch the feature mask immediately
        // TODO: Remove once IOS-809 has been resolved
        for (let i = 0; i < 50; ++i) {
            const contact = this.webClientService.contacts.get(support.id);
            if (hasFeature(contact, threema.ContactReceiverFeature.FILE, this.log)) {
                break;
            }
            await sleep(100);
        }

        // Send as file to *SUPPORT
        const browser = this.browserService.getBrowser();
        let browserShortInfo = 'unknown';
        if (browser.wasDetermined()) {
            browserShortInfo = `${browser.name}-${browser.version}`;
            if (browser.mobile) {
                browserShortInfo += '-mobile';
            }
        }
        const message: threema.FileMessageData = {
            name: `webclient-[[VERSION]]-${browserShortInfo}.log`,
            fileType: 'text/plain',
            size: log.byteLength,
            data: arrayToBuffer(log),
            caption: this.description,
            sendAsFile: true,
        };
        try {
            await this.webClientService.sendMessage(support, 'file', message, { waitUntilAcknowledged: true });
        } catch (error) {
            this.log.error('Unable to send log report to *SUPPORT:', error);
            return fail();
        }

        // Done
        this.isSending = false;
        this.$mdToast.show(this.$mdToast.simple()
            .textContent(this.$translate.instant('troubleshooting.REPORT_VIA_THREEMA_SUCCESS'))
            .position('bottom center'));

        // Hide dialog
        this.hide();
    }

    /**
     * Copy the log into the clipboard.
     */
    public copyToClipboard(): void {
        // Get the log
        const log = this.getLog();

        // Copy to clipboard
        let toastString = 'messenger.COPIED';
        try {
            clipboard.copyString(log, this.browserService.getBrowser().isSafari());
        } catch (error) {
            this.log.warn('Could not copy text to clipboard:', error);
            toastString = 'messenger.COPY_ERROR';
        }

        // Show toast
        this.$mdToast.show(this.$mdToast.simple()
            .textContent(this.$translate.instant(toastString))
            .position('bottom center'));
    }

    /**
     * Serialise the memory log.
     */
    private getLog(): string {
        // TODO: Add metadata
        return this.logService.memory.serialize();
    }
}
