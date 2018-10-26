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

// tslint:disable:max-line-length

import {bufferToUrl, logAdapter} from '../helpers';

/**
 * Support uploading and resizing avatar
 */
export default [
    '$log',
    function($log: ng.ILogService) {
        return {
            restrict: 'EA',
            scope: {
                onChange: '=',
            },
            link(scope: any, element, attrs, controller) {
                const logTag: string = '[AvatarEditorDirective]';

                // Constants
                const DRAGOVER_CSS_CLASS = 'is-dragover';
                const VIEWPORT_SIZE = 220;

                // Elements
                const editorArea: any = angular.element(element[0].querySelector('.avatar-editor'));
                const fileTrigger: any = angular.element(element[0].querySelector('.file-trigger'));
                const fileInput: any = angular.element(element[0].querySelector('input.file-input'));
                // const avatarRemove: any = angular.element(element[0].querySelector('.avatar-remove'));
                // const navigation: any = angular.element(element[0].querySelector('.avatar-area-navigation'));
                const enabled = scope.enabled === undefined || scope.enabled === true;

                let croppieInstance = null;
                const initCroppie = () => {
                    if (croppieInstance !== null) {
                        return croppieInstance;
                    }
                    croppieInstance = new Croppie(element[0].querySelector('.croppie-target'), {
                        viewport: {
                            type: 'square',
                            width: VIEWPORT_SIZE,
                            height: VIEWPORT_SIZE,
                        },
                        customClass: 'has-image',
                        showZoomer: true,
                        update() {
                            if (updateTimeout !== undefined) {
                                clearTimeout(updateTimeout);
                            }

                            updateTimeout = self.setTimeout(() => {
                                croppieInstance.result({
                                    type: 'blob',
                                    // max allowed size on device
                                    size: [512, 512],
                                    circle: false,
                                    format: 'png',
                                })
                                    .then((blob: Blob) => {
                                        const fileReader = new FileReader();
                                        fileReader.onload = function() {
                                            scope.onChange(this.result);
                                        };
                                        fileReader.readAsArrayBuffer(blob);
                                    });
                            }, 500);
                        },
                    });

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
                        reader.onload = function(ev: FileReaderProgressEvent) {
                            resolve(ev.target.result);
                        };
                        reader.onerror = function(ev: FileReaderProgressEvent) {
                            // set a null object
                            reject(ev);
                        };
                        reader.onprogress = function(ev: FileReaderProgressEvent) {
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
                        const image = bufferToUrl(data, 'image/jpeg', logAdapter($log.warn, logTag));
                        setImage(image);
                    }).catch((ev: ErrorEvent) => {
                        $log.error(logTag, 'Could not load file:', ev.message);
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

                function setImage(newImage: any) {
                    const croppie = initCroppie();

                    if (newImage === null) {
                        // set a none image
                        // TODO
                        croppie.bind({
                            url: null,
                        });

                        scope.onChange(null);
                        return;
                    }

                    loading(true);
                    // load image to calculate size
                    const img = new Image();
                    img.addEventListener('load', function() {
                        $log.debug(logTag, 'Image loaded');

                        const w = this.naturalWidth;
                        const h = this.naturalHeight;
                        const size = Math.min(w, h);

                        // set to center
                        const imageSize = [
                            (w - size) / 2,
                            (h - size) / 2,
                            size,
                            size];

                        croppie.bind({
                            url: newImage,
                            points: imageSize,
                        }).then(() => {
                            loading(false);
                        }).catch((e) => {
                            $log.error(logTag, 'Could not bind avatar preview:', e);
                            loading(false);
                        });

                        if (newImage === null) {
                            scope.onChange(null);
                        }
                    });

                    img.addEventListener('error', function(e) {
                        // this is not a valid image
                        $log.error(logTag, 'Could not load image:', e);
                        loading(false);
                    });

                    img.src = newImage;

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

                // Handle remove
                if (scope.enableClear !== undefined && scope.enableClear === true) {
                    // avatarRemove.on('click', () => {
                    //     setImage(null);
                    // });
                } else {
                    // remove element if clear disabled
                    // avatarRemove.remove();
                }

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
