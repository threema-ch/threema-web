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
 * This controller handles the HTML page header (e.g. loading scripts and styles).
 */
export class HeaderController {
    // Config
    private config: threema.Config;

    public static $inject = ['CONFIG'];
    constructor(config: threema.Config) {
        this.config = config;
    }

    /**
     * Return whether or not to use the Threema font (Lab Grotesque).
     */
    public useThreemaFont(): boolean {
        // In the officially hosted version, the Threema font is loaded from static.threema.ch.
        // In a self-hosted version, a custom font URL needs to be provided.
        return !this.config.SELF_HOSTED || this.config.FONT_CSS_URL !== null;
    }

    /**
     * Return the URL to the Threema font (Lab Grotesque).
     */
    public fontUrl(): string {
        if (this.config.FONT_CSS_URL === null) {
            return 'https://static.threema.ch/fonts/labgrotesque.css';
        } else {
            return this.config.FONT_CSS_URL;
        }
    }
}
