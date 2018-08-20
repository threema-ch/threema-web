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

import {bufferToUrl, hasValue, logAdapter} from '../helpers';
import {MediaboxService} from '../services/mediabox';
import {MessageService} from '../services/message';
import {WebClientService} from '../services/webclient';

function showAudioDialog(
    $mdDialog: ng.material.IDialogService,
    $log: ng.ILogService,
    blobInfo: threema.BlobInfo,
): void {
    $mdDialog.show({
        controllerAs: 'ctrl',
        controller: function() {
            this.cancel = () => $mdDialog.cancel();
            this.audioSrc = bufferToUrl(
                blobInfo.buffer,
                blobInfo.mimetype,
                logAdapter($log.warn, '[AudioPlayerDialog]'),
            );
        },
        template: `
            <md-dialog translate-attr="{'aria-label': 'messageTypes.AUDIO_MESSAGE'}">
                    <md-toolbar>
                        <div class="md-toolbar-tools">
                            <h2 translate>messageTypes.AUDIO_MESSAGE</h2>
                            </div>
                    </md-toolbar>
                    <md-dialog-content layout="row" layout-align="center">
                        <audio controls autoplay ng-src="{{ ctrl.audioSrc | unsafeResUrl }}">
                            Your browser does not support the <code>audio</code> element.
                        </audio>
                    </md-dialog-content>
                    <md-dialog-actions layout="row" >
                      <md-button ng-click="ctrl.cancel()">
                         <span translate>common.OK</span>
                      </md-button>
                    </md-dialog-actions>
            </md-dialog>`,
        parent: angular.element(document.body),
        clickOutsideToClose: true,
    });
}

