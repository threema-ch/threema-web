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

// Type aliases
import ControllerModelMode = threema.ControllerModelMode;

export class DistributionListControllerModel implements threema.ControllerModel<threema.DistributionListReceiver> {
    private logTag = '[DistributionListControllerModel]';

    private $log: ng.ILogService;
    private $translate: ng.translate.ITranslateService;
    private $mdDialog: ng.material.IDialogService;
    public members: string[];
    public name: string;
    public subject: string;
    public isLoading = false;

    private addContactPlaceholder: string;
    private distributionList: threema.DistributionListReceiver | null;
    private webClientService: WebClientService;
    private mode: ControllerModelMode;
    private onRemovedCallback: threema.OnRemovedCallback;

    constructor($log: ng.ILogService, $translate: ng.translate.ITranslateService, $mdDialog: ng.material.IDialogService,
                webClientService: WebClientService,
                mode: ControllerModelMode,
                distributionList?: threema.DistributionListReceiver) {
        this.$log = $log;
        this.$translate = $translate;
        this.$mdDialog = $mdDialog;

        if (distributionList === undefined) {
            if (mode !== ControllerModelMode.NEW) {
                throw new Error('DistributionListControllerModel: Distribution list ' +
                                'may not be undefined for mode ' + mode);
            }
        } else {
            this.distributionList = distributionList;
        }
        this.mode = mode;
        this.webClientService = webClientService;
        this.addContactPlaceholder = $translate.instant('messenger.DISTRIBUTION_LIST_SELECT_MEMBERS');

        switch (this.getMode()) {
            case ControllerModelMode.EDIT:
                this.subject = $translate.instant('messenger.EDIT_RECEIVER');
                this.name = this.distributionList!.displayName;
                this.members = this.distributionList!.members;
                break;

            case ControllerModelMode.VIEW:
            case ControllerModelMode.CHAT:
                this.subject = this.distributionList!.displayName;
                this.members = this.distributionList!.members;
                break;

            case ControllerModelMode.NEW:
                this.subject = $translate.instant('messenger.CREATE_DISTRIBUTION_LIST');
                this.members = [];
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
        return this.members.filter((identity: string) => {
            return identity !== this.webClientService.me.id;
        }).length > 0;
    }

    public canChat(): boolean {
        return true;
    }

    public canEdit(): boolean {
        // a distribution list can always be edited
        return true;
    }

    public canClean(): boolean {
        return true;
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
            this.$log.debug(this.logTag, 'Clean canceled');
        });
    }

    private reallyClean(): any {
        if (!this.distributionList) {
            this.$log.error(this.logTag, 'reallyClean: Distribution list is null');
            return;
        }
        if (!this.canClean()) {
            this.$log.error(this.logTag, 'Not allowed to clean this distribution list');
            return;
        }

        this.isLoading = true;
        this.webClientService.cleanReceiverConversation(this.distributionList)
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

    public delete(ev): void {
        const confirm = this.$mdDialog.confirm()
            .title(this.$translate.instant('messenger.DISTRIBUTION_LIST_DELETE'))
            .textContent(this.$translate.instant('messenger.DISTRIBUTION_LIST_DELETE_REALLY'))
            .targetEvent(ev)
            .ok(this.$translate.instant('common.OK'))
            .cancel(this.$translate.instant('common.CANCEL'));

        this.$mdDialog.show(confirm).then(() => {
            this.reallyDelete();
        }, () => {
            this.$log.debug(this.logTag, 'Delete canceled');
        });
    }

    private reallyDelete(): void {
        if (!this.distributionList) {
            this.$log.error(this.logTag, 'reallyDelete: Distribution list is null');
            return;
        }
        if (!this.distributionList.access.canDelete) {
            this.$log.error(this.logTag, 'Not allowed to delete this distribution list');
            return;
        }

        this.isLoading = true;
        this.webClientService.deleteDistributionList(this.distributionList).then(() => {
            this.isLoading = false;
            if (this.onRemovedCallback && this.distributionList !== null) {
                this.onRemovedCallback(this.distributionList.id);
            }
        }).catch((error) => {
            // TODO: Handle this properly / show an error message
            this.$log.error(this.logTag, `Deleting distribution list failed: ${error}`);
            this.isLoading = false;
        });
    }

    public save(): Promise<threema.DistributionListReceiver> {
        switch (this.getMode()) {
            case ControllerModelMode.EDIT:
                return this.webClientService.modifyDistributionList(
                    this.distributionList!.id,
                    this.members,
                    this.name,
                );
            case ControllerModelMode.NEW:
                return this.webClientService.createDistributionList(
                    this.members,
                    this.name);
            default:
                this.$log.error(this.logTag, 'Cannot save distribution list, invalid mode');
                return Promise.reject('Cannot save distribution list, invalid mode');
        }
    }

    public onChangeMembers(identities: string[]): void {
        this.members = identities;
    }

    public getMembers(): string[] {
        return this.members;
    }
}
