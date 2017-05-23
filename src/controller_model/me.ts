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

import ControllerModelMode = threema.ControllerModelMode;

export class MeControllerModel implements threema.ControllerModel {
    private logTag: string = '[MeControllerModel]';

    // Angular services
    private $log: ng.ILogService;
    private $translate: ng.translate.ITranslateService;
    private $mdDialog: ng.material.IDialogService;

    // Own services
    private webClientService: WebClientService;

    // Callbacks
    private onRemovedCallback: threema.OnRemovedCallback;

    // Own receiver instance
    private me: threema.MeReceiver;

    // Avatar controller
    private avatarController: AvatarControllerModel;

    // Controller model fields
    public subject: string;
    public isLoading = false;

    // Data shown on page
    public nickname: string;

    // Editing mode
    private mode = ControllerModelMode.VIEW;

    constructor($log: ng.ILogService,
                $translate: ng.translate.ITranslateService,
                $mdDialog: ng.material.IDialogService,
                webClientService: WebClientService,
                mode: ControllerModelMode,
                me?: threema.MeReceiver) {
        this.$log = $log;
        this.$translate = $translate;
        this.$mdDialog = $mdDialog;
        this.me = me;
        this.webClientService = webClientService;
        this.mode = mode;

        switch (mode) {
            /*case ControllerModelMode.EDIT:
                this.subject = $translate.instant('messenger.EDIT_RECEIVER', {
                    receiverName: '@NAME@',
                }).replace('@NAME@', this.me.displayName);
                this.firstName = this.me.firstName;
                this.lastName = this.me.lastName;
                this.avatarController = new AvatarControllerModel(
                    this.$log, this.webClientService, this.me,
                );

                this.access = this.me.access;
                this.firstNameLabel = this.access.canChangeLastName ?
                    $translate.instant('messenger.FIRST_NAME') :
                    $translate.instant('messenger.NAME');
                break;*/
            case ControllerModelMode.VIEW:
                this.subject = $translate.instant('messenger.MY_THREEMA_ID');
                this.nickname = webClientService.getProfile().publicNickname;
                break;
            default:
                $log.error(this.logTag, 'Invalid controller model mode: ', this.getMode());
        }
    }

    /**
     * Set the on removed callback.
     */
    public setOnRemoved(callback: threema.OnRemovedCallback): void {
        this.onRemovedCallback = callback;
    }

    /**
     * Callback called when the members change.
     */
    public onChangeMembers(identities: string[]): void {
        // Not possible
    }

    /**
     * Return the members of this receiver.
     */
    public getMembers(): string[] {
        return [this.me.id];
    }

    /**
     * The editing mode, e.g. view or edit this receiver.
     */
    public getMode(): ControllerModelMode {
        return this.mode;
    }

    /**
     * Can this receiver be cleaned?
     */
    public canClean(): boolean {
        return false;
    }

    /**
     * Delete all messages in this conversation.
     */
    public clean(ev: any): any {
        // No-op
    }

    /**
     * Validate this receiver.
     */
    public isValid(): boolean {
        return (this.me !== null
             && this.me !== undefined
             && this.me.id === this.webClientService.me.id);
    }

    /*
     * Return whether this receiver can be chatted with.
     */
    public canChat(): boolean {
        // You cannot chat with yourself
        return false;
    }

    /**
     * Can this receiver be edited?
     */
    public canEdit(): boolean {
        // The own contact can always be edited
        // TODO: Restrictions?
        // return true;
        return false;
    }

    public canShowQr(): boolean {
        return true;
    }

    /**
     * Save the changes, return a promise with the receiver.
     */
    public save(): Promise<threema.ContactReceiver> {
        /*
        switch (this.getMode()) {
            case ControllerModelMode.EDIT:
                return this.webClientService.modifyProfile(
                    this.nickname,
                    this.avatarController.getAvatar(),
                );
            default:
                this.$log.error(this.logTag, 'Not allowed to save profile: Invalid mode');

        }
        */
        return Promise.reject(null);
    }
}
