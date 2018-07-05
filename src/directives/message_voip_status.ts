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

// tslint:disable:max-line-length

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
                this.$onInit = function() {
                    this.status = this.message.voip.status;
                    this.duration = this.message.voip.duration;
                    this.reason = this.message.voip.reason;
                    this.incoming = !this.message.isOutbox;
                    this.outgoing = this.message.isOutbox;
                };
            }],
            template: `
                <p ng-if="ctrl.status === 1">
                    <md-icon class="material-icons color-status-warning">call_missed</md-icon>
                    <span translate>voip.CALL_MISSED</span>
                </p>
                <p ng-if="ctrl.status === 2 && ctrl.incoming">
                    <md-icon class="material-icons color-status-ok">call_received</md-icon>
                    <span translate>voip.CALL_FINISHED_IN</span>
                </p>
                <p ng-if="ctrl.status === 2 && ctrl.outgoing">
                    <md-icon class="material-icons color-status-ok">call_made</md-icon>
                    <span translate>voip.CALL_FINISHED_OUT</span>
                </p>
                <p ng-if="ctrl.status === 3 && ctrl.incoming">
                    <md-icon class="material-icons color-status-error">call_missed</md-icon>
                    <span translate>voip.CALL_REJECTED</span>
                </p>
                <p ng-if="ctrl.status === 3 && ctrl.outgoing">
                    <md-icon class="material-icons color-status-error">call_missed_outgoing</md-icon>
                    <span translate>voip.CALL_REJECTED</span>
                </p>
                <p ng-if="ctrl.status === 4">
                    <md-icon class="material-icons color-status-warning">call_missed_outgoing</md-icon>
                    <span translate>voip.CALL_ABORTED</span>
                </p>
            `,
        };
    },
];
