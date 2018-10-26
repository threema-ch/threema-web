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

import {BatteryStatusService} from './services/battery';
import {BrowserService} from './services/browser';
import {ContactService} from './services/contact';
import {ControllerService} from './services/controller';
import {ControllerModelService} from './services/controller_model';
import {FingerPrintService} from './services/fingerprint';
import {TrustedKeyStoreService} from './services/keystore';
import {MediaboxService} from './services/mediabox';
import {MessageService} from './services/message';
import {MimeService} from './services/mime';
import {NotificationService} from './services/notification';
import {PushService} from './services/push';
import {QrCodeService} from './services/qrcode';
import {ReceiverService} from './services/receiver';
import {SettingsService} from './services/settings';
import {StateService} from './services/state';
import {StringService} from './services/string';
import {TimeoutService} from './services/timeout';
import {TitleService} from './services/title';
import {UriService} from './services/uri';
import {VersionService} from './services/version';
import {WebClientService} from './services/webclient';

// Create services for the controller
angular.module('3ema.services', [])

// Register services
.service('BatteryStatusService', BatteryStatusService)
.service('ContactService', ContactService)
.service('ControllerModelService', ControllerModelService)
.service('FingerPrintService', FingerPrintService)
.service('MessageService', MessageService)
.service('NotificationService', NotificationService)
.service('PushService', PushService)
.service('QrCodeService', QrCodeService)
.service('ReceiverService', ReceiverService)
.service('StateService', StateService)
.service('TimeoutService', TimeoutService)
.service('TitleService', TitleService)
.service('TrustedKeyStore', TrustedKeyStoreService)
.service('WebClientService', WebClientService)
.service('MimeService', MimeService)
.service('BrowserService', BrowserService)
.service('ControllerService', ControllerService)
.service('StringService', StringService)
.service('SettingsService', SettingsService)
.service('MediaboxService', MediaboxService)
.service('UriService', UriService)
.service('VersionService', VersionService)
;
