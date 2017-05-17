describe('WebClientService', function() {

    let $service;

    beforeEach(function() {

        module(($provide) => {
            // Provide configuration
            $provide.constant('CONFIG', {
                ICE_SERVERS: [
                    {
                        urls: [
                            'turn:turn.threema.ch:443?transport=tcp',
                            'turn:turn.threema.ch:443?transport=udp',
                            'turns:turn.threema.ch:443?transport=tcp',
                        ],
                        username: 'user',
                        credential: 'credential',
                    },
                ],
            });

            // Mock some dependencies that we don't really need
            $provide.constant('PROTOCOL_VERSION', 1337);
            $provide.constant('$state', null);
            $provide.constant('$translate', null);
        });

        // Load modules
        module('ngAria');
        module('ngAnimate');
        module('ngMaterial');
        module('3ema.services');
        module('3ema.container');

        // Inject the service to be tested
        inject(function(WebClientService) {
            $service = WebClientService;
        });

    });

    it('can skip ICE TLS hosts if a non-TLS TCP server is available', () => {
        const allUrlsBefore = [].concat(...$service.config.ICE_SERVERS.map((conf) => conf.urls));
        expect(allUrlsBefore.indexOf('turns:turn.threema.ch:443?transport=tcp')).not.toEqual(-1);

        $service.skipIceTls();

        const allUrlsAfter = [].concat(...$service.config.ICE_SERVERS.map((conf) => conf.urls));
        expect(allUrlsAfter.length).toEqual(allUrlsBefore.length - 1);
        expect(allUrlsAfter.indexOf('turns:turn.threema.ch:443?transport=tcp')).toEqual(-1);
    });

    it('can skip ICE TLS hosts if a non-TLS TCP server is available in another server object', () => {
        $service.config.ICE_SERVERS = [
            {
                urls: ['turn:turn.threema.ch:443?transport=udp', 'turns:turn.threema.ch:443?transport=tcp'],
                username: 'user', credential: 'credential',
            },
            {
                urls: ['turn:turn.threema.ch:443?transport=tcp'],
                username: 'user', credential: 'credential',
            }
        ];
        const allUrlsBefore = [].concat(...$service.config.ICE_SERVERS.map((conf) => conf.urls));
        expect(allUrlsBefore.indexOf('turns:turn.threema.ch:443?transport=tcp')).not.toEqual(-1);

        $service.skipIceTls();

        const allUrlsAfter = [].concat(...$service.config.ICE_SERVERS.map((conf) => conf.urls));
        expect(allUrlsAfter.length).toEqual(allUrlsBefore.length - 1);
        expect(allUrlsAfter.indexOf('turns:turn.threema.ch:443?transport=tcp')).toEqual(-1);
    });

    it('does not skip ICE TLS hosts if no non-TLS TCP server is available', () => {
        $service.config.ICE_SERVERS = [
            {
                urls: ['turn:turn.threema.ch:443?transport=udp', 'turns:turn.threema.ch:443?transport=tcp'],
                username: 'user',
                credential: 'credential',
            }
        ];
        const allUrlsBefore = [].concat(...$service.config.ICE_SERVERS.map((conf) => conf.urls));
        expect(allUrlsBefore.indexOf('turns:turn.threema.ch:443?transport=tcp')).not.toEqual(-1);

        $service.skipIceTls();

        const allUrlsAfter = [].concat(...$service.config.ICE_SERVERS.map((conf) => conf.urls));
        expect(allUrlsAfter.length).toEqual(allUrlsBefore.length);
        expect(allUrlsAfter.indexOf('turns:turn.threema.ch:443?transport=tcp')).not.toEqual(-1);
    });

});
