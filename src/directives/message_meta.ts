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
            transclude: true,
            scope: {},
            bindToController: {
                message: '=eeeMessage',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                this.$onInit = function() {
                    const msg = this.message as threema.Message;

                    this.type = msg.type;
                    this.isGif = msg.file !== undefined && msg.file.type === 'image/gif';

                    // For audio, video or voip call, retrieve the duration
                    this.duration = null;
                    if (msg.audio !== undefined) {
                        this.duration = msg.audio.duration;
                    } else if (msg.video !== undefined) {
                        this.duration = msg.video.duration;
                    } else if (msg.voip !== undefined && msg.voip.duration) {
                        this.duration = msg.voip.duration;
                    }
                };
            }],
            template: `
                <span ng-if="ctrl.isGif" class="message-meta-item">GIF</span>
                <span ng-if="ctrl.duration" class="message-meta-item message-duration">
                    <md-icon class="material-icons">av_timer</md-icon>
                    {{ctrl.duration | duration}}
                </span>
            `,
        };
    },
];
