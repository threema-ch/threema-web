// Wait for main application to be fully loaded
beforeAll((done) => setTimeout(done, 1000));

// Uninstall the mock clock after every test
afterEach(() => jasmine.clock().uninstall());
