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

import {BrowserService} from '../services/browser';
import {StringService} from '../services/string';

/**
 * The compose area where messages are written.
 */
export default [
    'BrowserService',
    'StringService',
    '$window',
    '$timeout',
    '$translate',
    '$mdDialog',
    '$filter',
    '$log',
    function(browserService: BrowserService,
             stringService: StringService,
             $window, $timeout: ng.ITimeoutService,
             $translate: ng.translate.ITranslateService,
             $mdDialog: ng.material.IDialogService,
             $filter: ng.IFilterService,
             $log: ng.ILogService) {
        return {
            restrict: 'EA',
            scope: {
                // Callback to submit text or file data
                submit: '=',

                // Callbacks to update typing information
                startTyping: '=',
                stopTyping: '=',
                onTyping: '=',

                // Reference to drafts variable
                draft: '=',

                // Callback that is called when uploading files
                onUploading: '=',
                maxTextLength: '=',
            },
            link(scope: any, element) {
                // Logging
                const logTag = '[Directives.ComposeArea]';

                // Constants
                const TRIGGER_ENABLED_CSS_CLASS = 'is-enabled';
                const TRIGGER_ACTIVE_CSS_CLASS = 'is-active';

                // Elements
                const composeArea: any = element;
                const composeDiv: any = angular.element(element[0].querySelector('div.compose'));
                const emojiTrigger: any = angular.element(element[0].querySelector('i.emoji-trigger'));
                const emojiKeyboard: any = angular.element(element[0].querySelector('.emoji-keyboard'));
                const sendTrigger: any = angular.element(element[0].querySelector('i.send-trigger'));
                const fileTrigger: any = angular.element(element[0].querySelector('i.file-trigger'));
                const fileInput: any = angular.element(element[0].querySelector('input.file-input'));

                // Restore drafts
                if (scope.draft !== undefined) {
                    composeDiv[0].innerText = scope.draft;
                }

                let caretPosition: {from?: number, to?: number} = null;

                /**
                 * Stop propagation of click events and hold htmlElement of the emojipicker
                 */
                let EmoijPickerContainer = (function() {
                    let instance;

                    function click(e) {
                        e.stopPropagation();
                    }

                    return {
                        get: function() {
                            if (instance === undefined) {
                                instance = {
                                    htmlElement: composeArea[0].querySelector('div.emojione-picker'),
                                };
                                // append stop propagation
                                angular.element(instance.htmlElement).on('click', click);

                            }
                            return instance;
                        },
                        destroy: function() {
                            if (instance !== undefined) {
                                // remove stop propagation
                                angular.element(instance.htmlElement).off('click', click);
                                instance = undefined;
                            }
                        },
                    };
                })();

                // Submit the text from the compose area.
                //
                // Emoji images are converted to their alt text in this process.
                function submitText(): Promise<any> {
                    let text = '';
                    // tslint:disable-next-line: prefer-for-of (see #98)
                    for (let i = 0; i < composeDiv[0].childNodes.length; i++) {
                        const node = composeDiv[0].childNodes[i];
                        switch (node.nodeType) {
                            case Node.TEXT_NODE:
                                text += node.nodeValue;
                                break;
                            case Node.ELEMENT_NODE:
                                const tag = node.tagName.toLowerCase();
                                if (tag === 'img') {
                                    text += node.alt;
                                    break;
                                } else if (tag === 'br') {
                                    text += '\n';
                                    break;
                                }
                            default:
                                $log.warn(logTag, 'Unhandled node:', node);
                        }
                    }
                    return new Promise((resolve, reject) => {
                        let submitTexts = (strings: string[]) => {
                            let messages: threema.TextMessageData[] = [];
                            for (let piece of strings) {
                                messages.push({
                                    text: piece,
                                });
                            }

                            scope.submit('text', messages)
                                .then(resolve)
                                .catch(reject);
                        };

                        let fullText = text.trim();
                        if (fullText.length > scope.maxTextLength) {
                            let pieces: string[] = stringService.byteChunk(fullText, scope.maxTextLength, 50);
                            let confirm = $mdDialog.confirm()
                                .title($translate.instant('messenger.MESSAGE_TOO_LONG_SPLIT_SUBJECT'))
                                .textContent($translate.instant('messenger.MESSAGE_TOO_LONG_SPLIT_BODY', {
                                    max: scope.maxTextLength,
                                    count: pieces.length,
                                }))
                                .ok($translate.instant('common.YES'))
                                .cancel($translate.instant('common.NO'));

                            $mdDialog.show(confirm).then(function () {
                                submitTexts(pieces);
                            }, () => {
                                reject();
                            });
                        } else {
                            submitTexts([fullText]);
                        }
                    });
                }

                function sendText(): boolean {
                    if  (composeDiv[0].innerHTML.length > 0) {
                        submitText().then(() => {
                            // Clear compose div
                            composeDiv[0].innerText = '';

                            // Send stopTyping event
                            scope.stopTyping();

                            scope.onTyping('');

                            updateView();
                        }).catch(() => {
                            // do nothing
                            this.$log.warn('failed to submit text');
                        });

                        return true;
                    }
                    return false;
                }

                // Handle typing events
                function onTyping(ev: KeyboardEvent): void {
                    // If enter is pressed, prevent default event from being dispatched
                    if (!ev.shiftKey && ev.which === 13) {
                        ev.preventDefault();
                    }

                    // At link time, the element is not yet evaluated.
                    // Therefore add following code to end of event loop.
                    $timeout(() => {
                        // Shift + enter to insert a newline. Enter to send.
                        if (!ev.shiftKey && ev.which === 13) {
                            if (sendText()) {
                                return;
                            }
                        }

                        // Update typing information
                        if (composeDiv[0].innerText.length === 0) {
                            scope.stopTyping();
                        } else {
                            scope.startTyping(composeDiv[0].innerText);
                        }

                        // Notify about typing event
                        scope.onTyping(composeDiv[0].innerText);

                        updateView();
                    }, 0);
                }

                // Function to fetch file contents
                // Resolve to ArrayBuffer or reject to ErrorEvent.
                function fetchFileListContents(fileList: FileList): Promise<Map<File, ArrayBuffer>> {
                    return new Promise((resolve) => {
                        let buffers = new Map<File, ArrayBuffer>();
                        let next = (file: File, res: ArrayBuffer | null, error: any) => {
                            buffers.set(file, res);
                            if (buffers.size >= fileList.length) {
                               resolve(buffers);
                            }
                        };

                        for (let n = 0; n < fileList.length; n++) {
                            const reader = new FileReader();
                            const file = fileList.item(n);
                            reader.onload = (ev: Event) => {
                                next(file, (ev.target as FileReader).result, ev);
                            };
                            reader.onerror = (ev: ErrorEvent) => {
                                // set a null object
                                next(file, null, ev);
                            };
                            reader.onprogress = function(data) {
                                if (data.lengthComputable) {
                                    let progress = ((data.loaded / data.total) * 100);
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
                        let fileMessages = [];
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

                // Handle pasting
                function onPaste(ev: ClipboardEvent) {
                    ev.preventDefault();

                    // If no clipboard data is available, do nothing.
                    if (!ev.clipboardData) {
                        return;
                    }

                    // Extract pasted items
                    const items: DataTransferItemList = ev.clipboardData.items;
                    if (!items) {
                        return;
                    }

                    // Find available types
                    let fileIdx: number | null = null;
                    let textIdx: number | null = null;
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf('image/') !== -1 || items[i].type === 'application/x-moz-file') {
                            fileIdx = i;
                        } else if (items[i].type === 'text/plain') {
                            textIdx = i;
                        }
                    }

                    // Handle pasting of files
                    if (fileIdx !== null) {
                        // Read clipboard data as blob
                        const blob: Blob = items[fileIdx].getAsFile();

                        // Convert blob to arraybuffer
                        const reader = new FileReader();
                        reader.onload = function() {
                            let buffer: ArrayBuffer = this.result;

                            // Construct file name
                            let fileName: string;
                            if ((blob as any).name) {
                                fileName = (blob as any).name;
                            } else if (blob.type && blob.type.match(/^[^;]*\//) !== null) {
                                const fileExt = blob.type.split(';')[0].split('/')[1];
                                fileName = 'clipboard.' + fileExt;
                            } else {
                                $log.warn(logTag, 'Pasted file has an invalid MIME type: "' + blob.type + '"');
                                return;
                            }

                            // Send data as file
                            const fileMessageData: threema.FileMessageData = {
                                name: fileName,
                                fileType: blob.type,
                                size: blob.size,
                                data: buffer,
                            };
                            scope.submit('file', [fileMessageData]);
                        };
                        reader.readAsArrayBuffer(blob);

                    // Handle pasting of text
                    } else if (textIdx !== null) {
                        const text = ev.clipboardData.getData('text/plain');

                        // Look up some filter functions
                        const escapeHtml = $filter('escapeHtml') as (a: string) => string;
                        const emojify = $filter('emojify') as (a: string, b?: boolean) => string;
                        const nlToBr = $filter('nlToBr') as (a: string, b?: boolean) => string;

                        // Escape HTML markup
                        const escaped = escapeHtml(text);

                        // Apply filters (emojify, convert newline, etc)
                        const formatted = nlToBr(emojify(escaped, true), true);

                        // Insert resulting HTML
                        document.execCommand('insertHTML', false, formatted);

                        cleanupComposeContent();
                        updateView();
                    }
                }

                // Translate placeholder texts
                let regularPlaceholder = '';
                let dragoverPlaceholder = '';
                $translate('messenger.COMPOSE_MESSAGE').then((translated) => regularPlaceholder = translated);
                $translate('messenger.COMPOSE_MESSAGE_DRAGOVER').then((translated) => dragoverPlaceholder = translated);

                // Show emoji picker element
                function showEmojiPicker() {
                    const emojiPicker: HTMLElement = EmoijPickerContainer.get().htmlElement;

                    // Show
                    emojiKeyboard.addClass('active');
                    emojiTrigger.addClass(TRIGGER_ACTIVE_CSS_CLASS);

                    // Find all emoji
                    const allEmoji: any = angular.element(emojiPicker.querySelectorAll('.content .e1'));

                    // Add event handlers
                    allEmoji.on('click', onEmojiChosen);

                    // set focus to fix chat scroll bug
                    $timeout(() => {
                        composeDiv[0].focus();
                    });
                }

                // Hide emoji picker element
                function hideEmojiPicker() {
                    // Hide
                    emojiKeyboard.removeClass('active');
                    emojiTrigger.removeClass(TRIGGER_ACTIVE_CSS_CLASS);

                    // Find all emoji
                    const allEmoji: any = angular.element(
                        EmoijPickerContainer.get().htmlElement.querySelectorAll('.content .e1'));

                    // Remove event handlers
                    allEmoji.off('click', onEmojiChosen);
                    EmoijPickerContainer.destroy();
                }

                // Emoji trigger is clicked
                function onEmojiTrigger(ev: MouseEvent): void {
                    ev.stopPropagation();
                    // Toggle visibility of picker
                    if (emojiKeyboard.hasClass('active')) {
                        hideEmojiPicker();
                    } else {
                        showEmojiPicker();
                    }
                }

                // Emoji is chosen
                function onEmojiChosen(ev: MouseEvent): void {
                    ev.stopPropagation();
                    const emoji = this.textContent; // Unicode character
                    const formatted = ($filter('emojify') as any)(emoji, true);

                    // Firefox inserts a <br> after editing content editable fields.
                    // Remove the last <br> to fix this.
                    let currentHTML = '';
                    for (let i = 0; i < composeDiv[0].childNodes.length; i++) {
                        const node = composeDiv[0].childNodes[i];

                        if (node.nodeType === node.TEXT_NODE) {
                            currentHTML += node.textContent;
                        } else if (node.nodeType === node.ELEMENT_NODE) {
                            let tag = node.tagName.toLowerCase();
                            if (tag === 'img') {
                                currentHTML += getOuterHtml(node);
                            } else if (tag === 'br') {
                                // not not append br if the br is the LAST element
                                if (i < composeDiv[0].childNodes.length - 1) {
                                    currentHTML += getOuterHtml(node);
                                }
                            }
                        }
                    }

                    if (caretPosition !== null) {
                        currentHTML = currentHTML.substr(0, caretPosition.from)
                            + formatted
                            + currentHTML.substr(caretPosition.to);

                        // change caret position
                        caretPosition.from += formatted.length - 1;
                        caretPosition.to = caretPosition.from;
                    } else {
                        // insert at the end of line
                        currentHTML += formatted;
                        caretPosition = {
                            from: currentHTML.length,
                            to: currentHTML.length,
                        };
                    }

                    composeDiv[0].innerHTML = currentHTML;
                    cleanupComposeContent();
                    setCaretPosition(caretPosition.from);

                    updateView();
                }

                // File trigger is clicked
                function onFileTrigger(ev: MouseEvent): void {
                    ev.preventDefault();
                    ev.stopPropagation();
                    const input = element[0].querySelector('.file-input') as HTMLInputElement;
                    input.click();
                }

                function onSendTrigger(ev: MouseEvent): boolean {
                    ev.preventDefault();
                    ev.stopPropagation();
                    return sendText();
                }

                // File(s) are uploaded via input field
                function onFileSelected() {
                    uploadFiles(this.files);
                    fileInput.val('');
                }

                // Disable content editable and dragging for contained images (emoji)
                function cleanupComposeContent() {
                    for (let img of composeDiv[0].getElementsByTagName('img')) {
                        img.ondragstart = () => false;
                    }

                    if (browserService.getBrowser().firefox) {
                        // disable object resizing is the only way to disable resizing of
                        // emoji (contenteditable must be true, otherwise the emoji can not
                        // be removed with backspace (in FF))
                        document.execCommand('enableObjectResizing', false, false);
                    }
                }

                // Set all correct styles
                function updateView() {
                    if (composeDiv[0].innerHTML.length === 0) {
                        sendTrigger.removeClass(TRIGGER_ENABLED_CSS_CLASS);
                    } else {
                        sendTrigger.addClass(TRIGGER_ENABLED_CSS_CLASS);
                    }
                }

                // return the outer html of a node element
                function getOuterHtml(node: Node): string {
                    let pseudoElement = document.createElement('pseudo');
                    pseudoElement.appendChild(node.cloneNode());
                    return pseudoElement.innerHTML;
                }

                // return the html code position of the container element
                function getHTMLPosition(offset: number, container: Node) {
                    let pos = null;
                    if (composeDiv[0].contains(container)) {
                        let selectedElement;
                        if (container === composeDiv[0]) {
                            if (offset === 0) {
                                return 0;
                            }
                            selectedElement = composeDiv[0].childNodes[offset - 1];
                            pos = 0;
                        } else {
                            selectedElement =  container.previousSibling;
                            pos = offset;
                        }

                        while (selectedElement !== null) {
                            if (selectedElement.nodeType === Node.TEXT_NODE) {
                                pos += selectedElement.textContent.length;
                            } else {
                                pos += getOuterHtml(selectedElement).length;
                            }
                            selectedElement = selectedElement.previousSibling;
                        }
                    }
                    return pos;
                }

                // define position of caret
                function updateCaretPosition() {
                    caretPosition = null;
                    if (window.getSelection && composeDiv[0].innerHTML.length > 0) {
                        const selection = window.getSelection();
                        if (selection.rangeCount) {
                            const range = selection.getRangeAt(0);
                            let from = getHTMLPosition(range.startOffset, range.startContainer);
                            if (from !== null && from >= 0) {
                                caretPosition = {
                                    from: from,
                                    to: getHTMLPosition(range.endOffset, range.endContainer),
                                };
                            }
                        }
                    }
                }

                // set the correct cart position in the content editable div, position
                // is the position in the html content (not plain text)
                function setCaretPosition(pos: number) {
                    let rangeAt = (node: Node, offset?: number) => {
                        let range = document.createRange();
                        range.collapse(false);
                        if (offset !== undefined) {
                            range.setStart(node, offset);
                        } else {
                            range.setStartAfter(node);
                        }
                        let sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);
                    };

                    for (let i = 0; i < composeDiv[0].childNodes.length; i++) {
                        const node = composeDiv[0].childNodes[i];
                        let size;
                        let offset;
                        switch (node.nodeType) {
                            case Node.TEXT_NODE:
                                size = node.textContent.length;
                                offset = pos;
                                break;
                            case Node.ELEMENT_NODE:
                                size = getOuterHtml(node).length ;
                                break;
                            default:
                                $log.warn(logTag, 'Unhandled node:', node);
                        }

                        if (pos < size) {
                            // use this node
                            rangeAt(node, offset);
                            this.stop = true;
                        } else if (i === composeDiv[0].childNodes.length - 1) {
                            rangeAt(node);
                        }
                        pos -= size;
                    }
                }

                // Handle typing events
                composeDiv.on('keydown', onTyping);
                composeDiv.on('keyup mouseup', updateCaretPosition);
                composeDiv.on('selectionchange', updateCaretPosition);
                // When switching chat, send stopTyping message
                scope.$on('$destroy', scope.stopTyping);

                // Handle paste event
                composeDiv.on('paste', onPaste);

                // Handle click on emoji trigger
                emojiTrigger.on('click', onEmojiTrigger);

                // Handle click on file trigger
                fileTrigger.on('click', onFileTrigger);

                // Handle file uploads
                fileInput.on('change', onFileSelected);

                // Handle click on send trigger
                sendTrigger.on('click', onSendTrigger);

                updateView();
            },
            // tslint:disable:max-line-length
            template: `
                <div>
                    <div>
                        <i class="md-primary emoji-trigger trigger is-enabled material-icons">tag_faces</i>
                    </div>
                    <div>
                        <div class="compose" contenteditable translate translate-attr-data-placeholder="messenger.COMPOSE_MESSAGE" autofocus></div>
                    </div>
                    <div>
                        <i class="md-primary send-trigger trigger material-icons">send</i>
                        <i class="md-primary file-trigger trigger is-enabled material-icons">attach_file</i>
                        <input class="file-input" type="file" style="visibility: hidden" multiple>
                    </div>
                </div>
                <div class="emoji-keyboard">
                    <ng-include src="'partials/emoji-picker.html'" include-replace></ng-include>
                </div>

            `,
        };
    },
];
