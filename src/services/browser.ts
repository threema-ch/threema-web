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

import {BrowserInfo} from '../helpers/browser_info';

import BrowserName = threema.BrowserName;

export class BrowserService {
    private logTag: string = '[BrowserService]';

    private browser: BrowserInfo;
    private $log: ng.ILogService;
    private $window: ng.IWindowService;
    private supportsExtendedLocaleCompareCache: boolean;

    public static $inject = ['$log', '$window'];
    constructor($log: ng.ILogService, $window: ng.IWindowService) {
        // Angular services
        this.$log = $log;
        this.$window = $window;
    }

    public getBrowser(): BrowserInfo {
        if (this.browser === undefined) {
            const browser = {
                chrome: false,
                chromeIos: false,
                firefox: false,
                firefoxIos: false,
                ie: false,
                edge: false,
                opera: false,
                safari: false,
            };

            const uagent = this.$window.navigator.userAgent.toLowerCase();

            browser.chrome = /webkit/.test(uagent) && /chrome/.test(uagent) && !/edge/.test(uagent);
            browser.chromeIos = /mozilla/.test(uagent) && /crios/.test(uagent);
            browser.firefox = /mozilla/.test(uagent) && /firefox/.test(uagent);
            browser.firefoxIos = /mozilla/.test(uagent) && /fxios/.test(uagent);
            browser.ie = (/msie/.test(uagent) || /trident/.test(uagent)) && !/edge/.test(uagent);
            browser.edge = /edge/.test(uagent);
            browser.safari = /safari/.test(uagent) && /applewebkit/.test(uagent)
                          && !/chrome/.test(uagent) && !/fxios/.test(uagent) && !/crios/.test(uagent);
            browser.opera = /mozilla/.test(uagent) && /applewebkit/.test(uagent)
                && /chrome/.test(uagent) && /safari/.test(uagent) && /opr/.test(uagent);

            if (browser.opera && browser.chrome) {
                browser.chrome = false;
            }

            let version = null;
            for (const x in browser) {
                if (browser[x]) {
                    let b;
                    if (x === 'ie') {
                        b = 'msie';
                    } else if (x === 'edge') {
                        b = 'edge';
                    } else if (x === 'opera') {
                        b = 'opr';
                    } else if (x === 'firefoxIos') {
                        b = 'fxios';
                    } else if (x === 'chromeIos') {
                        b = 'crios';
                    } else if (x === 'safari') {
                        b = 'version';
                    } else {
                        b = x;
                    }
                    let match = uagent.match(new RegExp('(' + b + ')( |\/)([0-9]+)'));

                    let versionString;
                    if (match) {
                        versionString = match[3];
                    } else {
                        match = uagent.match(new RegExp('rv:([0-9]+)'));
                        versionString = match ? match[1] : '';
                    }
                    const versionInt: number = parseInt(versionString, 10);
                    version = isNaN(versionInt) ? undefined : versionInt;

                    break;
                }
            }

            if (browser.chrome) {
                this.browser = new BrowserInfo(uagent, BrowserName.Chrome, version);
            }
            if (browser.chromeIos) {
                this.browser = new BrowserInfo(uagent, BrowserName.ChromeIos, version, true);
            }
            if (browser.firefox) {
                this.browser = new BrowserInfo(uagent, BrowserName.Firefox, version);
            }
            if (browser.firefoxIos) {
                this.browser = new BrowserInfo(uagent, BrowserName.FirefoxIos, version, true);
            }
            if (browser.ie) {
                this.browser = new BrowserInfo(uagent, BrowserName.InternetExplorer, version);
            }
            if (browser.edge) {
                this.browser = new BrowserInfo(uagent, BrowserName.Edge, version);
            }
            if (browser.safari) {
                const mobile = /mobile/.test(uagent);
                this.browser = new BrowserInfo(uagent, BrowserName.Safari, version, mobile);
            }
            if (browser.opera) {
                this.browser = new BrowserInfo(uagent, BrowserName.Opera, version);
            }
        }

        return this.browser;
    }

    /**
     * Return whether the current browser supports the WebRTC task or not.
     */
    public supportsWebrtcTask() {
        if (this.browser === undefined) {
            this.getBrowser();
        }
        return this.browser.supportsWebrtcTask();
    }

    /**
     * Return whether the browser supports extended `string.localeCompare` options.
     */
    public supportsExtendedLocaleCompare() {
        if (this.supportsExtendedLocaleCompareCache !== undefined) {
            return this.supportsExtendedLocaleCompareCache;
        }

        function getSupport(): boolean {
            try {
                'foo'.localeCompare('bar', 'i');
            } catch (e) {
                return e.name === 'RangeError';
            }
            return false;
        }

        const support = getSupport();
        this.supportsExtendedLocaleCompareCache = support;
        this.$log.debug(this.logTag, 'Browser',
            support ? 'supports' : 'does not support',
            'extended locale compare options');
        return support;
    }
}
