
describe('Helpers', function() {
	let stringService;

	beforeEach(function() {
		// Load 3ema.services
		module('3ema.services');

		// Inject the $filter function
		inject(function(StringService) {
			stringService = StringService;
		});

	});

    describe('chunkSplit', function() {
        this.testPatterns = (cases, size) => {
            for (let testcase of cases) {
                const input = testcase[0];
                const expected = testcase[1];
                expect(stringService.chunk(input, size)).toEqual(expected);
            }
        };

        it('short chunks', () => {
            this.testPatterns([
                ['The quick brown fox jumps over the lazy dog',
                    ['The', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog']],
                ['Thequickbrownfoxjumpsoverthelazydog',
                    ['Thequ' ,'ickbr', 'ownfo', 'xjump', 'sover', 'thela', 'zydog']],
                ['T h e quick brown f o x jumps over the l a zzz y dog',
                    ['T h e', 'quick', 'brown', 'f o x', 'jumps', 'over', 'the l', 'a zzz', 'y dog']]
            ], 5);
        });

        it('long chunks', () => {
            this.testPatterns([
                ['https://en.wikipedia.org/wiki/Pangram Thequickbrownfoxjumpsoverthelazydogandoverthelazycat',
                    ['https://en.wikipedia.org/wiki/Pangram', 'Thequickbrownfoxjumpsoverthelazydogandov', 'erthelazycat']]
            ], 40);
            this.testPatterns([
                ['see https://en.wikipedia.org/wiki/Pangram?long=parameter&activated=true Thequickbrownfoxjumpsoverthelazydogandoverthelazycat',
                    ['see', 'https://en.wikipedia.org/wiki/Pangram?long=parameter&activated=true', 'Thequickbrownfoxjumpsoverthelazydogandoverthelazycat']]
            ], 67);
        });
    });
});
