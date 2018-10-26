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

/**
 * Allow to drag and drop elements, set class to parent object
 */
export default [
    '$log',
    function($log: ng.ILogService) {
        return {
            restrict: 'EA',
            scope: {
                submit: '=',
                onUploading: '=',
            },
            link(scope: any, element) {
                // Logging
                const logTag = '[Directives.DragFile]';

                // Constants
                const DRAGOVER_CSS_CLASS = 'is-dragover';

                // Elements
                const overlay: any = angular.element(element[0]);
                const dragElement: any = angular.element(element[0]).parent('.drag-container');

                // Function to fetch file contents
                // Resolve to ArrayBuffer or reject to ErrorEvent.
                function fetchFileListContents(fileList: FileList): Promise<Map<File, ArrayBuffer>> {
                    return new Promise((resolve) => {
                        const buffers = new Map<File, ArrayBuffer>();
                        const next = (file: File, res: ArrayBuffer | null, error?: FileReaderProgressEvent) => {
                            buffers.set(file, res);
                            if (buffers.size >= fileList.length) {
                                resolve(buffers);
                            }
                            if (error !== undefined) {
                                $log.error(logTag, 'Error:', error);
                            }
                        };

                        for (let n = 0; n < fileList.length; n++) {
                            const reader = new FileReader();
                            const file = fileList.item(n);
                            reader.onload = function(ev: FileReaderProgressEvent) {
                                next(file, ev.target.result);
                            };
                            reader.onerror = function(ev: FileReaderProgressEvent) {
                                // set a null object
                                next(file, null, ev);
                            };
                            reader.onprogress = function(ev: FileReaderProgressEvent) {
                                if (ev.lengthComputable) {
                                    const progress = ((ev.loaded / ev.total) * 100);
                                    scope.onUploading(true, progress, 100 / fileList.length * n);
                                }
                            };
                            reader.readAsArrayBuffer(file);
                        }
                    });
                }

                function uploadFiles(fileList: FileList): void {
                    scope.onUploading(true, 0, 0);
                    fetchFileListContents(fileList).then((data: Map<File, ArrayBuffer>) => {
                        const fileMessages = [];
                        data.forEach((buffer, file) => {
                            const fileMessageData: threema.FileMessageData = {
                                name: file.name,
                                fileType: file.type,
                                size: file.size,
                                data: buffer,
                            };
                            fileMessages.push(fileMessageData);
                        });
                        scope.submit('file', fileMessages);
                        scope.onUploading(false);

                    }).catch((ev: ErrorEvent) => {
                        $log.error(logTag, 'Could not load file:', ev.message);
                    });
                }

                // Handle the drop effect
                function onDrop(ev: DragEvent): void {
                    ev.stopPropagation();
                    ev.preventDefault();

                    // simulate a leave to reset styles
                    onDragLeave(ev);

                    // Upload files

                    uploadFiles(ev.dataTransfer.files);
                }

                // File is dragged over compose area
                function onDragOver(ev: DragEvent): void {
                    ev.stopPropagation();
                    ev.preventDefault();
                    dragElement.addClass(DRAGOVER_CSS_CLASS);
                    // composeArea.find('div').attr('placeholder', dragoverPlaceholder);
                }

                // File is dragged out of compose area
                function onDragLeave(ev: DragEvent): void {
                    ev.stopPropagation();
                    ev.preventDefault();
                    dragElement.removeClass(DRAGOVER_CSS_CLASS);
                }

                // When switching chat, send stopTyping message
                scope.$on('$destroy', scope.stopTyping);

                // Handle dragover / dragleave events
                dragElement.on('dragover dragenter', onDragOver);
                overlay.on('dragleave dragend', onDragLeave);
                overlay.on('drop', onDrop);
            },
            template: `
                <div class="drag-file-overlay">
                    <div>
                        <span translate>messenger.COMPOSE_MESSAGE_DRAGOVER</span>
                     </div>
                </div>`,
        };
    },
];
