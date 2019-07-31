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

import {Transition as UiTransition, TransitionService as UiTransitionService} from '@uirouter/angularjs';
import {saveAs} from 'file-saver';

import {bufferToUrl, hasValue} from '../helpers';
import {LogService} from '../services/log';
import {MediaboxService} from '../services/mediabox';
import {MessageService} from '../services/message';
import {TimeoutService} from '../services/timeout';
import {WebClientService} from '../services/webclient';

function showAudioDialog(
    $mdDialog: ng.material.IDialogService,
    logService: LogService,
    blobInfo: threema.BlobInfo,
): void {
    const log = logService.getLogger('AudioPlayerDialog-C');
    $mdDialog.show({
        controllerAs: 'ctrl',
        controller: function() {
            this.cancel = () => $mdDialog.cancel();
            this.audioSrc = bufferToUrl(blobInfo.buffer, blobInfo.mimetype, log);
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
    'LogService',
    'WebClientService',
    'MediaboxService',
    'MessageService',
    'TimeoutService',
    '$rootScope',
    '$mdDialog',
    '$timeout',
    '$transitions',
    '$translate',
    '$filter',
    '$window',
    function(logService: LogService,
             webClientService: WebClientService,
             mediaboxService: MediaboxService,
             messageService: MessageService,
             timeoutService: TimeoutService,
             $rootScope: ng.IRootScopeService,
             $mdDialog: ng.material.IDialogService,
             $timeout: ng.ITimeoutService,
             $transitions: UiTransitionService,
             $translate: ng.translate.ITranslateService,
             $filter: ng.IFilterService,
             $window: ng.IWindowService) {
        const log = logService.getLogger('MessageMedia-C');
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
                // On state transitions, clear mediabox
                $transitions.onStart({}, function(trans: UiTransition) {
                    mediaboxService.clearMedia();
                });

                this.$onInit = function() {
                    const message = this.message as threema.Message;
                    this.type = message.type;

                    // Downloading
                    this.downloading = false;
                    this.thumbnailDownloading = false;
                    this.downloaded = false;

                    // Uploading
                    this.uploading = message.temporaryId !== undefined
                        && message.temporaryId !== null;

                    // AnimGIF detection
                    this.isGif = message.type === 'file' && message.file.type === 'image/gif';

                    // Has a preview thumbnail
                    this.hasPreviewThumbnail = (): boolean => {
                        return hasValue(message.thumbnail) && (
                            hasValue(message.thumbnail.previewDataUrl) || hasValue(message.thumbnail.preview));
                    };

                    // Preview thumbnail
                    this.getThumbnailPreviewUri = (): string | null => {
                        // Cache thumbnail preview URI
                        if (hasValue(message.thumbnail.previewDataUrl)) {
                            return message.thumbnail.previewDataUrl;
                        }
                        if (hasValue(message.thumbnail.preview)) {
                            message.thumbnail.previewDataUrl = bufferToUrl(
                                message.thumbnail.preview,
                                webClientService.appCapabilities.imageFormat.thumbnail,
                                log,
                            );
                            return message.thumbnail.previewDataUrl;
                        }
                        return null;
                    };
                    // TODO: Uuuuugly!
                    this.getThumbnailPreviewUriStyle = (): string => {
                        const previewUri = hasValue(message.thumbnail) ? this.getThumbnailPreviewUri() : null;
                        return previewUri !== null ? `url(${previewUri})` : 'none';
                    };

                    // Only show thumbnails for images, videos and GIFs
                    // If a preview image is not available, we fall back to
                    // icons depending on the type.
                    this.thumbnail = null;
                    if (message.thumbnail !== undefined) {
                        this.thumbnailStyle = {
                            width: this.message.thumbnail.width + 'px',
                            height: this.message.thumbnail.height + 'px',
                        };
                    }

                    let loadingThumbnailTimeout: ng.IPromise<void> = null;

                    this.wasInView = false;
                    this.thumbnailInView = (inView: boolean) => {
                        if (this.uploading || message.thumbnail === undefined || this.wasInView === inView) {
                            // do nothing
                            return;
                        }
                        this.wasInView = inView;

                        if (!inView) {
                            if (loadingThumbnailTimeout !== null) {
                                timeoutService.cancel(loadingThumbnailTimeout);
                            }
                            this.thumbnailDownloading = false;
                            this.thumbnail = null;
                        } else {
                            if (this.thumbnail === null) {
                                const setThumbnail = (buf: ArrayBuffer) => {
                                    this.thumbnail = bufferToUrl(
                                        buf,
                                        webClientService.appCapabilities.imageFormat.thumbnail,
                                        log,
                                    );
                                };

                                if (message.thumbnail.img !== undefined) {
                                    setThumbnail(message.thumbnail.img);
                                    return;
                                } else {
                                    this.thumbnailDownloading = true;
                                    loadingThumbnailTimeout = timeoutService.register(() => {
                                        webClientService
                                            .requestThumbnail(this.receiver, message)
                                            .then((img) => $timeout(() => {
                                                setThumbnail(img);
                                                this.thumbnailDownloading = false;
                                            }))
                                            .catch((error) => {
                                                // TODO: Handle this properly / show an error message
                                                const description = `Thumbnail request has been rejected: ${error}`;
                                                this.log.error(description);
                                            });
                                    }, 1000, false, 'thumbnail');
                                }
                            }
                        }
                    };

                    // For locations, retrieve the coordinates
                    this.location = null;
                    if (message.location !== undefined) {
                        this.location = message.location;
                        this.downloaded = true;
                    }

                    // Open map link in new window using mapLink-filter
                    this.openMapLink = () => {
                        $window.open($filter<any>('mapLink')(this.location), '_blank');
                    };

                    // Play a Audio file in a dialog
                    this.playAudio = (blobInfo: threema.BlobInfo) => showAudioDialog($mdDialog, logService, blobInfo);

                    // Download function
                    this.download = () => {
                        log.debug('Download blob');
                        if (this.uploading) {
                            log.debug('Cannot download, still uploading');
                            return;
                        }
                        if (this.downloading) {
                            log.debug('Download already in progress...');
                            return;
                        }
                        const receiver: threema.Receiver = this.receiver;
                        this.downloading = true;
                        webClientService.requestBlob(message.id, receiver)
                            .then((blobInfo: threema.BlobInfo) => {
                                $rootScope.$apply(() => {
                                    log.debug('Blob loaded');
                                    this.downloading = false;
                                    this.downloaded = true;

                                    switch (message.type) {
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
                                            if (message.file.type === 'image/gif') {
                                                // Show inline
                                                this.blobBufferUrl = bufferToUrl(
                                                    blobInfo.buffer, 'image/gif', log);
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
                                            log.warn('Ignored download request for message type', message.type);
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

                    this.isLoading = () => {
                        return this.uploading || this.isDownloading();
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
