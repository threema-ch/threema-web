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

export class GroupControllerModel
        implements threema.ControllerModel<threema.GroupReceiver>,
                   threema.ControllerModelWithMembers {
    // Angular services
    private $translate: ng.translate.ITranslateService;
    private $mdDialog: ng.material.IDialogService;

    // Custom services
    private readonly log: Logger;
    private readonly webClientService: WebClientService;

    // Fields required by interface
    public readonly receiverType = 'group';
    public subject: string;
    public isLoading = false; // TODO: Show loading indicator

    public members: string[];
    public name: string;
    public access: threema.GroupReceiverAccess;

    private addContactPlaceholder: string;
    private group: threema.GroupReceiver | null;
    private avatarController: AvatarControllerModel;
    private mode: ControllerModelMode;
    private onRemovedCallback: threema.OnRemovedCallback;

    constructor($translate: ng.translate.ITranslateService, $mdDialog: ng.material.IDialogService,
                logService: LogService, webClientService: WebClientService,
                mode: ControllerModelMode,
                group?: threema.GroupReceiver) {
        this.$translate = $translate;
        this.$mdDialog = $mdDialog;
        this.log = logService.getLogger('Group-CM');

        if (group === undefined) {
            if (mode !== ControllerModelMode.NEW) {
                throw new Error('GroupControllerModel: Group may not be undefined for mode ' + mode);
            }
        } else {
            this.group = group;
        }
        this.mode = mode;
        this.webClientService = webClientService;
        this.addContactPlaceholder = $translate.instant('messenger.GROUP_SELECT_CONTACTS');

        switch (this.getMode()) {
            case ControllerModelMode.EDIT:
                this.subject = $translate.instant('messenger.EDIT_RECEIVER');
                this.name = this.group!.displayName;
                this.members = this.group!.members;
                this.avatarController = new AvatarControllerModel(
                    logService, this.webClientService, this.group!,
                );
                this.access = this.group!.access;
                break;

            case ControllerModelMode.VIEW:
            case ControllerModelMode.CHAT:
                this.subject = this.group!.displayName;
                this.members = this.group!.members;
                this.access = this.group!.access;
                break;

            case ControllerModelMode.NEW:
                this.subject = $translate.instant('messenger.CREATE_GROUP');
                this.members = [];
                this.avatarController = new AvatarControllerModel(
                    logService, this.webClientService, null,
                );
                break;

            default:
                this.log.error('Invalid controller model mode: ', this.getMode());
        }
    }

    public getMaxMemberSize(): number {
        return this.webClientService.getMaxGroupMemberSize();
    }

    public setOnRemoved(callback: threema.OnRemovedCallback): void {
        this.onRemovedCallback = callback;
    }

    public getMode(): ControllerModelMode {
        return this.mode;
    }

    public isValid(): boolean {
        return this.members.filter((identity: string) => {
            return identity !== this.webClientService.me.id;
        }).length > 0;
    }

    public canChat(): boolean {
        return true;
    }

    public canEdit(): boolean {
        return this.access !== undefined && (
                this.access.canChangeAvatar === true
                || this.access.canChangeName === true
                || this.access.canChangeMembers === true
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
            .cancel(this.$translate.instant('common.CANCEL'));

        this.$mdDialog.show(confirm).then(() => {
            this.reallyClean();
        }, () => {
            this.log.debug('Clean cancelled');
        });
    }

    private reallyClean(): any {
        if (!this.group) {
            this.log.error('reallyClean: Group is null');
            return;
        }
        if (!this.canClean()) {
            this.log.error('Not allowed to clean this group');
            return;
        }

        this.isLoading = true;
        this.webClientService.cleanReceiverConversation(this.group)
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

    public leave(ev): void {
        if (!this.group) {
            this.log.error('leave: Group is null');
            return;
        }
        const confirm = this.$mdDialog.confirm()
            .title(this.$translate.instant('messenger.GROUP_LEAVE'))
            .textContent(this.$translate.instant(
                this.group.administrator === this.webClientService.me.id
                    ? 'messenger.GROUP_REALLY_LEAVE_ADMIN'
                    : 'messenger.GROUP_REALLY_LEAVE'))
            .targetEvent(ev)
            .ok(this.$translate.instant('common.OK'))
            .cancel(this.$translate.instant('common.CANCEL'));

        this.$mdDialog.show(confirm).then(() => {
            this.reallyLeave(this.group!);
        }, () => {
            this.log.debug('Leave cancelled');
        });
    }

    private reallyLeave(group: threema.GroupReceiver): void {
        if (!group.access.canLeave) {
            this.log.error('Cannot leave group');
            return;
        }

        this.isLoading = true;
        this.webClientService.leaveGroup(group)
            .then(() => {
                this.isLoading = false;
            })
            .catch((error) => {
                // TODO: Handle this properly / show an error message
                this.log.error(`Leaving group failed: ${error}`);
                this.isLoading = false;
            });
    }

    public delete(ev): void {
        if (!this.group) {
            this.log.error('delete: Group is null');
            return;
        }

        const confirm = this.$mdDialog.confirm()
            .title(this.$translate.instant('messenger.GROUP_DELETE'))
            .textContent(this.$translate.instant('messenger.GROUP_DELETE_REALLY'))
            .targetEvent(ev)
            .ok(this.$translate.instant('common.OK'))
            .cancel(this.$translate.instant('common.CANCEL'));

        this.$mdDialog.show(confirm).then(() => {
            this.reallyDelete(this.group!);
        }, () => {
            this.log.debug('Delete cancelled');
        });
    }

    private reallyDelete(group: threema.GroupReceiver): void {
        if (!this.access.canDelete) {
            this.log.error('Can not delete group');
            return;
        }

        this.isLoading = true;
        this.webClientService.deleteGroup(group)
            .then(() => {
                this.isLoading = false;
                if (this.onRemovedCallback) {
                    this.onRemovedCallback(group.id);
                }
            })
            .catch((error) => {
                // TODO: Handle this properly / show an error message
                this.log.error(`Deleting group failed: ${error}`);
                this.isLoading = false;
            });
    }

    public sync(ev): void {
        if (!this.group) {
            this.log.error('sync: Group is null');
            return;
        }
        if (!this.access.canSync) {
            this.log.error('Cannot sync group');
            return;
        }

        this.isLoading = true;
        this.webClientService.syncGroup(this.group)
            .then(() => {
                this.isLoading = false;
            })
            .catch((errorCode) => {
                this.isLoading = false;
                this.showError(errorCode);
            });
    }

    public save(): Promise<threema.GroupReceiver> {
        switch (this.getMode()) {
            case ControllerModelMode.EDIT:
                return this.webClientService.modifyGroup(
                    this.group!.id,
                    this.members,
                    this.name,
                    this.avatarController.avatarChanged ? this.avatarController.getAvatar() : undefined,
                );
            case ControllerModelMode.NEW:
                return this.webClientService.createGroup(
                    this.members,
                    (this.name && this.name.length > 0) ? this.name : undefined,
                    this.avatarController.avatarChanged ? this.avatarController.getAvatar() : undefined,
                );
            default:
                this.log.error('Cannot save group, invalid mode');
                return Promise.reject('Cannot save group, invalid mode');
        }
    }

    public onChangeMembers(identities: string[]): void {
        this.members = identities;
    }

    public getMembers(): string[] {
        return this.members;
    }

    /**
     * Show an error message in a dialog.
     */
    private showError(errorCode: string): void {
        if (errorCode === undefined) {
            errorCode = 'unknown';
        }
        this.$mdDialog.show(
            this.$mdDialog.alert()
                .clickOutsideToClose(true)
                .title(this.group ? this.group.displayName : 'Error')
                .textContent(this.$translate.instant('validationError.modifyReceiver.' + errorCode))
                .ok(this.$translate.instant('common.OK')),
        );
    }
}
