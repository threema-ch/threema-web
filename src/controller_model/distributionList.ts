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

export class DistributionListControllerModel implements threema.ControllerModel {

    private $log: ng.ILogService;
    private $translate: ng.translate.ITranslateService;
    private $mdDialog: ng.material.IDialogService;
    public members: string[];
    public name: string;
    public subject: string;
    public isLoading = false;

    private addContactPlaceholder: string;
    private distributionList: threema.DistributionListReceiver;
    private webClientService: WebClientService;
    private mode: ControllerModelMode;
    private onRemovedCallback: any;

    constructor($log: ng.ILogService, $translate: ng.translate.ITranslateService, $mdDialog: ng.material.IDialogService,
                webClientService: WebClientService,
                mode: ControllerModelMode,
                distributionList: threema.DistributionListReceiver = undefined) {
        this.$log = $log;
        this.$translate = $translate;
        this.$mdDialog = $mdDialog;

        this.distributionList = distributionList;
        this.mode = mode;
        this.webClientService = webClientService;
        this.addContactPlaceholder = $translate.instant('messenger.DISTRIBUTION_LIST_SELECT_MEMBERS');

        switch (this.getMode()) {
            case ControllerModelMode.EDIT:
                this.subject = $translate.instant('messenger.EDIT_RECEIVER', {
                    receiverName: '@NAME@',
                }).replace('@NAME@', this.distributionList.displayName);
                this.name = this.distributionList.displayName;
                this.members = this.distributionList.members;
                break;

            case ControllerModelMode.VIEW:
                this.subject = this.distributionList.displayName;
                this.members = this.distributionList.members;
                break;

            case ControllerModelMode.NEW:
                this.subject = $translate.instant('messenger.CREATE_DISTRIBUTION_LIST');
                this.members = [];
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
        return this.members.filter((identity: string) => {
                return identity !== this.webClientService.getMyIdentity().identity;
            }).length > 0;
    }

    public canEdit(): boolean {
        // a distribution list can always be edited
        return true;
    }

    public delete(ev): void {

        let confirm = this.$mdDialog.confirm()
            .title(this.$translate.instant('messenger.DISTRIBUTION_LIST_DELETE'))
            .textContent(this.$translate.instant('messenger.DISTRIBUTION_LIST_DELETE_REALLY'))
            .targetEvent(ev)
            .ok(this.$translate.instant('common.OK'))
            .cancel(this.$translate.instant('common.CANCEL'));

        this.$mdDialog.show(confirm).then(() => {
            this.reallyDelete();

            if (this.onRemovedCallback) {
                this.onRemovedCallback(this.distributionList.id);
            }
        }, () => {
            this.$log.debug('delete canceled');
        });
    }

    private reallyDelete(): void {
        if (!this.distributionList.access.canDelete) {
            this.$log.error('cannot delete distribution list');
            return;
        }

        this.isLoading = true;
        this.webClientService.deleteDistributionList(this.distributionList).then(() => {
            this.isLoading = false;
        }).catch(() => {
            this.isLoading = false;
        });
    }

    public save(): Promise<threema.DistributionListReceiver> {
        switch (this.getMode()) {
            case ControllerModelMode.EDIT:
                return this.webClientService.modifyDistributionList(
                    this.distributionList.id,
                    this.members,
                    this.name,
                );
            case ControllerModelMode.NEW:
                return this.webClientService.createDistributionList(
                    this.members,
                    this.name);
            default:
                this.$log.error('not allowed to save distribution list');

        }
    }

    public onChangeMembers(identities: string[]): void {
        this.members = identities;
    }
}
