const BrowserName = {
    Chrome: 'chrome',
    ChromeIos: 'chromeIos',
    Firefox: 'firefox',
    FirefoxIos: 'firefoxIos',
    InternetExplorer: 'ie',
    Edge: 'edge',
    Opera: 'opera',
    Safari: 'safari',
};

describe('BrowserService', function() {

    function testUserAgent(agent) {
        let $service;
        module('3ema.services');
        module(function($provide) {
            $provide.value('$window', {
                navigator: { userAgent: agent }
            });
        });
        inject(function(BrowserService) {
            $service = BrowserService;
        });
        return $service;
    }

    it('firefox', () => {
        const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:59.0) Gecko/20100101 Firefox/59.0';
        const service = testUserAgent(ua);
        const browser = service.getBrowser();
        expect(browser.name).toEqual(BrowserName.Firefox);
        expect(browser.version).toEqual(59);
        expect(browser.mobile).toBe(false);
        expect(browser.description()).toEqual('Firefox 59');
    });

    it('firefoxIosMobile', () => {
        const ua = 'Mozilla/5.0 (iPad; CPU OS 10_0_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) FxiOS/8.3b5826 Mobile/14A403 Safari/602.1.50';
        const service = testUserAgent(ua);
        const browser = service.getBrowser();
        expect(browser.name).toBe(BrowserName.FirefoxIos);
        expect(browser.version).toEqual(8);
        expect(browser.mobile).toBe(true);
        expect(browser.description()).toEqual('Firefox (iOS) 8 [Mobile]');
    });

    it('chrome', () => {
        const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.162 Safari/537.36';
        const service = testUserAgent(ua);
        const browser = service.getBrowser();
        expect(browser.name).toBe(BrowserName.Chrome);
        expect(browser.version).toEqual(65);
        expect(browser.mobile).toBe(false);
        expect(browser.description()).toEqual('Chrome 65');
    });

    it('chromeIosMobile', () => {
        const ua = 'Mozilla/5.0 (iPad; CPU OS 10_0_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/68.0.3440.83 Mobile/14A403 Safari/602.1';
        const service = testUserAgent(ua);
        const browser = service.getBrowser();
        expect(browser.name).toBe(BrowserName.ChromeIos);
        expect(browser.version).toEqual(68);
        expect(browser.mobile).toBe(true);
        expect(browser.description()).toEqual('Chrome (iOS) 68 [Mobile]');
    });

    it('ie9', () => {
        const ua = 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 7.1; Trident/5.0)';
        const service = testUserAgent(ua);
        const browser = service.getBrowser();
        expect(browser.name).toBe(BrowserName.InternetExplorer);
        expect(browser.version).toEqual(9);
        expect(browser.mobile).toBe(false);
        expect(browser.description()).toEqual('Internet Explorer 9');
    });

    it('ie11', () => {
        const ua = 'Mozilla/5.0 (compatible, MSIE 11, Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';
        const service = testUserAgent(ua);
        const browser = service.getBrowser();
        expect(browser.name).toBe(BrowserName.InternetExplorer);
        expect(browser.version).toEqual(11);
        expect(browser.mobile).toBe(false);
        expect(browser.description()).toEqual('Internet Explorer 11');
    });

    it('edge12', () => {
        const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246';
        const service = testUserAgent(ua);
        const browser = service.getBrowser();
        expect(browser.name).toBe(BrowserName.Edge);
        expect(browser.version).toEqual(12);
        expect(browser.mobile).toBe(false);
        expect(browser.description()).toEqual('Edge 12');
    });

    it('opera', () => {
        const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.186 Safari/537.36 OPR/51.0.2830.55';
        const service = testUserAgent(ua);
        const browser = service.getBrowser();
        expect(browser.name).toBe(BrowserName.Opera);
        expect(browser.version).toEqual(51);
        expect(browser.mobile).toBe(false);
        expect(browser.description()).toEqual('Opera 51');
    });

    it('safari7', () => {
        const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.75.14 (KHTML, like Gecko) Version/7.0.3 Safari/7046A194A';
        const service = testUserAgent(ua);
        const browser = service.getBrowser();
        expect(browser.name).toBe(BrowserName.Safari);
        expect(browser.version).toEqual(7);
        expect(browser.mobile).toBe(false);
        expect(browser.description()).toEqual('Safari 7');
    });

    it('safari11', () => {
        const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/604.5.6 (KHTML, like Gecko) Version/11.0.3 Safari/604.5.6';
        const service = testUserAgent(ua);
        const browser = service.getBrowser();
        expect(browser.name).toBe(BrowserName.Safari);
        expect(browser.version).toEqual(11);
        expect(browser.mobile).toBe(false);
        expect(browser.description()).toEqual('Safari 11');
    });

    it('safari10Mobile', () => {
        const ua = 'Mozilla/5.0 (iPad; CPU OS 10_0_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/14A403 Safari/602.1';
        const service = testUserAgent(ua);
        const browser = service.getBrowser();
        expect(browser.name).toBe(BrowserName.Safari);
        expect(browser.version).toEqual(10);
        expect(browser.mobile).toBe(true);
        expect(browser.description()).toEqual('Safari 10 [Mobile]');
    });

});
