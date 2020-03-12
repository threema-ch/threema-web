// register service worker

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(function (registration) {
            // console.log('Service worker registration successful, scope is:', registration.scope);
        })
        .catch(function (error) {
            // console.log('Service worker registration failed, error:', error);
        });
}
