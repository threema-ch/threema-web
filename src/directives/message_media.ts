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

import {WebClientService} from "../services/webclient";
import {MessageService} from "../services/message";

export default [
    'WebClientService',
    'MessageService',
    '$rootScope',
    '$mdDialog',
    '$timeout',
    '$log',
    '$filter',
    function(webClientService: WebClientService, messageService: MessageService,
             $rootScope: ng.IRootScopeService,
             $mdDialog: ng.material.IDialogService,
             $timeout: ng.ITimeoutService, $log: ng.ILogService,
             $filter: ng.IFilterService) {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                message: '=eeeMessage',
                receiver: '=eeeReceiver',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                this.type = this.message.type;
                this.downloading = false;
                this.thumbnailDownloading = false;
                this.downloaded = false;
                this.timeout = null as ng.IPromise<void>;
                this.uploading = this.message.temporaryId !== undefined
                    && this.message.temporaryId !== null;
                this.isAnimGif = !this.uploading
                    && (this.message as threema.Message).type === 'file'
                    && (this.message as threema.Message).file.type === 'image/gif';
                // do not show thumbnail in file messages (except anim gif
                // if a thumbnail in file messages are available, the thumbnail
                // will be shown in the file circle
                this.showThumbnail = this.message.thumbnail !== undefined
                    && ((this.message as threema.Message).type !== 'file'
                        || this.isAnimGif);

                this.thumbnail = null;

                if (this.message.thumbnail !== undefined) {
                    this.thumbnailStyle = {
                        width: this.message.thumbnail.width + 'px',
                        height: this.message.thumbnail.height + 'px' };
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
                            if (this.message.thumbnail.img !== undefined) {
                                this.thumbnail = $filter<any>('bufferToUrl')(this.message.thumbnail.img, 'image/png');
                                return;
                            } else {
                                this.thumbnailDownloading = true;
                                loadingThumbnailTimeout = $timeout(() => {
                                    webClientService.requestThumbnail(
                                        this.receiver,
                                        this.message).then((img) => {
                                        $timeout(() => {
                                            this.thumbnail = $filter<any>('bufferToUrl')(img, 'image/png');
                                            this.thumbnailDownloading = false;
                                        });
                                    });
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

                // Play a Audio file in a dialog
                this.playAudio = (buffer: ArrayBuffer) => {
                    $mdDialog.show({
                        controllerAs: 'ctrl',
                        controller: function () {
                            this.blobBuffer = buffer;
                            this.cancel = () => {
                                $mdDialog.cancel();
                            };
                        },
                        template: `
                            <md-dialog translate-attr="{'aria-label': 'messageTypes.AUDIO_MESSAGE'}">
                                    <md-toolbar>
                                        <div class="md-toolbar-tools">
                                            <h2 translate>messageTypes.AUDIO_MESSAGE</h2>
                                            </div>
                                    </md-toolbar>
                                    <md-dialog-content layout="row" layout-align="center">
                                        <audio
                                            controls
                                            autoplay ng-src="{{ ctrl.blobBuffer | bufferToUrl: 'audio/ogg' }}">
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
                };

                // Download function
                this.download = () => {
                    if (this.downloading) {
                        $log.debug('download already in progress...');
                        return;
                    }
                    const message: threema.Message = this.message;
                    const receiver: threema.Receiver = this.receiver;
                    this.downloading = true;
                    webClientService.requestBlob(message.id, receiver)
                        .then((buffer: ArrayBuffer) => {
                            $rootScope.$apply(() => {
                                this.downloading = false;
                                this.downloaded = true;

                                switch (this.message.type) {
                                    case 'image':
                                    case 'video':
                                        saveAs(new Blob([buffer]), messageService.getFileName(message));
                                        break;
                                    case 'file':
                                        if (this.message.file.type === 'image/gif') {
                                            // show inline
                                            this.blobBuffer = buffer;
                                            // hide thumbnail
                                            this.showThumbnail = false;
                                        } else {
                                            saveAs(new Blob([buffer]), messageService.getFileName(message));
                                        }
                                        break;
                                    case 'audio':
                                        // Show inline
                                        this.playAudio(buffer);
                                        break;
                                    default:
                                        $log.warn('Ignored download request for message type', this.message.type);
                                }
                            });
                        })
                        .catch((error) => {
                            $log.error('error downloading blob ', error);
                            this.downloading = false;
                            this.downloaded = true;
                        });
                };
            }],
            templateUrl: 'directives/message_media.html',
        };
    },
];
