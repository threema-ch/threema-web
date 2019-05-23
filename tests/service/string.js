describe('StringService', function() {

    let $service;

    // Ignoring page reload request
    beforeAll(() => window.onbeforeunload = () => null);

    beforeEach(function() {

        module('3ema.services');

        // Inject the service
        inject(function(StringService) {
            $service = StringService;
        });

    });

    describe('byteChunkSplit', function() {
        this.testPatterns = (cases, size, offset) => {
            for (let testcase of cases) {
                const input = testcase[0];
                const expected = testcase[1];
                expect($service.byteChunk(input, size, offset)).toEqual(expected);
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
