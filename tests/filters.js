afterEach(function () {
    jasmine.clock().uninstall();
});

describe('Filters', function() {

    let $filter;

    // Ignoring page reload request
    beforeAll(() => window.onbeforeunload = () => null);
    let webClientServiceMock = {
        me: {
            id: 'MEMEMEME',
            displayName: 'Er'
        },
        contacts: {
            get: function(id) {
                if (id === 'AAAAAAAA') {
                    return {
                        displayName: 'ContactA'
                    }
                }
                else if (id === 'XXXXXXXX') {
                    return {
                        displayName: 'ContactX'
                    }
                }
                else if (id === '*AAAAAAA') {
                    return {
                        displayName: 'GWContactA'
                    }
                }
                else if (id === 'BAD0BAD1') {
                    return {
                        displayName: '<b>< script >foo&ndash;</b>< script>',
                    }
                }
                return null;
            }
        }
    };

    let translationMock = {
        instant: function(label) {
            return label;
        }
    };

    beforeEach(function() {
        module('3ema.services');
        module('3ema.filters');

        module(function($provide) {
            $provide.value('WebClientService', webClientServiceMock);
            $provide.value('$translate', translationMock);
            $provide.constant('$state', null);
        });

        // Inject the $filter function
        inject(function(_$filter_) {
            $filter = _$filter_;
        });
    });

    function testPatterns(filterName, cases) {
        const filter = $filter(filterName);
        for (let testcase of cases) {
            const input = testcase[0];
            const expected = testcase[1];
            expect(filter(input)).toEqual(expected);
        };
    };

    describe('escapeHtml', function() {

        this.testPatterns = (cases) => testPatterns('escapeHtml', cases);

        it('escapes html tags', () => {
            this.testPatterns([
                ['<h1>heading</h1>', '&lt;h1&gt;heading&lt;/h1&gt;'],
                ['<b>< script >foo&ndash;</b>< script>', '&lt;b&gt;&lt; script &gt;foo&amp;ndash;&lt;/b&gt;&lt; script&gt;'],
                ['<a href="/">a</a>', '&lt;a href=&quot;/&quot;&gt;a&lt;/a&gt;'],
            ]);
        });

    });

    describe('mentionify', function() {

        this.testPatterns = (cases) => testPatterns('mentionify', cases);

        it('no mentions', () => {
            this.testPatterns([
                ['', ''],
                ['hello my friend', 'hello my friend'],
                ['@[AAAAAAA]', '@[AAAAAAA]'],
                ['this is not a valid @[AAAAAAA]', 'this is not a valid @[AAAAAAA]'],
                ['@[@@@@@@@]', '@[@@@@@@@]'],
                ['this is not a valid @[@@@@@@@]', 'this is not a valid @[@@@@@@@]'],
            ]);
        });

        it('mention - no contacts', () => {
            this.testPatterns([
                ['@[BBBBBBBB]', '@[BBBBBBBB]'],
                ['@[*BBBBBBB]', '@[*BBBBBBB]'],
            ]);
        });

        it('mention - contact', () => {
            this.testPatterns([
                ['@[AAAAAAAA]', '<span class="mention id AAAAAAAA" text="@[AAAAAAAA]">ContactA</span>'],
                ['hello @[AAAAAAAA]. @[AAAAAAAA] you are my friend', 'hello <span class="mention id AAAAAAAA" text="@[AAAAAAAA]">ContactA</span>. <span class="mention id AAAAAAAA" text="@[AAAAAAAA]">ContactA</span> you are my friend'],
                ['@[AAAAAAAA] @[AAAAAAAA] @[AAAAAAAA]', '<span class="mention id AAAAAAAA" text="@[AAAAAAAA]">ContactA</span> <span class="mention id AAAAAAAA" text="@[AAAAAAAA]">ContactA</span> <span class="mention id AAAAAAAA" text="@[AAAAAAAA]">ContactA</span>']
            ]);
        });

        it('mention - all', () => {
            this.testPatterns([
                ['@[@@@@@@@@]', '<span class="mention all" text="@[@@@@@@@@]">messenger.ALL</span>'],
                ['@[@@@@@@@@] your base are belong to us', '<span class="mention all" text="@[@@@@@@@@]">messenger.ALL</span> your base are belong to us'],
                ['@[@@@@@@@@] @[@@@@@@@@] @[@@@@@@@@]', '<span class="mention all" text="@[@@@@@@@@]">messenger.ALL</span> <span class="mention all" text="@[@@@@@@@@]">messenger.ALL</span> <span class="mention all" text="@[@@@@@@@@]">messenger.ALL</span>']
            ]);
        });

        it('mention - mixed', () => {
            this.testPatterns([
                ['@[@@@@@@@@] @[AAAAAAAA] @[BBBBBBBB]', '<span class="mention all" text="@[@@@@@@@@]">messenger.ALL</span> <span class="mention id AAAAAAAA" text="@[AAAAAAAA]">ContactA</span> @[BBBBBBBB]'],
            ]);
        });

        it('mention - me contact', () => {
            this.testPatterns([
                ['@[MEMEMEME]', '<span class="mention me" text="@[MEMEMEME]">Er</span>'],
                ['hello @[MEMEMEME]. @[MEMEMEME] you are my friend', 'hello <span class="mention me" text="@[MEMEMEME]">Er</span>. <span class="mention me" text="@[MEMEMEME]">Er</span> you are my friend'],
                ['@[MEMEMEME] @[MEMEMEME] @[MEMEMEME]', '<span class="mention me" text="@[MEMEMEME]">Er</span> <span class="mention me" text="@[MEMEMEME]">Er</span> <span class="mention me" text="@[MEMEMEME]">Er</span>']
            ]);
        });

        it('mention - escape html parameters', () => {
            this.testPatterns([
                ['@[BAD0BAD1]', '<span class="mention id BAD0BAD1" text="@[BAD0BAD1]">&lt;b&gt;&lt; script &gt;foo&amp;ndash;&lt;/b&gt;&lt; script&gt;</span>'],
            ]);
        });
    });

    describe('nlToBr', function() {

        this.testPatterns = (cases) => testPatterns('nlToBr', cases);

        it('converts newlines (enabled=true)', () => {
            const filter = $filter('nlToBr');
            expect(filter('abc \n def', true)).toEqual('abc <br> def');
            expect(filter('a\nb\nc\\n', true)).toEqual('a<br>b<br>c\\n');
        });

        it('does not converts newlines (enabled=false)', () => {
            const filter = $filter('nlToBr');
            expect(filter('abc\ndef', false)).toEqual('abc\ndef');
        });

        it('if enabled flag is not set, converts newlines', () => {
            const filter = $filter('nlToBr');
            expect(filter('abc\ndef')).toEqual('abc<br>def');
        });
    });

    describe('unixToTimestring', function() {
        this.testPatterns = (cases) => testPatterns('unixToTimestring', cases);

        it('shows only time for today', () => {
            const d1 = new Date(); d1.setHours(8); d1.setMinutes(7);
            const d2 = new Date(); d2.setHours(12); d2.setMinutes(14);
            const d3 = new Date(); d3.setHours(0); d3.setMinutes(0);
            this.testPatterns([
                [d1.getTime() / 1000, '08:07'],
                [d2.getTime() / 1000, '12:14'],
                [d3.getTime() / 1000, '00:00'],
            ]);
        });

        it('shows full date with forceFull flag', () => {
            const d = new Date();
            const formatted = $filter('unixToTimestring')(d.getTime() / 1000, true);
            expect(formatted.length > 10).toBe(true);
            expect(formatted).toContain(d.getFullYear().toString());
        });

        it('shows "yesterday" for yesterday', () => {
            const d1 = new Date();
            const ts = d1.getTime();
            const d2 = new Date(ts - 1000 * 60 * 60 * 24);
            d2.setHours(8); d2.setMinutes(7);
            this.testPatterns([
                [d2.getTime() / 1000, 'date.YESTERDAY, 08:07'],
            ]);
        });

        it('shows full datetime for other days', () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2018, 9, 9, 20, 42));
            const now = new Date();
            const d1 = new Date(2010, 1, 7, 18, 42);
            const d2 = new Date(now.getFullYear(), 4, 2, 23, 59);
            this.testPatterns([
                [d1.getTime() / 1000, '7. date.month_short.FEB 2010, 18:42'],
                [d2.getTime() / 1000, '2. date.month_short.MAY, 23:59'],
            ]);
        });
    });

    describe('enlargeSingleEmoji', function() {
        let process = (text) => {
            return $filter('enlargeSingleEmoji')(text, true)
        };

        const singleEmojiClassName = 'large-emoji';
        const crazy = '<span class="e1 e1-people _1f92a" title=":crazy_face:">🤪</span>';
        const crazyLarge = '<span class="e1 ' + singleEmojiClassName + ' e1-people _1f92a" title=":crazy_face:">🤪</span>';
        const copyright = '<span class="e1 e1-symbols _00a9" title=":copyright:">©️</span>';
        const copyrightLarge = '<span class="e1 ' + singleEmojiClassName + ' e1-symbols _00a9" title=":copyright:">©️</span>';

        it('enlarges 1 emoji', () => {
            expect(process(crazy)).toEqual(crazyLarge);
        });

        it('enlarges 2 emoji', () => {
            expect(process(crazy + copyright)).toEqual(crazyLarge + copyrightLarge);
        });

        it('enlarges 3 emoji', () => {
            expect(process(crazy + copyright + crazy)).toEqual(crazyLarge + copyrightLarge + crazyLarge);
        });

        it('does not enlarge 4 emoji', () => {
            expect(process(crazy + copyright + crazy + copyright)).toEqual(crazy + copyright + crazy + copyright);
        });

        it('does not enlarge if non-emoji characters are contained', () => {
            expect(process(crazy + ' ')).toEqual(crazy + ' ');
            expect(process(crazy + 'a' + crazy)).toEqual(crazy + 'a' + crazy);
        });

        it('does not modify non emoji text', () => {
            const text = 'emoji e1 e1-people hello';
            expect(process(text)).toEqual(text);
        });

        it('does nothing if enlarge flag is set to false', () => {
            expect($filter('enlargeSingleEmoji')(crazy, false)).toEqual(crazy);
        });
    });

    describe('linkify', function() {
        let process = (text) => {
            return $filter('linkify')(text)
        };

        it('links http urls', () => {
            expect(process('hello https://threema.ch/!'))
                .toEqual('hello <a href="https://threema.ch/" class="autolinked autolinked-url" target="_blank" rel="noopener noreferrer">https://threema.ch</a>!');
        });

        it('links e-mails', () => {
            expect(process('hello info@threema.ch!'))
                .toEqual('hello <a href="mailto:info@threema.ch" class="autolinked autolinked-email" target="_blank" rel="noopener noreferrer">info@threema.ch</a>!');
        });

        it('does not link phone numbers', () => {
            const input = 'hello +41791234567';
            expect(process(input)).toEqual(input);
        });

        it('does not link mentions', () => {
            const input = 'hello @threemaapp';
            expect(process(input)).toEqual(input);
        });

        it('does not link hashtags', () => {
            const input = 'hello #threema';
            expect(process(input)).toEqual(input);
        });
    });

});
