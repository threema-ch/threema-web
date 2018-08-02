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

import {Transition, TransitionService} from '@uirouter/angularjs';

/**
 * Controller to show or hide the "Android / iOS only" note at the bottom of the welcome screen.
 */
export class AndroidIosOnlyController {
    public show: boolean = false;

    public static $inject = ['$transitions'];
    constructor($transitions: TransitionService) {
        $transitions.onStart({}, (trans: Transition) => {
            this.show = trans.to().name === 'welcome';
        });
    }
}
