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
import {LogService} from '../services/log';
import {WebClientService} from '../services/webclient';
import {AvatarControllerModel} from './avatar';

// Type aliases
import ControllerModelMode = threema.ControllerModelMode;

export class ContactControllerModel implements threema.ControllerModel<threema.ContactReceiver> {
    // Angular services
    private $translate: ng.translate.ITranslateService;
    private $mdDialog: ng.material.IDialogService;

    private onRemovedCallback: threema.OnRemovedCallback;
    public firstName?: string;
    public lastName?: string;
    public identity: string;
    public subject: string;
    public access: threema.ContactReceiverAccess;
    public isLoading = false;

    private readonly log: Logger;
    private contact: threema.ContactReceiver | null;
    private webClientService: WebClientService;
    private firstNameLabel: string;
    private avatarController: AvatarControllerModel;
    private mode = ControllerModelMode.NEW;

    constructor($translate: ng.translate.ITranslateService, $mdDialog: ng.material.IDialogService,
                logService: LogService, webClientService: WebClientService,
                mode: ControllerModelMode,
                contact?: threema.ContactReceiver) {
        this.$translate = $translate;
        this.$mdDialog = $mdDialog;
        this.log = logService.getLogger('Contact-CM');

        if (contact === undefined) {
            if (mode !== ControllerModelMode.NEW) {
                throw new Error('ContactControllerModel: Contact may not be undefined for mode ' + mode);
            }
        } else {
            this.contact = contact;
        }
        this.webClientService = webClientService;
        this.mode = mode;

        switch (this.getMode()) {
            case ControllerModelMode.EDIT:
                this.subject = $translate.instant('messenger.EDIT_RECEIVER');
                this.firstName = this.contact!.firstName;
                this.lastName = this.contact!.lastName;
                this.avatarController = new AvatarControllerModel(
                    logService, this.webClientService, this.contact,
                );

                this.access = this.contact!.access;
                this.firstNameLabel = this.access.canChangeLastName ?
                    $translate.instant('messenger.FIRST_NAME') :
                    $translate.instant('messenger.NAME');
                break;

            case ControllerModelMode.VIEW:
            case ControllerModelMode.CHAT:
                this.subject = this.contact!.displayName;
                this.access = this.contact!.access;
                break;

            case ControllerModelMode.NEW:
                this.subject = $translate.instant('messenger.ADD_CONTACT');
                break;

            default:
                this.log.error('Invalid controller model mode: ', this.getMode());
        }
    }

    public setOnRemoved(callback: threema.OnRemovedCallback): void {
        this.onRemovedCallback = callback;
    }

    public getMode(): ControllerModelMode {
        return this.mode;
    }

    public isValid(): boolean {
        // edit and new is always valid
        if (this.getMode() === ControllerModelMode.EDIT) {
            return true;
        }
        return this.identity !== undefined && this.identity.length === 8;
    }

    public canChat(): boolean {
        return this.contact !== null && this.contact.id !== this.webClientService.me.id;
    }

    public canEdit(): boolean {
        return this.access !== undefined && (
            this.access.canChangeAvatar === true
            || this.access.canChangeFirstName === true
            || this.access.canChangeLastName === true
            );
    }

    public canClean(): boolean {
        return this.canChat();
    }

    public clean(ev: any): any {
        const confirm = this.$mdDialog.confirm()
            .title(this.$translate.instant('messenger.DELETE_THREAD'))
            .textContent(this.$translate.instant('messenger.DELETE_THREAD_MESSAGE', {count: 1}))
            .targetEvent(ev)
            .ok(this.$translate.instant('common.YES'))
            .cancel(this.$translate.instant('common.NO'));

        this.$mdDialog.show(confirm).then(() => {
            this.reallyClean();
        }, () => {
            this.log.debug('Clean cancelled');
        });
    }

    private reallyClean(): any {
        if (!this.contact) {
            this.log.error('reallyClean: Contact is null');
            return;
        }
        if (!this.canClean()) {
            this.log.error('Not allowed to clean this contact');
            return;
        }

        this.isLoading = true;
        this.webClientService.cleanReceiverConversation(this.contact)
            .then(() => {
                this.isLoading = false;
            })
            .catch((error) => {
                // TODO: Handle this properly / show an error message
                this.log.error(`Cleaning receiver conversation failed: ${error}`);
                this.isLoading = false;
            });
    }

    public canShowQr(): boolean {
        return false;
    }

    public save(): Promise<threema.ContactReceiver> {
        switch (this.getMode()) {
            case ControllerModelMode.EDIT:
                return this.webClientService.modifyContact(
                    this.contact!.id,
                    this.firstName,
                    this.lastName,
                    this.avatarController.avatarChanged ? this.avatarController.getAvatar() : undefined,
                );
            case ControllerModelMode.NEW:
                return this.webClientService.addContact(this.identity);
            default:
                this.log.error('Cannot save contact, invalid mode');
                return Promise.reject('Cannot save contact, invalid mode');
        }
    }

    public onChangeMembers(identities: string[]): void {
        // Do nothing
    }

    public getMembers(): string[] {
        return [this.identity];
    }
}
