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

// TODO: Signature should be: [RTCIceCandidatePairStats, RTCIceCandidateStats, RTCIceCandidateStats]
export type SelectedCandidatePairStats = [RTCIceCandidatePairStats, any, any];

export enum CandidatePairConnectionType {
    NONE = 0,
    DIRECT,
    RELAYED,
}

export class PeerConnectionStatsService {
    // Attributes
    private selectedCandidatePair: SelectedCandidatePairStats;

    /**
     * Update the selected candidate pair.
     */
    public setSelectedCandidatePair(selectedCandidatePair: SelectedCandidatePairStats): void {
        this.selectedCandidatePair = selectedCandidatePair;
    }

    /**
     * Is a selected candidate pair available?
     */
    public get haveSelectedCandidatePair(): boolean {
        return this.selectedCandidatePair !== null;
    }

    /**
     * Return the connection type of the selected candidate pair.
     */
    public get selectedCandidatePairConnectionType(): CandidatePairConnectionType {
        if (!this.haveSelectedCandidatePair) {
            return CandidatePairConnectionType.NONE;
        }
        const [pair, local, remote] = this.selectedCandidatePair;
        if (local.candidateType !== 'relay' && remote.candidateType !== 'relay') {
            return CandidatePairConnectionType.DIRECT;
        } else {
            return CandidatePairConnectionType.RELAYED;
        }
    }
}
