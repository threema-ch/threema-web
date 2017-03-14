/**
 * This file is part of Threema Web.
 *
 * Threema Web is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
 * General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Threema Web. If not, see <http://www.gnu.org/licenses/>.
 */

export class MimeService {
    public static $inject = ['$log', '$translate'];

    private $log: ng.ILogService;
    private $translate: ng.translate.ITranslateService;

    private imageMimeTypes: string[] = ['image/png', 'image/jpg', 'image/jpeg'];
    private audioMimeTypes: string[] = ['audio/ogg'];
    private videoMimeTypes: string[] = ['video/mp4', 'video/mpg', 'video/mpeg'];

    constructor($log: ng.ILogService, $translate: ng.translate.ITranslateService) {
        this.$log = $log;
        this.$translate = $translate;
    }

    public isImage(mimeType: string): boolean {
        return this.is(mimeType, this.imageMimeTypes);
    }

    public isAudio(mimeType: string): boolean {
        return this.is(mimeType, this.audioMimeTypes);
    }

    public isVideo(mimeType: string): boolean {
        return this.is(mimeType, this.videoMimeTypes);
    }

    public getLabel(mimeType: string): string {
        let key = this.getKey(mimeType);

        if (key !== null) {
            return this.$translate.instant('mimeTypes.' + this.getKey(mimeType));
        }

        return mimeType;
    }

    public getIconUrl(mimeType: string): string {
        let key = this.getKey(mimeType);
        if (key === undefined || key.length === 0) {
            key = 'generic_am';
        }
        return 'img/mime/ic_doc_' + key + '.png';
    }

    private getKey(mimeType: string): string {
        switch (mimeType) {
            case 'application/vnd.android.package-archive':
                return 'apk';
            case 'application/ogg':
            case 'application/x-flac':
                return 'audio';
            case 'application/pgp-keys':
            case 'application/pgp-signature':
            case 'application/x-pkcs12':
            case 'application/x-pkcs7-certreqresp':
            case 'application/x-pkcs7-crl':
            case 'application/x-x509-ca-cert':
            case 'application/x-x509-user-cert':
            case 'application/x-pkcs7-certificates':
            case 'application/x-pkcs7-mime':
            case 'application/x-pkcs7-signature':
                return 'certificate';
            case 'application/rdf+xml':
            case 'application/rss+xml':
            case 'application/x-object':
            case 'application/xhtml+xml':
            case 'text/css':
            case 'text/html':
            case 'text/xml':
            case 'text/x-c++hdr':
            case 'text/x-c++src':
            case 'text/x-chdr':
            case 'text/x-csrc':
            case 'text/x-dsrc':
            case 'text/x-csh':
            case 'text/x-haskell':
            case 'text/x-java':
            case 'text/x-literate-haskell':
            case 'text/x-pascal':
            case 'text/x-tcl':
            case 'text/x-tex':
            case 'application/x-latex':
            case 'application/x-texinfo':
            case 'application/atom+xml':
            case 'application/ecmascript':
            case 'application/json':
            case 'application/javascript':
            case 'application/xml':
            case 'text/javascript':
            case 'application/x-javascript':
                return 'codes';
            case 'application/mac-binhex40':
            case 'application/rar':
            case 'application/zip':
            case 'application/x-apple-diskimage':
            case 'application/x-debian-package':
            case 'application/x-gtar':
            case 'application/x-iso9660-image':
            case 'application/x-lha':
            case 'application/x-lzh':
            case 'application/x-lzx':
            case 'application/x-stuffit':
            case 'application/x-tar':
            case 'application/x-webarchive':
            case 'application/x-webarchive-xml':
            case 'application/gzip':
            case 'application/x-7z-compressed':
            case 'application/x-deb':
            case 'application/x-rar-compressed':
                return 'compressed';
            case 'text/x-vcard':
            case 'text/vcard':
                return 'contact_am';
            case 'text/calendar':
            case 'text/x-vcalendar':
                return 'event_am';
            case 'application/x-font':
            case 'application/font-woff':
            case 'application/x-font-woff':
            case 'application/x-font-ttf':
                return 'font';
            case 'application/vnd.oasis.opendocument.graphics':
            case 'application/vnd.oasis.opendocument.graphics-template':
            case 'application/vnd.oasis.opendocument.image':
            case 'application/vnd.stardivision.draw':
            case 'application/vnd.sun.xml.draw':
            case 'application/vnd.sun.xml.draw.template':
            case 'image/jpg':
            case 'image/jpeg':
            case 'image/png':
            case 'image/gif':
                return 'image';
            case 'application/pdf':
                return 'pdf';
            case 'application/vnd.stardivision.impress':
            case 'application/vnd.sun.xml.impress':
            case 'application/vnd.sun.xml.impress.template':
            case 'application/x-kpresenter':
            case 'application/vnd.oasis.opendocument.presentation':
                return 'presentation';
            case 'application/vnd.oasis.opendocument.spreadsheet':
            case 'application/vnd.oasis.opendocument.spreadsheet-template':
            case 'application/vnd.stardivision.calc':
            case 'application/vnd.sun.xml.calc':
            case 'application/vnd.sun.xml.calc.template':
            case 'application/x-kspread':
                return 'spreadsheet_am';
            case 'application/vnd.oasis.opendocument.text':
            case 'application/vnd.oasis.opendocument.text-master':
            case 'application/vnd.oasis.opendocument.text-template':
            case 'application/vnd.oasis.opendocument.text-web':
            case 'application/vnd.stardivision.writer':
            case 'application/vnd.stardivision.writer-global':
            case 'application/vnd.sun.xml.writer':
            case 'application/vnd.sun.xml.writer.global':
            case 'application/vnd.sun.xml.writer.template':
            case 'application/x-abiword':
            case 'application/x-kword':
                return 'text_am';
            case 'application/x-quicktimeplayer':
            case 'application/x-shockwave-flash':
                return 'video_am';
            case 'application/msword':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.template':
                return 'word';
            case 'application/vnd.ms-excel':
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.template':
                return 'excel';
            case 'application/vnd.ms-powerpoint':
            case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
            case 'application/vnd.openxmlformats-officedocument.presentationml.template':
            case 'application/vnd.openxmlformats-officedocument.presentationml.slideshow':
                return 'powerpoint';
            default:
                return null;
        }
    }

    private is(mimeType, possibleTypes: string[]): boolean {
        return mimeType !== undefined
            && possibleTypes.indexOf(mimeType) !== -1;
    }
}
