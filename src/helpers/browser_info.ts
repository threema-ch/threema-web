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

export class BrowserInfo {
    private userAgent: string;

    public readonly name: threema.BrowserName | null;
    public readonly version: number | null;
    public readonly mobile: boolean;

    constructor(
        userAgent: string,
        name: threema.BrowserName | null,
        version: number | null,
        mobile: boolean = false,
    ) {
        this.userAgent = userAgent;
        this.name = name;
        this.version = version;
        this.mobile = mobile;
    }

    public wasDetermined(): boolean {
        return this.name !== null && this.version !== null;
    }

    public description(): string {
        if (this.name === null) {
            return 'Unknown';
        }
        let description = '';
        switch (this.name) {
            case threema.BrowserName.Chrome:
                description = 'Chrome ' + this.version;
                break;
            case threema.BrowserName.ChromeIos:
                description = 'Chrome (iOS) ' + this.version;
                break;
            case threema.BrowserName.Firefox:
                description = 'Firefox ' + this.version;
                break;
            case threema.BrowserName.FirefoxIos:
                description = 'Firefox (iOS) ' + this.version;
                break;
            case threema.BrowserName.Edge:
                description = 'Edge ' + this.version;
                break;
            case threema.BrowserName.InternetExplorer:
                description = 'Internet Explorer ' + this.version;
                break;
            case threema.BrowserName.Opera:
                description = 'Opera ' + this.version;
                break;
            case threema.BrowserName.Safari:
                description = 'Safari ' + this.version;
                break;
        }
        if (this.mobile) {
            description += ' [Mobile]';
        }
        return description;
    }

    /**
     * Return whether the current browser supports the WebRTC task or not.
     */
    public supportsWebrtcTask(): boolean {
        switch (this.name) {
            case threema.BrowserName.Safari:
            case threema.BrowserName.FirefoxIos:
            case threema.BrowserName.ChromeIos:
                return false;
            default:
                return true;
        }
    }

    public isFirefox(requireVersion: boolean = false): boolean {
        return this.name === threema.BrowserName.Firefox && (!requireVersion || this.version !== null);
    }

    public isSafari(requireVersion: boolean = false): boolean {
        return this.name === threema.BrowserName.Safari && (!requireVersion || this.version !== null);
    }
}
