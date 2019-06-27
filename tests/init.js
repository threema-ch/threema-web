// Wait for main application to be fully loaded
beforeAll((done) => setTimeout(done, 1000));

// Inject common constants
beforeEach(function() {
    module(($provide) => {
        // Provide configuration
        $provide.constant('CONFIG', window.config);

        // Mock versions
        $provide.constant('PROTOCOL_VERSION', 1337);
        $provide.constant('VERSION', 42);
    });
});

// Uninstall the mock clock after every test
afterEach(() => jasmine.clock().uninstall());
