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

import {WebClientService} from '../services/webclient';
import {AvatarControllerModel} from './avatar';

// Type aliases
import ControllerModelMode = threema.ControllerModelMode;

export class ContactControllerModel implements threema.ControllerModel<threema.ContactReceiver> {
    private logTag = '[ContactControllerModel]';

    // Angular services
    private $log: ng.ILogService;
    private $translate: ng.translate.ITranslateService;
    private $mdDialog: ng.material.IDialogService;

    private onRemovedCallback: threema.OnRemovedCallback;
    public firstName?: string;
    public lastName?: string;
    public identity: string;
    public subject: string;
    public access: threema.ContactReceiverAccess;
    public isLoading = false;

    private contact: threema.ContactReceiver | null;
    private webClientService: WebClientService;
    private firstNameLabel: string;
    private avatarController: AvatarControllerModel;
    private mode = ControllerModelMode.NEW;

    constructor($log: ng.ILogService, $translate: ng.translate.ITranslateService, $mdDialog: ng.material.IDialogService,
                webClientService: WebClientService,
                mode: ControllerModelMode,
                contact?: threema.ContactReceiver) {
        this.$log = $log;
        this.$translate = $translate;
        this.$mdDialog = $mdDialog;
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
                    this.$log, this.webClientService, this.contact,
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
                $log.error(this.logTag, 'Invalid controller model mode: ', this.getMode());
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
            this.$log.debug(this.logTag, 'Clean canceled');
        });
    }

    private reallyClean(): any {
        if (!this.contact) {
            this.$log.error(this.logTag, 'reallyClean: Contact is null');
            return;
        }
        if (!this.canClean()) {
            this.$log.error(this.logTag, 'Not allowed to clean this contact');
            return;
        }

        this.isLoading = true;
        this.webClientService.cleanReceiverConversation(this.contact)
            .then(() => {
                this.isLoading = false;
            })
            .catch((error) => {
                // TODO: Handle this properly / show an error message
                this.$log.error(this.logTag, `Cleaning receiver conversation failed: ${error}`);
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
                this.$log.error(this.logTag, 'Cannot save contact, invalid mode');
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
