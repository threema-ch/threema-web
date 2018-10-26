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

import {AsyncEvent} from 'ts-events';

/**
 * This service is responsible for showing / hiding the media box.
 */
export class MediaboxService {

    private logTag: string = '[MediaboxService]';

    private $log: ng.ILogService;

    /**
     * This event is triggered every time the media element changes.
     *
     * The boolean parameter indicates whether media content is available or not.
     */
    public evtMediaChanged = new AsyncEvent<boolean>();

    /**
     * The full-resolution media data.
     */
    public data: ArrayBuffer | null = null;
    public caption: string = '';
    public filename: string = '';
    public mimetype: string = '';

    public static $inject = ['$log'];
    constructor($log: ng.ILogService) {
        this.$log = $log;
    }

    /**
     * Update media data.
     */
    public setMedia(data: ArrayBuffer, filename: string, mimetype: string, caption: string) {
        this.$log.debug(this.logTag, 'Media data updated');
        this.data = data;
        this.filename = filename;
        this.mimetype = mimetype;
        this.caption = caption;
        this.evtMediaChanged.post(data !== null);
    }

    /**
     * Clear media data.
     */
    public clearMedia() {
        this.$log.debug(this.logTag, 'Media data cleared');
        this.data = null;
        this.filename = '';
        this.mimetype = '';
        this.caption = '';
        this.evtMediaChanged.post(false);
    }

}
