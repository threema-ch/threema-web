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

angular.module('3ema.directives', []);

import autofocus from './directives/autofocus';
import avatar from './directives/avatar';
import avatarArea from './directives/avatar_area';
import avatarEditor from './directives/avatar_editor';
import batteryStatus from './directives/battery';
import composeArea from './directives/compose_area';
import contactBadge from './directives/contact_badge';
import distributionListBadge from './directives/distribution_list_badge';
import dragFile from './directives/drag_file';
import groupBadge from './directives/group_badge';
import includeReplace from './directives/include_replace';
import latestMessage from './directives/latest_message';
import location from './directives/location';
import mediabox from './directives/mediabox';
import memberListEditor from './directives/member_list_editor';
import message from './directives/message';
import messageContact from './directives/message_contact';
import messageDate from './directives/message_date';
import messageIcon from './directives/message_icon';
import messageMedia from './directives/message_media';
import messageMeta from './directives/message_meta';
import messageQuote from './directives/message_quote';
import messageState from './directives/message_state';
import messageText from './directives/message_text';
import messageVoipStatus from './directives/message_voip_status';
import myIdentity from './directives/my_identity';
import searchbox from './directives/searchbox';
import statusBar from './directives/status_bar';
import threemaAction from './directives/threema_action';
import verificationLevel from './directives/verification_level';

angular.module('3ema.directives').directive('autofocus', autofocus);
angular.module('3ema.directives').directive('avatarArea', avatarArea);
angular.module('3ema.directives').directive('avatarEditor', avatarEditor);
angular.module('3ema.directives').directive('batteryStatus', batteryStatus);
angular.module('3ema.directives').directive('composeArea', composeArea);
angular.module('3ema.directives').directive('eeeAvatar', avatar);
angular.module('3ema.directives').directive('eeeContactBadge', contactBadge);
angular.module('3ema.directives').directive('eeeDistributionListBadge', distributionListBadge);
angular.module('3ema.directives').directive('eeeGroupBadge', groupBadge);
angular.module('3ema.directives').directive('eeeLatestMessage', latestMessage);
angular.module('3ema.directives').directive('eeeMessage', message);
angular.module('3ema.directives').directive('eeeMessageContact', messageContact);
angular.module('3ema.directives').directive('eeeMessageDate', messageDate);
angular.module('3ema.directives').directive('eeeMessageIcon', messageIcon);
angular.module('3ema.directives').directive('eeeMessageMedia', messageMedia);
angular.module('3ema.directives').directive('eeeMessageMeta', messageMeta);
angular.module('3ema.directives').directive('eeeMessageQuote', messageQuote);
angular.module('3ema.directives').directive('eeeMessageState', messageState);
angular.module('3ema.directives').directive('eeeMessageText', messageText);
angular.module('3ema.directives').directive('eeeMessageVoipStatus', messageVoipStatus);
angular.module('3ema.directives').directive('eeeMyIdentity', myIdentity);
angular.module('3ema.directives').directive('eeeVerificationLevel', verificationLevel);
angular.module('3ema.directives').directive('includeReplace', includeReplace);
angular.module('3ema.directives').directive('location', location);
angular.module('3ema.directives').directive('memberListEditor', memberListEditor);
angular.module('3ema.directives').directive('mediabox', mediabox);
angular.module('3ema.directives').directive('searchbox', searchbox);
angular.module('3ema.directives').directive('statusBar', statusBar);
angular.module('3ema.directives').directive('threemaAction', threemaAction);
angular.module('3ema.directives').directive('dragFile', dragFile);
