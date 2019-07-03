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

// tslint:disable:no-reference
/// <reference path="../types/croppie.d.ts" />

// tslint:disable:max-line-length

import {bufferToUrl} from '../helpers';
import {LogService} from '../services/log';

/**
 * Support uploading and resizing avatar
 */
export default [
    'LogService',
    function(logService: LogService) {
        const log = logService.getLogger('AvatarEditor-C');
        return {
            restrict: 'EA',
            scope: {
                onChange: '=',
            },
            link(scope: any, element, attrs, controller) {
                // Constants
                const DRAGOVER_CSS_CLASS = 'is-dragover';
                const VIEWPORT_SIZE = 220;

                // Elements
                const editorArea: any = angular.element(element[0].querySelector('.avatar-editor'));
                const fileTrigger: any = angular.element(element[0].querySelector('.file-trigger'));
                const fileInput: any = angular.element(element[0].querySelector('input.file-input'));

                let croppieInstance: Croppie = null;
                const initCroppie = (): Croppie => {
                    if (croppieInstance === null) {
                        // Create croppie
                        const croppieTarget: HTMLElement = element[0].querySelector('.croppie-target');
                        croppieInstance = new Croppie(croppieTarget, {
                            viewport: {
                                type: 'square',
                                width: VIEWPORT_SIZE,
                                height: VIEWPORT_SIZE,
                            },
                            customClass: 'has-image',
                            showZoomer: true,
                            update: (): void => {
                                if (updateTimeout !== undefined) {
                                    clearTimeout(updateTimeout);
                                }
                                updateTimeout = self.setTimeout(async () => {
                                    const image: Blob = await croppieInstance.result({
                                        type: 'blob',
                                        // TODO: Should be retrieved from clientInfo once available
                                        size: { width: 512, height: 512 },
                                        circle: false,
                                        format: 'png',
                                    });
                                    const fileReader = new FileReader();
                                    fileReader.onload = function() {
                                        scope.onChange(fileReader.result);
                                    };
                                    fileReader.readAsArrayBuffer(image);
                                }, 500);
                            },
                        });
                    }
                    return croppieInstance;
                };

                function loading(show: boolean): void {
                    if (show) {
                        editorArea.addClass('loading');
                    } else {
                        editorArea.removeClass('loading');
                    }
                }

                // set after default avatar is set
                let updateTimeout;

                // Function to fetch file contents
                // Resolve to ArrayBuffer or reject to ErrorEvent.
                function fetchFileContent(file: File): Promise<ArrayBuffer> {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = function(ev: ProgressEvent) {
                            // The result will be an ArrayBuffer because we call
                            // the `FileReader.readAsArrayBuffer` method.
                            resolve(this.result as ArrayBuffer);
                        };
                        reader.onerror = function(ev: ProgressEvent) {
                            // set a null object
                            reject(ev);
                        };
                        reader.onprogress = function(ev: ProgressEvent) {
                            if (ev.lengthComputable) {
                                // TODO implement progress?
                                // let progress = ((data.loaded / data.total) * 100);
                            }
                        };
                        reader.readAsArrayBuffer(file);
                    });
                }

                function uploadFiles(fileList: FileList): void {
                    if (fileList.length < 1) {
                        return;
                    }
                    // get first
                    fetchFileContent(fileList[0]).then((data: ArrayBuffer) => {
                        const image = bufferToUrl(data, 'image/jpeg', log);
                        setImage(image);
                    }).catch((ev: ErrorEvent) => {
                        log.error('Could not load file:', ev.message);
                    });
                }

                // Handle the drop effect
                function onDrop(ev: DragEvent): void {
                    ev.stopPropagation();
                    ev.preventDefault();

                    // simulate a leave to reset styles
                    onDragleave(ev);

                    // Upload files

                    uploadFiles(ev.dataTransfer.files);
                }

                // File is dragged over compose area
                function onDragover(ev: DragEvent): void {
                    ev.stopPropagation();
                    ev.preventDefault();
                    editorArea.addClass(DRAGOVER_CSS_CLASS);
                }

                // File is dragged out of compose area
                function onDragleave(ev: DragEvent): void {
                    ev.stopPropagation();
                    ev.preventDefault();
                    editorArea.removeClass(DRAGOVER_CSS_CLASS);
                }

                // File trigger is clicked
                function onFileTrigger(ev: MouseEvent): void {
                    ev.preventDefault();
                    ev.stopPropagation();
                    const input = element[0].querySelector('.file-input') as HTMLInputElement;
                    input.click();
                }

                // File(s) are uploaded via input field
                function onFileUploaded() {
                    uploadFiles(this.files);
                }

                function setImage(imageBase64Url: string) {
                    const croppie = initCroppie();
                    loading(true);

                    // load image to calculate size
                    const img = new Image();
                    img.addEventListener('load', async () => {
                        log.debug('Image loaded');

                        const w = img.naturalWidth;
                        const h = img.naturalHeight;
                        const size = Math.min(w, h);

                        // set to center
                        const imageSize: [number, number, number, number] = [
                            (w - size) / 2,
                            (h - size) / 2,
                            size,
                            size,
                        ];

                        try {
                            await croppie.bind({
                                url: imageBase64Url,
                                points: imageSize,
                            });
                        } catch (error) {
                            log.error('Could not bind avatar preview:', error);
                        }
                        loading(false);
                    });

                    img.addEventListener('error', function(e) {
                        // this is not a valid image
                        log.error('Could not load image:', e);
                        loading(false);
                    });

                    img.src = imageBase64Url;

                }

                // Handle dragover / dragleave events
                editorArea.on('dragover dragenter', onDragover);
                editorArea.on('dragleave dragend', onDragleave);

                // Handle drop event
                editorArea.on('drop', onDrop);

                // Handle click on file trigger
                fileTrigger.on('click', onFileTrigger);

                // Handle file uploads
                fileInput.on('change', onFileUploaded);

            },
            template: `
                <div class="avatar-editor">
                    <div class="avatar-editor-drag croppie-target"></div>
                    <div class="avatar-editor-navigation" layout="column" layout-wrap layout-margin layout-align="center center">
                        <input class="file-input" type="file" style="visibility: hidden" multiple>
                          <md-button type="submit" class="file-trigger md-raised">
                            <span translate>messenger.UPLOAD_AVATAR</span>
                           </md-button>
                    </div>
                </div>
            `,
        };
    },
];
