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

import {ContactControllerModel} from '../controller_model/contact';
import {DistributionListControllerModel} from '../controller_model/distributionList';
import {GroupControllerModel} from '../controller_model/group';
import {ControllerModelMode} from '../types/enums';
import {WebClientService} from "./webclient";

/**
 * Factory to create ControllerModels
 */
export class ControllerModelService {
    private $log: ng.ILogService;
    private $translate: ng.translate.ITranslateService;
    private $mdDialog: ng.material.IDialogService;
    private webClientService: WebClientService;

    public static $inject = ['$log', '$translate', '$mdDialog', 'WebClientService'];
    constructor($log: ng.ILogService, $translate: ng.translate.ITranslateService,
                $mdDialog: ng.material.IDialogService, webClientService: WebClientService) {
        this.$log = $log;
        this.$translate = $translate;
        this.$mdDialog = $mdDialog;
        this.webClientService = webClientService;
    }

    public contact(receiver: threema.ContactReceiver, mode: ControllerModelMode): threema.ControllerModel {
        return new ContactControllerModel(
            this.$log,
            this.$translate,
            this.$mdDialog,
            this.webClientService,
            mode,
            receiver,
        );
    }

    public group(receiver: threema.GroupReceiver, mode: ControllerModelMode): threema.ControllerModel {
        return new GroupControllerModel(
            this.$log,
            this.$translate,
            this.$mdDialog,
            this.webClientService,
            mode,
            receiver,
        );
    }

    public distributionList(receiver: threema.DistributionListReceiver,
                            mode: ControllerModelMode): threema.ControllerModel {
        return new DistributionListControllerModel(
            this.$log,
            this.$translate,
            this.$mdDialog,
            this.webClientService,
            mode,
            receiver,
        );
    }

}
