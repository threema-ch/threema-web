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

import {CandidatePairConnectionType, PeerConnectionStatsService} from '../services/peerconnection_stats';

export default [
    '$rootScope',
    'PeerConnectionStatsService',
    function($rootScope: ng.IRootScopeService,
             peerConnectionStatsService: PeerConnectionStatsService) {
        return {
            restrict: 'E',
            scope: {},
            bindToController: {},
            controllerAs: 'ctrl',
            controller: [function() {
                this.available = () => peerConnectionStatsService.haveSelectedCandidatePair;
                this.isDirect = () => {
                    return peerConnectionStatsService.selectedCandidatePairConnectionType
                        === CandidatePairConnectionType.DIRECT;
                };
                this.isRelayed = () => {
                    return peerConnectionStatsService.selectedCandidatePairConnectionType
                        === CandidatePairConnectionType.RELAYED;
                };
            }],
            template: `
                <div class="connection-type">
                    <md-icon ng-if="ctrl.isDirect()"
                             aria-label="Connection type: Direct"
                             title="Direct connection"
                             class="material-icons md-light md-24 direct">compare_arrows</md-icon>
                    <md-icon ng-if="ctrl.isRelayed()"
                             aria-label="Connection type: Relayed"
                             title="Relayed connection"
                             class="material-icons md-light md-24 relayed">compare_arrows</md-icon>
                </div>
            `,
        };
    },
];
