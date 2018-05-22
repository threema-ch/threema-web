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

    describe('markify', function() {

        this.testPatterns = (cases) => testPatterns('markify', cases);

        it('detects bold text', () => {
            this.testPatterns([
                ['*bold text (not italic)*',
                 '<span class="text-bold">bold text (not italic)</span>'],
            ]);
        });

        it('detects italic text', () => {
            this.testPatterns([
                ['This text is not italic.',
                 'This text is not italic.'],
                ['_This text is italic._',
                 '<span class="text-italic">This text is italic.</span>'],
                ['This text is _partially_ italic',
                 'This text is <span class="text-italic">partially</span> italic'],
                ['This text has _two_ _italic_ bits',
                 'This text has <span class="text-italic">two</span> <span class="text-italic">italic</span> bits'],
            ]);

        });

        it('detects strikethrough text', () => {
            this.testPatterns([
                ['so ~strikethrough~', 'so <span class="text-strike">strikethrough</span>'],
            ]);
        });

        it('detects mixed markup', () => {
            this.testPatterns([
                ['*bold text with _italic_ *',
                 '<span class="text-bold">bold text with <span class="text-italic">italic</span> </span>'],
                ['*part bold,* _part italic_',
                 '<span class="text-bold">part bold,</span> <span class="text-italic">part italic</span>'],
                ['_italic text with *bold* _',
                 '<span class="text-italic">italic text with <span class="text-bold">bold</span> </span>'],
            ]);
        });

        it('is only applied on word boundaries', () => {
            this.testPatterns([
                ['so not_really_italic',
                 'so not_really_italic'],
                ['invalid*bold*stuff',
                 'invalid*bold*stuff'],
                ['no~strike~through',
                 'no~strike~through'],
                ['*bold_but_no~strike~through*',
                 '<span class="text-bold">bold_but_no~strike~through</span>'],
            ]);
        });

        it('does not break URLs', () => {
            this.testPatterns([
                ['https://en.wikipedia.org/wiki/Java_class_file *nice*',
                 'https://en.wikipedia.org/wiki/Java_class_file <span class="text-bold">nice</span>'],
                ['<a href="https://threema.ch/>_Threema_</a>',
                 '<a href="https://threema.ch/><span class="text-italic">Threema</span></a>'],
            ]);
        });

        it('ignores invalid markup', () => {
            this.testPatterns([
                ['*invalid markup (do not parse)_', '*invalid markup (do not parse)_'],
                ['random *asterisk', 'random *asterisk'],
            ]);
        });

        it('ignores markup with \\n (newline)', () => {
            this.testPatterns([
                ['*First line\n and a new one. (do not parse)*', '*First line\n and a new one. (do not parse)*'],
                ['*\nbegins with linebreak. (do not parse)*', '*\nbegins with linebreak. (do not parse)*'],
                ['*Just some text. But it ends with newline (do not parse)\n*', '*Just some text. But it ends with newline (do not parse)\n*'],
            ]);
        });

    });

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

    describe('dndModeSimplified', function() {
        let process = (dnd, sound) => {
            return $filter('dndModeSimplified')({
                notifications: {
                    dnd: dnd,
                    sound: sound,
                },
            })
        };

        it('dnd enabled', () => {
            expect(process(
                {mode: 'on'},
                {mode: 'default'}
            )).toEqual('on');
        });

        it('dnd enabled (no sound)', () => {
            expect(process(
                {mode: 'on'},
                {mode: 'muted'}
            )).toEqual('on');
        });

        it('dnd disabled', () => {
            expect(process(
                {mode: 'off'},
                {mode: 'default'}
            )).toEqual('off');
        });

        it('dnd disabled (no sound)', () => {
            expect(process(
                {mode: 'off'},
                {mode: 'muted'}
            )).toEqual('off');
        });

        it('mention only', () => {
            expect(process(
                {mode: 'on', mentionOnly: true},
                {mode: 'default'}
            )).toEqual('mention');
        });

        it('mention only (no sound)', () => {
            expect(process(
                {mode: 'on', mentionOnly: true},
                {mode: 'muted'}
            )).toEqual('mention');
        });

        it('until (not expired)', () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2018, 9, 9, 20, 42));
            expect(process(
                {mode: 'until', until: +(new Date(2018, 9, 9, 20, 50))},
                {mode: 'default'}
            )).toEqual('on');
        });

        it('until (expired)', () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2018, 9, 9, 20, 42));
            expect(process(
                {mode: 'until', until: +(new Date(2018, 9, 9, 19, 50))},
                {mode: 'default'}
            )).toEqual('off');
        });

        it('until (mention only, not expired)', () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2018, 9, 9, 20, 42));
            expect(process(
                {mode: 'until', until: +(new Date(2018, 9, 9, 20, 50)), mentionOnly: true},
                {mode: 'default'}
            )).toEqual('mention');
        });

        it('until (mention only, expired)', () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2018, 9, 9, 20, 42));
            expect(process(
                {mode: 'until', until: +(new Date(2018, 9, 9, 19, 50)), mentionOnly: true},
                {mode: 'default'}
            )).toEqual('off');
        });
    });

});
