describe('MimeService', function() {

    let $service;

    // Ignoring page reload request
    beforeAll(() => window.onbeforeunload = () => null);

    beforeEach(function() {

        module('pascalprecht.translate');
        module('3ema.services');

        // Inject the service
        inject(function(MimeService) {
            $service = MimeService;
        });

    });

    it('getLabel', () => {
        expect($service.getLabel('application/pdf')).toEqual('mimeTypes.pdf');
        expect($service.getLabel('application/vnd.android.package-archive')).toEqual('mimeTypes.apk');
        expect($service.getLabel('audio/mpeg3')).toEqual('mimeTypes.audio');
        expect($service.getLabel('audio/x-mpeg-3')).toEqual('mimeTypes.audio');
        expect($service.getLabel('audio/foobar')).toEqual('mimeTypes.audio');
    });

    it('getIcon', () => {
        expect($service.getIconUrl('application/pdf')).toEqual('img/mime/ic_doc_pdf.png');
        expect($service.getIconUrl('application/vnd.android.package-archive')).toEqual('img/mime/ic_doc_apk.png');
        expect($service.getIconUrl('video/baz')).toEqual('img/mime/ic_doc_video.png');
    });

});
