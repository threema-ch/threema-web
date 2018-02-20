describe('UriService', function() {

    let $service;

    // Ignoring page reload request
    beforeAll(() => window.onbeforeunload = () => null);

    beforeEach(function() {

        module('3ema.services');

        // Inject the service
        inject(function(UriService) {
            $service = UriService;
        });

    });

    it('parses query parameters', () => {
        const parsed = $service.parseQueryParams('foo=bar&baz=a%20b%20c');
        expect(parsed).toEqual({
            'foo': 'bar',
            'baz': 'a b c',
        });
    });

    it('parses empty query parameters', () => {
        const parsed = $service.parseQueryParams('');
        expect(parsed).toEqual({});
    });

});
