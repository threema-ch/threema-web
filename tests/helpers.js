describe('Helpers', function () {
    let stringService;

    beforeEach(function () {
            // Load 3ema.services
        module('3ema.services');

        // Inject the $filter function
        inject(function (StringService) {
            stringService = StringService;
        });

    });
    describe('byteChunkSplit', function () {
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

    describe('chunkSplit', function () {
        this.testPatterns = (cases, size, offset) => {
            for (let testcase of cases) {
                const input = testcase[0];
                const expected = testcase[1];
                expect(stringService.chunk(input, size, offset)).toEqual(expected);
            }
        };

        it('short chunks', () => {
            this.testPatterns([
                ['The quick brown fox jumps over the lazy dog',
                    ['The', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog']],
                ['Thequickbrownfoxjumpsoverthelazydog',
                    ['Thequ', 'ickbr', 'ownfo', 'xjump', 'sover', 'thela', 'zydog']],
                ['T h e quick brown f o x jumps over the l a zzz y dog',
                    ['T h e', 'quick', 'brown', 'f o x', 'jumps', 'over', 'the l', 'a zzz', 'y dog']]
            ], 5, 2);
        });

        it('test special', () => {
            this.testPatterns([
                ['', []],
                [null, []],
            ], 3, 0);
        });

        it('test emoji', () => {
            this.testPatterns([
                ['🐶🐶🐶🐶🐶', ['🐶', '🐶', '🐶', '🐶', '🐶']],
                ['emojis 😁 are awesome 😁', ['emo', 'jis', '😁', 'are', 'awe', 'som', 'e', '😁']]
            ], 3, 0);
        });

        it('test emoji with separators', () => {
            this.testPatterns([
                ['The quick white 🐼. He jumped over the lazy 🐶.',
                    ['The', 'quick', 'white', '🐼.', 'He', 'jumpe', 'd', 'over', 'the', 'lazy', '🐶.']],
            ], 5, 2);
        });

        it('short chunks (separator)', () => {
            this.testPatterns([
                ['The.quick.brown.fox.jumps. over.the.lazy.dog.',
                    ['The.', 'quick.', 'brown.', 'fox.', 'jumps.', 'over.', 'the.', 'lazy.', 'dog.']],
                ['The quick brown fox: jumps over the lazy dog',
                    ['The', 'quick', 'brown', 'fox:', 'jumps', 'over', 'the', 'lazy', 'dog']],
                ['The quick                         brown fox: jumps over the lazy dog',
                    ['The', 'quick', 'brown', 'fox:', 'jumps', 'over', 'the', 'lazy', 'dog']],
                ['The quick                         brown fox: jumps\t\t\nover the lazy dog',
                    ['The', 'quick', 'brown', 'fox:', 'jumps', 'over', 'the', 'lazy', 'dog']]
            ], 5, 2);
        });


        it('long chunks', () => {
            this.testPatterns([
                ['The quick brown fox jumps over the lazy dog. The lazy brown dog, jumps over the lazy fox',
                    ['The quick brown fox', 'jumps over the lazy', 'dog. The lazy brown', 'dog, jumps over the', 'lazy fox']],
                ['The quickbrown fox jumps over thelazydog. The lazybrowndog, jumps over the lazyfox',
                    ['The quickbrown fox', 'jumps over', 'thelazydog. The', 'lazybrowndog, jumps', 'over the lazyfox']],
            ], 20, 10);
        });

        it('long chunks without offset', () => {
            this.testPatterns([
                ['The quick brown fox jumps over the lazy dog. The lazy brown dog, jumps over the lazy fox',
                    ['The quick brown fox', 'jumps over the lazy', 'dog. The lazy brown', 'dog, jumps over the', 'lazy fox']],
                ['The quickbrown fox jumps over thelazydog. The lazybrowndog, jumps over the lazyfox',
                    ['The quickbrown fox j', 'umps over thelazydog', '. The lazybrowndog,', 'jumps over the lazyf', 'ox']],
            ], 20, 0);
        });

        it('a lot of chunking, speed test', () => {
            for (let n = 0; n < 10000; n++) {
                this.testPatterns([
                    ['The quick brown fox jumps over the lazy dog. The lazy brown dog, jumps over the lazy fox',
                        ['The quick brown fox', 'jumps over the lazy', 'dog. The lazy brown', 'dog, jumps over the', 'lazy fox']],
                ], 20, 0);
            }
        });
    });
});
