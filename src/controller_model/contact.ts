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
import {ControllerModelMode} from '../types/enums';
import {AvatarControllerModel} from './avatar';

export class ContactControllerModel implements threema.ControllerModel {

    // Angular services
    private $log: ng.ILogService;
    private $translate: ng.translate.ITranslateService;
    private $mdDialog: ng.material.IDialogService;

    private onRemovedCallback: any;
    public firstName: string;
    public lastName: string;
    public identity: string;
    public subject: string;
    public access: threema.ContactReceiverAccess;
    public isLoading = false;

    private contact: threema.ContactReceiver;
    private webClientService: WebClientService;
    private firstNameLabel: string;
    private avatarController: threema.AvatarControllerModel;
    private mode = ControllerModelMode.NEW;

    constructor($log: ng.ILogService, $translate: ng.translate.ITranslateService, $mdDialog: ng.material.IDialogService,
                webClientService: WebClientService,
                mode: ControllerModelMode,
                contact: threema.ContactReceiver = undefined) {
        this.$log = $log;
        this.$translate = $translate;
        this.$mdDialog = $mdDialog;
        this.contact = contact;
        this.webClientService = webClientService;
        this.mode = mode;

        switch (this.getMode()) {
            case ControllerModelMode.EDIT:
                this.subject = $translate.instant('messenger.EDIT_RECEIVER', {
                    receiverName: '@NAME@',
                }).replace('@NAME@', this.contact.displayName);
                this.firstName = this.contact.firstName;
                this.lastName = this.contact.lastName;
                this.avatarController = new AvatarControllerModel(
                    this.$log, this.webClientService, this.contact,
                );

                this.access = this.contact.access;
                this.firstNameLabel = this.access.canChangeLastName ?
                    $translate.instant('messenger.FIRST_NAME') :
                    $translate.instant('messenger.NAME');
                break;

            case ControllerModelMode.VIEW:
                this.subject = this.contact.displayName;
                this.access = this.contact.access;
                break;

            case ControllerModelMode.NEW:
                this.subject = $translate.instant('messenger.ADD_CONTACT');
                break;

            default:
                $log.error('Invalid controller model mode: ', this.getMode());

        }
    }

    public setOnRemoved(callback: any): void {
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

    public canEdit(): boolean {
        return this.access !== undefined && (
            this.access.canChangeAvatar === true
            || this.access.canChangeFirstName === true
            || this.access.canChangeLastName === true
            );
    }

    public save(): Promise<threema.ContactReceiver> {
        switch (this.getMode()) {
            case ControllerModelMode.EDIT:
                return this.webClientService.modifyContact(
                    this.contact.id,
                    this.firstName,
                    this.lastName,
                    this.avatarController.getAvatar(),
                );
            case ControllerModelMode.NEW:
                return this.webClientService.addContact(this.identity);
            default:
                this.$log.error('not allowed to save contact');

        }
    }
}
