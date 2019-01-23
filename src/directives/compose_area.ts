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

import * as twemoji from 'twemoji';

import {extractText, isActionTrigger, logAdapter, replaceWhitespace} from '../helpers';
import {emojify, shortnameToUnicode} from '../helpers/emoji';
import {BrowserService} from '../services/browser';
import {StringService} from '../services/string';
import {TimeoutService} from '../services/timeout';
import {isElementNode, isTextNode} from '../typeguards';

/**
 * The compose area where messages are written.
 */
export default [
    'BrowserService',
    'StringService',
    'TimeoutService',
    '$timeout',
    '$translate',
    '$mdDialog',
    '$filter',
    '$log',
    '$rootScope',
    function(browserService: BrowserService,
             stringService: StringService,
             timeoutService: TimeoutService,
             $timeout: ng.ITimeoutService,
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
                onKeyDown: '=',

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

                // The current caret position, used when inserting objects
                let caretPosition: {
                    // The position in the source HTML
                    from?: number,
                    to?: number,
                    // The position in the visible character list
                    fromChar?: number,
                    toChar?: number,
                } = null;

                /**
                 * Stop propagation of click events and hold htmlElement of the emojipicker
                 */
                const EmojiPickerContainer = (function() {
                    let instance;

                    function click(e) {
                        e.stopPropagation();
                    }

                    return {
                        get: function() {
                            if (instance === undefined) {
                                instance = {
                                    htmlElement: composeArea[0].querySelector('div.twemoji-picker'),
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
                        timeoutService.cancel(stopTypingTimer);
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
                        timeoutService.cancel(stopTypingTimer);
                    }

                    // Define a timeout to send the stopTyping event
                    stopTypingTimer = timeoutService.register(stopTyping, 10000, true, 'stopTyping');
                }

                // Determine whether field is empty
                function composeAreaIsEmpty() {
                    const text = extractText(composeDiv[0], logAdapter($log.warn, logTag));
                    return text.length === 0;
                }

                // Submit the text from the compose area.
                //
                // Emoji images are converted to their alt text in this process.
                function submitText(): Promise<any> {
                    const text = extractText(composeDiv[0], logAdapter($log.warn, logTag));

                    return new Promise((resolve, reject) => {
                        const submitTexts = (strings: string[]) => {
                            const messages: threema.TextMessageData[] = [];
                            for (const piece of strings) {
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
                            const pieces: string[] = stringService.byteChunk(fullText, scope.maxTextLength, 50);
                            const confirm = $mdDialog.confirm()
                                .title($translate.instant('messenger.MESSAGE_TOO_LONG_SPLIT_SUBJECT'))
                                .textContent($translate.instant('messenger.MESSAGE_TOO_LONG_SPLIT_BODY', {
                                    max: scope.maxTextLength,
                                    count: pieces.length,
                                }))
                                .ok($translate.instant('common.YES'))
                                .cancel($translate.instant('common.NO'));

                            $mdDialog.show(confirm).then(function() {
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
                    if (!ev.shiftKey && ev.key === 'Enter') {
                        ev.preventDefault();
                    }

                    // If the keydown is handled and aborted outside
                    if (scope.onKeyDown && scope.onKeyDown(ev) !== true) {
                        ev.preventDefault();
                        return;
                    }

                    // At link time, the element is not yet evaluated.
                    // Therefore add following code to end of event loop.
                    $timeout(() => {
                        // Shift + enter to insert a newline. Enter to send.
                        if (!ev.shiftKey && ev.key === 'Enter') {
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
                        const text = extractText(composeDiv[0], logAdapter($log.warn, logTag), false);
                        if (text === '\n') {
                            composeDiv[0].innerText = '';
                        } else if (ev.keyCode === 190 && caretPosition !== null) {
                            // A ':' is pressed, try to parse
                            const currentWord = stringService.getWord(text, caretPosition.fromChar, [':']);
                            if (currentWord.realLength > 2 && currentWord.word.substr(0, 1) === ':') {
                                const trimmed = currentWord.word.substr(1, currentWord.word.length - 2);
                                const unicodeEmoji = shortnameToUnicode(trimmed);
                                if (unicodeEmoji !== null) {
                                    return insertEmoji(unicodeEmoji,
                                        caretPosition.from - currentWord.realLength,
                                        caretPosition.to);
                                }
                            }
                        }

                        // Update typing information (use text instead method)
                        if (text.trim().length === 0 || caretPosition === null) {
                            stopTyping();
                            scope.onTyping('');
                        } else {
                            startTyping();
                            scope.onTyping(text.trim(), stringService.getWord(text, caretPosition.from));
                        }

                        updateView();
                    }, 0);
                }

                // Function to fetch file contents
                // Resolve to ArrayBuffer or reject to ErrorEvent.
                function fetchFileListContents(fileList: FileList): Promise<Map<File, ArrayBuffer>> {
                    return new Promise((resolve) => {
                        const buffers = new Map<File, ArrayBuffer>();
                        const fileCounter = fileList.length;
                        const next = (file: File, res: ArrayBuffer | null, error: any) => {
                            buffers.set(file, res);
                            if (buffers.size >= fileCounter) {
                               resolve(buffers);
                            }
                        };
                        for (let n = 0; n < fileCounter; n++) {
                            const reader = new FileReader();
                            const file = fileList.item(n);
                            reader.onload = function(ev: ProgressEvent) {
                                next(file, this.result as ArrayBuffer, ev);
                            };
                            reader.onerror = function(ev: ProgressEvent) {
                                // set a null object
                                next(file, null, ev);
                            };
                            reader.onprogress = function(ev: ProgressEvent) {
                                if (ev.lengthComputable) {
                                    const progress = ((ev.loaded / ev.total) * 100);
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
                        const fileMessages = [];
                        data.forEach((buffer, file) => {
                            const fileMessageData: threema.FileMessageData = {
                                name: file.name,
                                fileType: file.type,
                                size: file.size,
                                data: buffer,
                            };

                            // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1240259
                            if (browserService.getBrowser().isFirefox(false)) {
                                if (fileMessageData.name.endsWith('.ogg') && fileMessageData.fileType === 'video/ogg') {
                                    fileMessageData.fileType = 'audio/ogg';
                                }
                            }

                            fileMessages.push(fileMessageData);
                        });
                        scope
                            .submit('file', fileMessages)
                            .catch((msg) => $log.error('Could not send file:', msg));
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
                        reader.onload = function(progressEvent: ProgressEvent) {
                            const buffer: ArrayBuffer = this.result as ArrayBuffer;

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
                            scope
                                .submit('file', [fileMessageData])
                                .catch((msg) => $log.error('Could not send file:', msg));
                        };
                        reader.readAsArrayBuffer(blob);

                    // Handle pasting of text
                    } else if (textIdx !== null) {
                        const text = ev.clipboardData.getData('text/plain');

                        // Look up some filter functions
                        // tslint:disable-next-line:max-line-length
                        const escapeHtml = $filter('escapeHtml') as (a: string) => string;
                        const mentionify = $filter('mentionify') as (a: string) => string;
                        const nlToBr = $filter('nlToBr') as (a: string, b?: boolean) => string;

                        // Escape HTML markup
                        const escaped = escapeHtml(text);

                        // Apply filters (emojify, convert newline, etc)
                        const formatted = replaceWhitespace(nlToBr(mentionify(emojify(escaped)), true));

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
                    const allEmoji: any = angular.element(emojiPicker.querySelectorAll('.content .em'));

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
                        EmojiPickerContainer.get().htmlElement.querySelectorAll('.content .em'));

                    // Remove event handlers
                    allEmoji.off('click', onEmojiChosen);
                    EmojiPickerContainer.destroy();
                }

                // Emoji trigger is clicked
                function onEmojiTrigger(ev: UIEvent): void {
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
                    insertEmoji(this.textContent);
                }

                function insertEmoji(emoji, posFrom?: number, posTo?: number): void {
                    const emojiElement = emojify(emoji);
                    insertHTMLElement(emoji, emojiElement, posFrom, posTo);
                }

                function insertMention(mentionString, posFrom?: number, posTo?: number): void {
                    const mentionElement = ($filter('mentionify') as any)(mentionString) as string;
                    insertHTMLElement(mentionString, mentionElement, posFrom, posTo);
                }

                function insertHTMLElement(
                    elementText: string, // The element as the original text representation, not yet converted to HTML
                    elementHtml: string, // The element converted to HTML
                    posFrom?: number,
                    posTo?: number,
                ): void {
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

                    let currentHtml = '';
                    for (let i = 0; i < contentElement.childNodes.length; i++) {
                        const node: Node = contentElement.childNodes[i];

                        if (isTextNode(node)) {
                            currentHtml += node.textContent;
                        } else if (isElementNode(node)) {
                            const tag = node.tagName.toLowerCase();
                            if (tag === 'img' || tag === 'span') {
                                currentHtml += getOuterHtml(node);
                            } else if (tag === 'br') {
                                // Firefox inserts a <br> after editing content editable fields.
                                // Remove the last <br> to fix this.
                                if (i < contentElement.childNodes.length - 1) {
                                    currentHtml += getOuterHtml(node);
                                }
                            } else if (tag === 'div') {
                                // Safari inserts a <div><br></div> after editing content editable fields.
                                // Remove the last instance to fix this.
                                if (node.childNodes.length === 1
                                    && isElementNode(node.lastChild)
                                    && node.lastChild.tagName.toLowerCase() === 'br') {
                                    // Ignore
                                } else {
                                    currentHtml += getOuterHtml(node);
                                }
                            }
                        }
                    }

                    // Because the browser may transform HTML code when
                    // inserting it into the DOM, we temporarily write it to a
                    // DOM element to ensure that the current representation
                    // corresponds to the representation when inserted into the
                    // DOM. (See #671 for details.)
                    const tmpDiv = document.createElement('div');
                    tmpDiv.innerHTML = elementHtml;
                    const cleanedElementHtml = tmpDiv.innerHTML;

                    // Insert element into currentHtml and determine new caret position
                    let newPos = posFrom;
                    if (caretPosition !== null) {
                        // If the caret position is set, then the user has moved around
                        // in the contenteditable field and might not be ad the end
                        // of the line.
                        posFrom = posFrom === undefined ? caretPosition.from : posFrom;
                        posTo = posTo === undefined ? caretPosition.to : posTo;

                        currentHtml = currentHtml.substr(0, posFrom)
                            + cleanedElementHtml
                            + currentHtml.substr(posTo);

                        // Change caret position
                        caretPosition.from += cleanedElementHtml.length;
                        caretPosition.fromChar += elementText.length;
                        newPos = posFrom + cleanedElementHtml.length;
                    } else {
                        // If the caret position is not set, then the user must be at the
                        // end of the line. Insert element there.
                        newPos = currentHtml.length;
                        currentHtml += cleanedElementHtml;
                        caretPosition = {
                            from: currentHtml.length,
                        };
                    }
                    caretPosition.to = caretPosition.from;
                    caretPosition.toChar = caretPosition.fromChar;

                    contentElement.innerHTML = currentHtml;
                    cleanupComposeContent();
                    setCaretPosition(newPos);

                    // Update the draft text
                    const text = extractText(composeDiv[0], logAdapter($log.warn, logTag));
                    scope.onTyping(text);

                    updateView();
                }

                // File trigger is clicked
                function onFileTrigger(ev: UIEvent): void {
                    ev.preventDefault();
                    ev.stopPropagation();
                    const input = element[0].querySelector('.file-input') as HTMLInputElement;
                    input.click();
                }

                function onSendTrigger(ev: UIEvent): boolean {
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
                    for (const img of composeDiv[0].getElementsByTagName('img')) {
                        img.ondragstart = () => false;
                    }
                    for (const span of composeDiv[0].getElementsByTagName('span')) {
                        span.setAttribute('contenteditable', false);
                    }

                    if (browserService.getBrowser().isFirefox(false)) {
                        // Disabling object resizing is the only way to disable resizing of
                        // emoji (contenteditable must be true, otherwise the emoji can not
                        // be removed with backspace (in FF))
                        //
                        // Note: This is not required anymore for FF63+ (but
                        // please test before removing it to make sure).
                        (document.execCommand as any)('enableObjectResizing', false, false);
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
                    const pseudoElement = document.createElement('pseudo');
                    pseudoElement.appendChild(node.cloneNode(true));
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
                            const from = getPositions(range.startOffset, range.startContainer);
                            if (from !== null && from.html >= 0) {
                                const to = getPositions(range.endOffset, range.endContainer);
                                caretPosition = {
                                    from: from.html,
                                    to: to.html,
                                    fromChar: from.text,
                                    toChar: to.text,
                                };
                            }
                        }
                    }
                }

                // Set the correct cart position in the content editable div.
                // Pos is the position in the html content (not in the visible plain text).
                function setCaretPosition(pos: number) {
                    const rangeAt = (node: Node, offset?: number) => {
                        const range = document.createRange();
                        range.collapse(false);
                        if (offset !== undefined) {
                            range.setStart(node, offset);
                        } else {
                            range.setStartAfter(node);
                        }
                        const sel = window.getSelection();
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

                // Handle paste event
                composeDiv.on('paste', onPaste);

                // Handle click on emoji trigger
                emojiTrigger.on('click', onEmojiTrigger);
                emojiTrigger.on('keypress', (ev: KeyboardEvent) => {
                    if (isActionTrigger(ev)) {
                        onEmojiTrigger(ev);
                    }
                });

                // Handle click on file trigger
                fileTrigger.on('click', onFileTrigger);
                fileTrigger.on('keypress', (ev: KeyboardEvent) => {
                    if (isActionTrigger(ev)) {
                        onFileTrigger(ev);
                    }
                });

                // Handle file uploads
                fileInput.on('change', onFileSelected);

                // Handle click on send trigger
                sendTrigger.on('click', onSendTrigger);
                sendTrigger.on('keypress', (ev: KeyboardEvent) => {
                    if (isActionTrigger(ev)) {
                        onSendTrigger(ev);
                    }
                });

                updateView();

                // Listen to broadcasts
                const unsubscribeListeners = [];
                unsubscribeListeners.push($rootScope.$on('onQuoted', (event: ng.IAngularEvent, args: any) => {
                    composeDiv[0].focus();
                }));

                unsubscribeListeners.push($rootScope.$on('onMentionSelected', (event: ng.IAngularEvent, args: any) => {
                    if (args.query && args.mention) {
                        // Insert resulting HTML
                        insertMention(args.mention, caretPosition ? caretPosition.to - args.query.length : null,
                            caretPosition ?  caretPosition.to : null);
                    }
                }));

                // When switching chat, send stopTyping message
                scope.$on('$destroy', () => {
                    unsubscribeListeners.forEach((u) => {
                        // Unsubscribe
                        u();
                    });
                    stopTyping();
                });
            },
            // tslint:disable:max-line-length
            template: `
                <div>
                    <div>
                        <i class="md-primary emoji-trigger trigger is-enabled material-icons" role="button" aria-label="emoji" tabindex="0">tag_faces</i>
                    </div>
                    <div>
                        <div
                            class="compose"
                            contenteditable
                            autofocus
                            translate
                            translate-attr-data-placeholder="messenger.COMPOSE_MESSAGE"
                            translate-attr-aria-label="messenger.COMPOSE_MESSAGE"
                            tabindex="0"
                        ></div>
                    </div>
                    <div>
                        <i class="md-primary send-trigger trigger material-icons" role="button" aria-label="send" tabindex="0">send</i>
                        <i class="md-primary file-trigger trigger is-enabled material-icons" role="button" aria-label="attach file" tabindex="0">attach_file</i>
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
