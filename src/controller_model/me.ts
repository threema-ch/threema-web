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
import {hasValue} from '../helpers';
import {LogService} from '../services/log';
import {WebClientService} from '../services/webclient';
import {AvatarControllerModel} from './avatar';

import ControllerModelMode = threema.ControllerModelMode;

export class MeControllerModel implements threema.ControllerModel<threema.MeReceiver> {
    // Angular services
    private $translate: ng.translate.ITranslateService;
    private $mdDialog: ng.material.IDialogService;

    // Custom services services
    private readonly log: Logger;
    private webClientService: WebClientService;

    // Fields required by interface
    public readonly receiverType = 'me';
    public subject: string;
    public isLoading = false;

    // Own receiver instance
    private me: threema.MeReceiver;

    // Avatar controller
    private avatarController: AvatarControllerModel;

    // Profile data
    public nickname: string;

    // Editing mode
    private mode = ControllerModelMode.VIEW;

    constructor($translate: ng.translate.ITranslateService,
                $mdDialog: ng.material.IDialogService,
                logService: LogService,
                webClientService: WebClientService,
                mode: ControllerModelMode,
                me: threema.MeReceiver) {
        this.log = logService.getLogger('Me-CM');
        this.$translate = $translate;
        this.$mdDialog = $mdDialog;
        this.me = me;
        this.webClientService = webClientService;
        this.mode = mode;

        this.nickname = webClientService.me.publicNickname || '';  // TODO: Make ARP publicNickname non-optional
        switch (mode) {
            case ControllerModelMode.EDIT:
                this.subject = $translate.instant('messenger.EDIT_RECEIVER');
                this.avatarController = new AvatarControllerModel(
                    logService, this.webClientService, this.me,
                );
                break;
            case ControllerModelMode.VIEW:
                this.subject = $translate.instant('messenger.MY_THREEMA_ID');
                break;
            default:
                this.log.error('Invalid controller model mode: ', this.getMode());
        }
    }

    /**
     * Set the on removed callback.
     */
    public setOnRemoved(callback: threema.OnRemovedCallback): void {
        // Not applicable
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
     * The profile can be edited if there are no MDM restrictions.
     */
    public canEdit(): boolean {
        const mdm = this.webClientService.appCapabilities.mdm;
        return mdm === undefined || !mdm.readonlyProfile;
    }

    public canShowQr(): boolean {
        return true;
    }

    /**
     * Save the changes, return a promise.
     */
    public save(): Promise<threema.MeReceiver> {
        switch (this.getMode()) {
            case ControllerModelMode.EDIT:
                return this.webClientService.modifyProfile(
                    this.nickname,
                    this.avatarController.avatarChanged ? this.avatarController.getAvatar() : undefined,
                ).then(() => {
                    // Profile was successfully updated. Update local data.
                    this.webClientService.me.publicNickname = this.nickname;
                    if (this.avatarController.avatarChanged) {
                        const avatar = this.avatarController.getAvatar();
                        if (avatar) {
                            if (!hasValue(this.webClientService.me.avatar)) {
                                this.webClientService.me.avatar = {high: avatar};
                            } else {
                                this.webClientService.me.avatar.high = avatar;
                            }
                        }
                    }
                    return this.me;
                });
            default:
                this.log.error('Not allowed to save profile: Invalid mode');
                return Promise.reject('unknown');
        }
    }
}
