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
    '$rootScope',
    function(browserService: BrowserService,
             stringService: StringService,
             $window, $timeout: ng.ITimeoutService,
             $translate: ng.translate.ITranslateService,
             $mdDialog: ng.material.IDialogService,
             $filter: ng.IFilterService,
             $log: ng.ILogService,
             $rootScope: ng.IRootScopeService) {
        return {
            restrict: 'EA',
            scope: {
                // Callback to submit text or file data
                submit: '=',

                // Callbacks to update typing information
                startTyping: '=',
                stopTyping: '=',
                onTyping: '=',

                // Reference to initial text and draft
                initialData: '=',

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

                // Set initial text
                if (scope.initialData.initialText) {
                    composeDiv[0].innerText = scope.initialData.initialText;
                    scope.initialData.initialText = '';
                } else if (scope.initialData.draft !== undefined) {
                    composeDiv[0].innerText = scope.initialData.draft;
                }

                let caretPosition: {
                    from?: number,
                    to?: number,
                    fromBytes?: number,
                    toBytes?: number } = null;

                /**
                 * Stop propagation of click events and hold htmlElement of the emojipicker
                 */
                let EmojiPickerContainer = (function() {
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

                // Typing events
                let stopTypingTimer: ng.IPromise<void> = null;
                function stopTyping() {
                    // We can only stop typing of the timer is set (meaning
                    // that we started typing earlier)
                    if (stopTypingTimer !== null) {
                        // Cancel timer
                        $timeout.cancel(stopTypingTimer);
                        stopTypingTimer = null;

                        // Send stop typing message
                        scope.stopTyping();
                    }
                }
                function startTyping() {
                    if (stopTypingTimer === null) {
                        // If the timer wasn't set previously, we just
                        // started typing!
                        scope.startTyping();
                    } else {
                        // Cancel timer, we'll re-create it
                        $timeout.cancel(stopTypingTimer);
                    }

                    // Define a timeout to send the stopTyping event
                    stopTypingTimer = $timeout(stopTyping, 10000);
                }

                // Process a DOM node recursively and extract text from compose area.
                function getText(trim = true) {
                    let text = '';
                    const visitChildNodes = (parentNode: HTMLElement) => {
                        // tslint:disable-next-line: prefer-for-of (see #98)
                        for (let i = 0; i < parentNode.childNodes.length; i++) {
                            const node = parentNode.childNodes[i] as HTMLElement;
                            switch (node.nodeType) {
                                case Node.TEXT_NODE:
                                    // Append text, but strip leading and trailing newlines
                                    text += node.nodeValue.replace(/(^[\r\n]*|[\r\n]*$)/g, '');
                                    break;
                                case Node.ELEMENT_NODE:
                                    const tag = node.tagName.toLowerCase();
                                    if (tag === 'div') {
                                        visitChildNodes(node);
                                        break;
                                    } else if (tag === 'img') {
                                        text += (node as HTMLImageElement).alt;
                                        break;
                                    } else if (tag === 'br') {
                                        text += '\n';
                                        break;
                                    }
                                default:
                                    $log.warn(logTag, 'Unhandled node:', node);
                            }
                        }
                    };
                    visitChildNodes(composeDiv[0]);
                    return trim ? text.trim() : text;
                }

                // Determine whether field is empty
                function composeAreaIsEmpty() {
                    return getText().length === 0;
                }

                // Submit the text from the compose area.
                //
                // Emoji images are converted to their alt text in this process.
                function submitText(): Promise<any> {
                    const text = getText();

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

                        const fullText = text.trim().replace(/\r/g, '');
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
                    if (!composeAreaIsEmpty()) {
                        submitText().then(() => {
                            // Clear compose div
                            composeDiv[0].innerText = '';
                            composeDiv[0].focus();

                            // Send stopTyping event
                            stopTyping();

                            // Clear draft
                            scope.onTyping('');

                            updateView();
                        }).catch(() => {
                            // do nothing
                            $log.warn(logTag, 'Failed to submit text');
                        });

                        return true;
                    }
                    return false;
                }

                // Handle typing events
                function onKeyDown(ev: KeyboardEvent): void {
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

                        updateView();
                    }, 0);
                }

                function onKeyUp(ev: KeyboardEvent): void {
                    // At link time, the element is not yet evaluated.
                    // Therefore add following code to end of event loop.
                    $timeout(() => {

                        // If the compose area contains only a single <br>, make it fully empty.
                        // See also: https://stackoverflow.com/q/14638887/284318
                        let text = getText(false);
                        if (text === '\n') {
                            composeDiv[0].innerText = '';
                        } else if (ev.keyCode === 190) {
                            // A ':' is pressed, try to parse
                            let currentWord = stringService.getWord(text, caretPosition.fromBytes, [':']);
                            if (currentWord.length > 2
                                && currentWord.substr(0, 1) === ':') {
                                let unicodeEmoji = emojione.shortnameToUnicode(currentWord);
                                if (unicodeEmoji && unicodeEmoji !== currentWord) {
                                    return insertEmoji(unicodeEmoji,
                                        caretPosition.from - currentWord.length,
                                        caretPosition.to);
                                }
                            }
                        }

                        // Update typing information (use text instead method)
                        if (text.trim().length === 0) {
                            stopTyping();
                        } else {
                            startTyping();
                        }
                        scope.onTyping(text.trim());

                        updateView();
                    }, 0);
                }

                // Function to fetch file contents
                // Resolve to ArrayBuffer or reject to ErrorEvent.
                function fetchFileListContents(fileList: FileList): Promise<Map<File, ArrayBuffer>> {
                    return new Promise((resolve) => {
                        let buffers = new Map<File, ArrayBuffer>();
                        const fileCounter = fileList.length;
                        let next = (file: File, res: ArrayBuffer | null, error: any) => {
                            buffers.set(file, res);
                            if (buffers.size >= fileCounter) {
                               resolve(buffers);
                            }
                        };
                        for (let n = 0; n < fileCounter; n++) {
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
                                    scope.onUploading(true, progress, 100 / fileCounter * n);
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

                            // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1240259
                            if (browserService.getBrowser().firefox) {
                                if (fileMessageData.name.endsWith('.ogg') && fileMessageData.fileType === 'video/ogg') {
                                    fileMessageData.fileType = 'audio/ogg';
                                }
                            }

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
                    const emojiPicker: HTMLElement = EmojiPickerContainer.get().htmlElement;

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
                        EmojiPickerContainer.get().htmlElement.querySelectorAll('.content .e1'));

                    // Remove event handlers
                    allEmoji.off('click', onEmojiChosen);
                    EmojiPickerContainer.destroy();
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
                    insertEmoji (this.textContent);
                }

                function insertEmoji(emoji, posFrom = null, posTo = null): void {
                    const formatted = ($filter('emojify') as any)(emoji, true, true);

                    // In Chrome in right-to-left mode, our content editable
                    // area may contain a DIV element.
                    const childNodes = composeDiv[0].childNodes;
                    const nestedDiv = childNodes.length === 1
                        && childNodes[0].tagName !== undefined
                        && childNodes[0].tagName.toLowerCase() === 'div';
                    let contentElement;
                    if (nestedDiv === true) {
                        contentElement = composeDiv[0].childNodes[0];
                    } else {
                        contentElement = composeDiv[0];
                    }

                    let currentHTML = '';
                    for (let i = 0; i < contentElement.childNodes.length; i++) {
                        const node = contentElement.childNodes[i];

                        if (node.nodeType === node.TEXT_NODE) {
                            currentHTML += node.textContent;
                        } else if (node.nodeType === node.ELEMENT_NODE) {
                            let tag = node.tagName.toLowerCase();
                            if (tag === 'img') {
                                currentHTML += getOuterHtml(node);
                            } else if (tag === 'br') {
                                // Firefox inserts a <br> after editing content editable fields.
                                // Remove the last <br> to fix this.
                                if (i < contentElement.childNodes.length - 1) {
                                    currentHTML += getOuterHtml(node);
                                }
                            }
                        }
                    }

                    if (caretPosition !== null) {
                        posFrom = null === posFrom ? caretPosition.from : posFrom;
                        posTo = null === posTo ? caretPosition.to : posTo;
                        currentHTML = currentHTML.substr(0, posFrom)
                            + formatted
                            + currentHTML.substr(posTo);

                        // change caret position
                        caretPosition.from += formatted.length - 1;
                        caretPosition.fromBytes++;
                    } else {
                        // insert at the end of line
                        posFrom = currentHTML.length;
                        currentHTML += formatted;
                        caretPosition = {
                            from: currentHTML.length,
                        };
                    }
                    caretPosition.to = caretPosition.from;
                    caretPosition.toBytes = caretPosition.fromBytes;

                    contentElement.innerHTML = currentHTML;
                    cleanupComposeContent();
                    setCaretPosition(posFrom);

                    // Update the draft text
                    scope.onTyping(getText());

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
                    if (composeAreaIsEmpty()) {
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
                function getPositions(offset: number, container: Node): {html: number, text: number} {
                    let pos = null;
                    let textPos = null;

                    if (composeDiv[0].contains(container)) {
                        let selectedElement;
                        if (container === composeDiv[0]) {
                            if (offset === 0) {
                                return {
                                    html: 0, text: 0,
                                };
                            }
                            selectedElement = composeDiv[0].childNodes[offset - 1];
                            pos = 0;
                            textPos = 0;
                        } else {
                            selectedElement =  container.previousSibling;
                            pos = offset;
                            textPos = offset;
                        }

                        while (selectedElement !== null) {
                            if (selectedElement.nodeType === Node.TEXT_NODE) {
                                pos += selectedElement.textContent.length;
                                textPos += selectedElement.textContent.length;
                            } else {
                                pos += getOuterHtml(selectedElement).length;
                                textPos += 1;
                            }
                            selectedElement = selectedElement.previousSibling;
                        }
                    }
                    return {
                        html: pos,
                        text: textPos,
                    };
                }

                // Update the current caret position or selection
                function updateCaretPosition() {
                    caretPosition = null;
                    if (window.getSelection && composeDiv[0].innerHTML.length > 0) {
                        const selection = window.getSelection();
                        if (selection.rangeCount) {
                            const range = selection.getRangeAt(0);
                            let from = getPositions(range.startOffset, range.startContainer);
                            if (from !== null && from.html >= 0) {
                                const to = getPositions(range.endOffset, range.endContainer);

                                caretPosition = {
                                    from: from.html,
                                    to: to.html,
                                    fromBytes: from.text,
                                    toBytes: to.text,
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
                        } else if (i === composeDiv[0].childNodes.length - 1) {
                            rangeAt(node);
                        }
                        pos -= size;
                    }
                }

                // Handle typing events
                composeDiv.on('keydown', onKeyDown);
                composeDiv.on('keyup', onKeyUp);
                composeDiv.on('keyup mouseup', updateCaretPosition);
                composeDiv.on('selectionchange', updateCaretPosition);

                // When switching chat, send stopTyping message
                scope.$on('$destroy', stopTyping);

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

                $rootScope.$on('onQuoted', (event: ng.IAngularEvent, args: any) => {
                    composeDiv[0].focus();
                });
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
