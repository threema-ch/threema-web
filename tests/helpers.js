describe('Helpers', function () {

    let stringService;

    beforeAll(() => window.onbeforeunload = () => 'Ignoring page reload request');

    beforeEach(function () {
        // Load 3ema.services
        module('3ema.services');

        // Inject the $filter function
        inject(function(StringService) {
            stringService = StringService;
        });

    });

    describe('byteChunkSplit', function() {
        this.testPatterns = (cases, size, offset) => {
            for (let testcase of cases) {
                const input = testcase[0];
                const expected = testcase[1];
                expect(stringService.byteChunk(input, size, offset)).toEqual(expected);
            }
        };

        it('short chunks', () => {
            this.testPatterns([
                ['abc',
                    ['abc',]],
                ['abcdefghijklmn',
                    ['abcdef', 'ghijkl', 'mn',]],
                // four byte emoji
                ['😅😅',
                    ['😅', '😅']]
            ], 6, null);
        });


        it('chunks with offset', () => {
            this.testPatterns([
                ['The quick white 🐼. He jumped over the lazy 🐶.',
                    ['The', 'quick', 'white', '🐼.', 'He', 'jumped', 'over', 'the', 'lazy', '🐶.',]],
            ], 6, 10);

            this.testPatterns([
                ['The quick white 🐼. He jumped over the lazy 🐶.',
                    ['The quick white 🐼', '. He jumped over the', 'lazy 🐶.',]],
            ], 20, 10);
        });
    });

});