export default [
    'WebClientService',
    'MediaboxService',
    'MessageService',
    '$rootScope',
    '$mdDialog',
    '$timeout',
    '$translate',
    '$log',
    '$filter',
    '$window',
    function(webClientService: WebClientService,
             mediaboxService: MediaboxService,
             messageService: MessageService,
             $rootScope: ng.IRootScopeService,
             $mdDialog: ng.material.IDialogService,
             $timeout: ng.ITimeoutService,
             $translate: ng.translate.ITranslateService,
             $log: ng.ILogService,
             $filter: ng.IFilterService,
             $window: ng.IWindowService) {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                message: '=eeeMessage',
                receiver: '=eeeReceiver',
                showDownloading: '=eeeShowDownloading',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                this.logTag = '[MessageMedia]';

                this.$onInit = function() {
                    this.type = this.message.type;

                    // Downloading
                    this.downloading = false;
                    this.thumbnailDownloading = false;
                    this.downloaded = false;

                    // Uploading
                    this.uploading = this.message.temporaryId !== undefined
                        && this.message.temporaryId !== null;

                    // AnimGIF detection
                    this.isAnimGif = !this.uploading
                        && (this.message as threema.Message).type === 'file'
                        && (this.message as threema.Message).file.type === 'image/gif';

                    // Preview thumbnail
                    let thumbnailPreviewUri = null;
                    this.getThumbnailPreviewUri = () => {
                        // Cache thumbnail preview URI
                        if (thumbnailPreviewUri === null
                                && hasValue(this.message) && hasValue(this.message.thumbnail)) {
                            thumbnailPreviewUri = bufferToUrl(
                                (this.message as threema.Message).thumbnail.preview,
                                webClientService.appCapabilities.imageFormat.thumbnail,
                                logAdapter($log.warn, this.logTag),
                            );
                        }
                        return thumbnailPreviewUri;
                    };

                    // Thumbnail loading
                    //
                    // Do not show thumbnail in file messages (except anim gif).
                    // If a thumbnail in file messages are available, the thumbnail
                    // will be shown in the file circle
                    this.showThumbnail = this.message.thumbnail !== undefined
                        && ((this.message as threema.Message).type !== 'file' || this.isAnimGif);
                    this.thumbnail = null;
                    this.thumbnailFormat = webClientService.appCapabilities.imageFormat.thumbnail;
                    if (this.message.thumbnail !== undefined) {
                        this.thumbnailStyle = {
                            width: this.message.thumbnail.width + 'px',
                            height: this.message.thumbnail.height + 'px',
                        };
                    }

                    let loadingThumbnailTimeout = null;

                    this.wasInView = false;
                    this.thumbnailInView = (inView: boolean) => {
                        if (this.message.thumbnail === undefined
                                || this.wasInView === inView) {
                            // do nothing
                            return;
                        }
                        this.wasInView = inView;

                        if (!inView) {
                            $timeout.cancel(loadingThumbnailTimeout);
                            this.thumbnailDownloading = false;
                            this.thumbnail = null;
                        } else {
                            if (this.thumbnail === null) {
                                const setThumbnail = (buf: ArrayBuffer) => {
                                    this.thumbnail = bufferToUrl(
                                        buf,
                                        webClientService.appCapabilities.imageFormat.thumbnail,
                                        logAdapter($log.warn, this.logTag),
                                    );
                                };

                                if (this.message.thumbnail.img !== undefined) {
                                    setThumbnail(this.message.thumbnail.img);
                                    return;
                                } else {
                                    this.thumbnailDownloading = true;
                                    loadingThumbnailTimeout = $timeout(() => {
                                        webClientService
                                            .requestThumbnail(this.receiver, this.message)
                                            .then((img) => $timeout(() => {
                                                setThumbnail(img);
                                                this.thumbnailDownloading = false;
                                            }));
                                    }, 1000);
                                }
                            }
                        }
                    };

                    // For locations, retrieve the coordinates
                    this.location = null;
                    if (this.message.location !== undefined) {
                        this.location = this.message.location;
                        this.downloaded = true;
                    }

                    // Open map link in new window using mapLink-filter
                    this.openMapLink = () => {
                        $window.open($filter<any>('mapLink')(this.location), '_blank');
                    };

                    // Play a Audio file in a dialog
                    this.playAudio = (blobInfo: threema.BlobInfo) => showAudioDialog($mdDialog, $log, blobInfo);

                    // Download function
                    this.download = () => {
                        $log.debug(this.logTag, 'Download blob');
                        if (this.downloading) {
                            $log.debug(this.logTag, 'Download already in progress...');
                            return;
                        }
                        const message: threema.Message = this.message;
                        const receiver: threema.Receiver = this.receiver;
                        this.downloading = true;
                        webClientService.requestBlob(message.id, receiver)
                            .then((blobInfo: threema.BlobInfo) => {
                                $rootScope.$apply(() => {
                                    $log.debug(this.logTag, 'Blob loaded');
                                    this.downloading = false;
                                    this.downloaded = true;

                                    switch (this.message.type) {
                                        case 'image':
                                            const caption = message.caption || '';
                                            mediaboxService.setMedia(
                                                blobInfo.buffer,
                                                blobInfo.filename,
                                                blobInfo.mimetype,
                                                caption,
                                            );
                                            break;
                                        case 'video':
                                            saveAs(new Blob([blobInfo.buffer]), blobInfo.filename);
                                            break;
                                        case 'file':
                                            if (this.message.file.type === 'image/gif') {
                                                // Show inline
                                                this.blobBufferUrl = bufferToUrl(
                                                    blobInfo.buffer,
                                                    'image/gif',
                                                    logAdapter($log.warn, this.logTag),
                                                );
                                                // Hide thumbnail
                                                this.showThumbnail = false;
                                            } else {
                                                saveAs(new Blob([blobInfo.buffer]), blobInfo.filename);
                                            }
                                            break;
                                        case 'audio':
                                            // Show inline
                                            this.playAudio(blobInfo);
                                            break;
                                        default:
                                            $log.warn(this.logTag,
                                                'Ignored download request for message type', this.message.type);
                                    }
                                });
                            })
                            .catch((error) => {
                                $rootScope.$apply(() => {
                                    this.downloading = false;
                                    let contentString;
                                    switch (error) {
                                        case 'blobDownloadFailed':
                                            contentString = 'error.BLOB_DOWNLOAD_FAILED';
                                            break;
                                        case 'blobDecryptFailed':
                                            contentString = 'error.BLOB_DECRYPT_FAILED';
                                            break;
                                        default:
                                            contentString = 'error.ERROR_OCCURRED';
                                            break;
                                    }
                                    const confirm = $mdDialog.alert()
                                        .title($translate.instant('common.ERROR'))
                                        .textContent($translate.instant(contentString))
                                        .ok($translate.instant('common.OK'));
                                    $mdDialog.show(confirm);
                                });
                            });
                    };

                    this.isDownloading = () => {
                        return this.downloading
                            || this.thumbnailDownloading
                            || (this.showDownloading && this.showDownloading());
                    };
                };
            }],
            templateUrl: 'directives/message_media.html',
        };
    },
];
