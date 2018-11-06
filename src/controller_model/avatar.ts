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

import {hasValue} from '../helpers';
import {WebClientService} from '../services/webclient';

export class AvatarControllerModel {
    private logTag: string = '[AvatarControllerModel]';

    private $log: ng.ILogService;
    private avatar: ArrayBuffer | null = null;
    private loadAvatar: Promise<ArrayBuffer | null>;
    private onChangeAvatar: (image: ArrayBuffer) => void;
    private _avatarChanged: boolean = false;

    constructor($log: ng.ILogService,
                webClientService: WebClientService,
                receiver: threema.Receiver | null) {
        this.$log = $log;
        this.loadAvatar = new Promise((resolve, reject) => {
            if (!hasValue(receiver)) {
                $log.debug(this.logTag, 'loadAvatar: No receiver defined, no avatar');
                resolve(null);
                return;
            } else if (!hasValue(receiver.avatar) || !hasValue(receiver.avatar.high)) {
                $log.debug(this.logTag, 'loadAvatar: Requesting high res avatar from app');
                webClientService.requestAvatar(receiver, true)
                    .then((data: ArrayBuffer) => resolve(data))
                    .catch((error) => reject(error));
            } else {
                $log.debug(this.logTag, 'loadAvatar: Returning cached version');
                resolve(receiver.avatar.high);
            }
        });

        // bind to the editor
        this.onChangeAvatar = (image: ArrayBuffer) => {
            this.avatar = image;
            this._avatarChanged = true;
        };
    }

    /**
     * Return the avatar bytes (or null if no avatar is defined).
     */
    public getAvatar(): ArrayBuffer | null {
        return this.avatar;
    }

    /**
     * Return whether this avatar was changed.
     *
     * This will return true if an avatar was added or removed. It does not
     * actually look at the content to determine whether the bytes of the
     * avatar really changed.
     */
    public get avatarChanged(): boolean {
        return this._avatarChanged;
    }
}
