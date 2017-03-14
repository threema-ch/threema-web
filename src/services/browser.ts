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

export class BrowserService {
    private browser: threema.BrowserInfo;
    private $log: ng.ILogService;
    private isPageVisible = true;

    public static $inject = ['$log'];

    constructor($log: ng.ILogService) {
        // Angular services
        this.$log = $log;
        this.initializePageVisibility();
    }

    private initializePageVisibility() {
        let onChange = (isVisible: any) => {
            if (this.isPageVisible !== isVisible) {
                this.isPageVisible = isVisible;
            }
        };

        let pageHiddenKey = 'hidden';

        // add default visibility change listener
        let defaultListener;
        if (pageHiddenKey in document) {
            defaultListener = 'visibilitychange';
        } else if ('mozHidden' in document) {
            pageHiddenKey = 'mozHidden';
            defaultListener = 'mozvisibilitychange';
        } else if ('webkitHidden' in document) {
            pageHiddenKey = 'webkitHidden';
            defaultListener = 'webkitvisibilitychange';
        } else if ('msHidden' in document) {
            pageHiddenKey = 'msHidden';
            defaultListener = 'msvisibilitychange';
        }

        document.addEventListener(defaultListener, function() {
            onChange(!this[pageHiddenKey]);
        });

        // configure other document and window events
        const map = {
            focus: true,
            blur: false,
        };

        for (let event in map) {
            if (map[event] !== undefined) {
                document.addEventListener(event, () => {
                    onChange(map[event]);
                }, false);

                window.addEventListener(event, () => {
                    onChange(map[event]);
                }, false);
            }
        }

        // initial visible state set
        if (document[pageHiddenKey] !== undefined ) {
            onChange(!document[pageHiddenKey]);
        }
    }

    public getBrowser(): threema.BrowserInfo {
        if (this.browser === undefined) {
            this.browser = {
                chrome: false,
                firefox: false,
                msie: false,
                opera: false,
                safari: false,
                version: '',
                textInfo: 'Unknown',
            } as threema.BrowserInfo;

            const uagent = navigator.userAgent.toLowerCase();

            this.browser.chrome  = /webkit/.test(uagent)  && /chrome/.test(uagent) && !/edge/.test(uagent);
            this.browser.firefox = /mozilla/.test(uagent) && /firefox/.test(uagent);
            this.browser.msie    = /msie/.test(uagent) || /trident/.test(uagent) || /edge/.test(uagent);
            this.browser.safari  = /safari/.test(uagent)  && /applewebkit/.test(uagent) && !/chrome/.test(uagent);
            this.browser.opera   = /mozilla/.test(uagent) && /applewebkit/.test(uagent)
                && /chrome/.test(uagent) && /safari/.test(uagent) && /opr/.test(uagent);
            this.browser.version = '';

            if (this.browser.opera && this.browser.chrome) {
                this.browser.chrome = false;
            }

            for (let x in this.browser) {
                if (this.browser[x]) {
                    let b;
                    if (x === 'msie') {
                        b = 'msie|edge';
                    } else if (x === 'opera') {
                        b = 'opr';
                    } else {
                        b = x;
                    }
                    let match = uagent.match(new RegExp('(' + b + ')( |\/)([0-9]+)'));

                    if (match) {
                        this.browser.version = match[3];
                    } else {
                        match = uagent.match(new RegExp('rv:([0-9]+)'));
                        this.browser.version = match ? match[1] : '';
                    }
                    break;
                }
            }

            if (this.browser.chrome) { this.browser.textInfo = 'Chrome ' + this.browser.version; }
            if (this.browser.firefox) { this.browser.textInfo = 'Firefox ' + this.browser.version; }
            if (this.browser.msie) { this.browser.textInfo = 'IE/Edge ' + this.browser.version; }
            if (this.browser.safari) { this.browser.textInfo = 'Safari ' + this.browser.version; }
            if (this.browser.opera) { this.browser.textInfo = 'Opera ' + this.browser.version; }
        }

        return this.browser;
    }

    public isVisible() {
        return this.isPageVisible;
    }
}
