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

import {WebClientService} from './webclient';

export class ContactService {
    private webClientService: WebClientService;

    public static $inject = ['WebClientService'];
    constructor(webClientService: WebClientService) {
        this.webClientService = webClientService;
    }

    public requiredDetails(contactReceiver: threema.ContactReceiver): Promise<threema.ContactReceiver> {
        return new Promise((resolve, reject) => {
            if (contactReceiver.systemContact === undefined) {
                // load
                this.webClientService.requestContactDetail(contactReceiver)
                    .then(() => {
                        resolve(resolve);
                    })
                    .catch((data) => {
                        reject(data);
                    });
            } else {
                resolve(contactReceiver);
            }
        });
    }

}
