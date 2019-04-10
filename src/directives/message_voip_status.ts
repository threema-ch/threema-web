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
                    const voip: threema.VoipStatusInfo = this.message.voip;
                    const incoming = !this.message.isOutbox;

                    switch (voip.status) {
                        case threema.VoipStatus.Missed:
                            this.colorClass = 'color-status-error';
                            this.icon = 'call_missed';
                            this.msgString = 'voip.CALL_MISSED';
                            break;
                        case threema.VoipStatus.Finished:
                            this.colorClass = 'color-status-ok';
                            if (incoming) {
                                this.icon = 'call_received';
                                this.msgString = 'voip.CALL_FINISHED_IN';
                            } else {
                                this.icon = 'call_made';
                                this.msgString = 'voip.CALL_FINISHED_OUT';
                            }
                            break;
                        case threema.VoipStatus.Rejected:
                            if (incoming) {
                                this.icon = 'call_missed';
                                switch (voip.reason) {
                                    case threema.VoipRejectReason.Busy:
                                        this.colorClass = 'color-status-error';
                                        this.msgString = 'voip.CALL_MISSED_BUSY';
                                        break;
                                    case threema.VoipRejectReason.Rejected:
                                        this.colorClass = 'color-status-warning';
                                        this.msgString = 'voip.CALL_REJECTED';
                                        break;
                                    case threema.VoipRejectReason.Unknown:
                                    case threema.VoipRejectReason.Timeout:
                                    case threema.VoipRejectReason.Disabled:
                                    default:
                                        this.colorClass = 'color-status-error';
                                        this.msgString = 'voip.CALL_MISSED';
                                        break;
                                }
                            } else {
                                this.icon = 'call_missed_outgoing';
                                this.colorClass = 'color-status-error';
                                switch (voip.reason) {
                                    case threema.VoipRejectReason.Busy:
                                        this.msgString = 'voip.CALL_REJECTED_BUSY';
                                        break;
                                    case threema.VoipRejectReason.Timeout:
                                        this.msgString = 'voip.CALL_REJECTED_UNAVAILABLE';
                                        break;
                                    case threema.VoipRejectReason.Disabled:
                                        this.msgString = 'voip.CALL_REJECTED_DISABLED';
                                        break;
                                    case threema.VoipRejectReason.Rejected:
                                    case threema.VoipRejectReason.Unknown:
                                    default:
                                        this.msgString = 'voip.CALL_REJECTED';
                                        break;
                                }
                            }
                            break;
                        case threema.VoipStatus.Aborted:
                            this.colorClass = 'color-status-warning';
                            this.icon = 'call_missed_outgoing';
                            this.msgString = 'voip.CALL_ABORTED';
                            break;
                    }
                };
            }],
            template: `
                 <p>
                    <md-icon class="material-icons {{ ctrl.colorClass }}">{{ ctrl.icon }}</md-icon>
                    <span translate>{{ ctrl.msgString }}</span>
                </p>
            `,
        };
    },
];
