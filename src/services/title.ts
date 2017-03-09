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

/**
 * The title service can update the window title.
 */
export class TitleService {

    private $log: ng.ILogService;
    private $document: ng.IDocumentService;

    private DEFAULT_TITLE = 'Threema Web';
    private title: string;
    private unreadCount: number = 0;

    public static $inject = ['$log', '$document'];
    constructor($log: ng.ILogService, $document: ng.IDocumentService) {
        this.$log = $log;
        this.$document = $document;
        this.update();
    }

    public updateUnreadCount(count: number): void {
        this.unreadCount = count;
        this.update();
    }

    private update(): void {
        if (this.unreadCount > 0) {
            this.title = `${this.DEFAULT_TITLE} (${this.unreadCount})`;
        } else {
            this.title = this.DEFAULT_TITLE;
        }
        this.$document[0].title = this.title;
    }

}
