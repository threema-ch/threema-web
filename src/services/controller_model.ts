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

import {ContactControllerModel} from '../controller_model/contact';
import {DistributionListControllerModel} from '../controller_model/distributionList';
import {GroupControllerModel} from '../controller_model/group';
import {MeControllerModel} from '../controller_model/me';
import {LogService} from './log';
import {WebClientService} from './webclient';

// Type aliases
import ControllerModelMode = threema.ControllerModelMode;

/**
 * Factory to create ControllerModels
 */
export class ControllerModelService {
    private readonly $translate: ng.translate.ITranslateService;
    private readonly $mdDialog: ng.material.IDialogService;
    private readonly logService: LogService;
    private readonly webClientService: WebClientService;
    private readonly log: Logger;

    public static $inject = ['$translate', '$mdDialog', 'LogService', 'WebClientService'];
    constructor($translate: ng.translate.ITranslateService, $mdDialog: ng.material.IDialogService,
                logService: LogService, webClientService: WebClientService) {
        this.$translate = $translate;
        this.$mdDialog = $mdDialog;
        this.logService = logService;
        this.webClientService = webClientService;
        this.log = logService.getLogger('ControllerModel-S');
    }

    public me(
        receiver: threema.MeReceiver,
        mode: ControllerModelMode,
    ): threema.ControllerModel<threema.MeReceiver> {
        return new MeControllerModel(
            this.$translate,
            this.$mdDialog,
            this.logService,
            this.webClientService,
            mode,
            receiver,
        );
    }

    public contact(
        receiver: threema.ContactReceiver,
        mode: ControllerModelMode,
    ): threema.ControllerModel<threema.ContactReceiver> {
        return new ContactControllerModel(
            this.$translate,
            this.$mdDialog,
            this.logService,
            this.webClientService,
            mode,
            receiver,
        );
    }

    public group(
        receiver: threema.GroupReceiver,
        mode: ControllerModelMode,
    ): threema.ControllerModel<threema.GroupReceiver> {
        return new GroupControllerModel(
            this.$translate,
            this.$mdDialog,
            this.logService,
            this.webClientService,
            mode,
            receiver,
        );
    }

    public distributionList(
        receiver: threema.DistributionListReceiver,
        mode: ControllerModelMode,
    ): threema.ControllerModel<threema.DistributionListReceiver> {
        return new DistributionListControllerModel(
            this.$translate,
            this.$mdDialog,
            this.logService,
            this.webClientService,
            mode,
            receiver,
        );
    }

}
