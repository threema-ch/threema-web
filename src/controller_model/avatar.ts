import {WebClientService} from "../services/webclient";
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

export class AvatarControllerModel implements threema.AvatarControllerModel {
    private $log: ng.ILogService;
    private avatar: ArrayBuffer = null;
    private loadAvatar: Promise<string>;
    public onChangeAvatar: (image: ArrayBuffer) => void;

    constructor($log: ng.ILogService,
                webClientService: WebClientService,
                receiver: threema.Receiver) {
        this.$log = $log;
        this.loadAvatar = new Promise((resolve, reject) => {
            if (receiver === null) {
                resolve(null);
                return;
            }
            if (receiver.avatar.high === undefined) {
                webClientService.requestAvatar(receiver, true)
                    .then((image: string) => resolve(image))
                    .catch(() => reject());
            } else {
                resolve(receiver.avatar.high);
            }
        });

        // bind to the editor
        this.onChangeAvatar = (image: ArrayBuffer) => {
            this.avatar = image;
        };
    }

    public getAvatar(): ArrayBuffer | null {
        return this.avatar;
    }
}
