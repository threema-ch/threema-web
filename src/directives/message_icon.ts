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

export default [
    function() {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                message: '=eeeMessage',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                // Return icon depending on message type.
                const getIcon = (msgType: threema.MessageType) => {
                    switch (msgType) {
                        case 'image':
                            return 'ic_image_24px.svg';
                        case 'video':
                            return 'ic_movie_24px.svg';
                        case 'audio':
                            return 'ic_mic_24px.svg';
                        case 'location':
                            return 'ic_location_on_24px.svg';
                        case 'file':
                            if (this.message.file.type === 'image/gif') {
                                return 'ic_image_24px.svg';
                            }
                            return 'ic_insert_drive_file_24px.svg';
                        case 'ballot':
                            return 'ic_poll_24px.svg';
                        default:
                            return null;
                    }
                };
                this.icon = getIcon(this.message.type);
            }],
            template: `
                <img ng-if="ctrl.icon !== null" ng-src="img/{{ ctrl.icon }}" alt="{{ ctrl.message.type }} icon">
            `,
        };
    },
];
