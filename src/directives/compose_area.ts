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

import {ComposeArea} from '@threema/compose-area';
import * as twemoji from 'twemoji';

import {hasValue, isActionTrigger, logAdapter, replaceWhitespace} from '../helpers';
import {emojify, emojifyNew, shortnameToUnicode} from '../helpers/emoji';
import {BrowserService} from '../services/browser';
import {ReceiverService} from '../services/receiver';
import {StringService} from '../services/string';
import {TimeoutService} from '../services/timeout';
import {isElementNode, isEmojiInfo, isTextNode} from '../typeguards';

/**
 * The compose area where messages are written.
 */
export default [
    'BrowserService',
    'StringService',
    'TimeoutService',
    'ReceiverService',
    '$timeout',
    '$translate',
    '$mdDialog',
    '$filter',
    '$log',
    '$rootScope',
    'CONFIG',
    function(browserService: BrowserService,
             stringService: StringService,
             timeoutService: TimeoutService,
             receiverService: ReceiverService,
             $timeout: ng.ITimeoutService,
             $translate: ng.translate.ITranslateService,
             $mdDialog: ng.material.IDialogService,
             $filter: ng.IFilterService,
             $log: ng.ILogService,
             $rootScope: ng.IRootScopeService,
             CONFIG: threema.Config) {
        return {
            restrict: 'EA',
            scope: {
                // Callback to get a reference to the initialized ComposeArea instance.
                onInit: '=',

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

                receiver: '<receiver',
            },
            link: function(scope: any, element) {
                // Logging
                const logTag = '[Directives.ComposeArea]';

                // Constants
                const TRIGGER_ENABLED_CSS_CLASS = 'is-enabled';
                const TRIGGER_ACTIVE_CSS_CLASS = 'is-active';

                // Elements
                const wrapper: any = element;
                const composeDiv: any = angular.element(element[0].querySelector('div.compose'));
                const emojiTrigger: any = angular.element(element[0].querySelector('i.emoji-trigger'));
                const emojiKeyboard: any = angular.element(element[0].querySelector('.emoji-keyboard'));
                const sendTrigger: any = angular.element(element[0].querySelector('i.send-trigger'));
                const fileTrigger: any = angular.element(element[0].querySelector('i.file-trigger'));
                const fileInput: any = angular.element(element[0].querySelector('input.file-input'));

                // Initialize compose area lib
                const composeArea = ComposeArea.bind_to(composeDiv[0], CONFIG.DEBUG ? 'debug' : 'warn');
                if (scope.onInit) {
                    scope.onInit(composeArea);
                }

                // Set initial text
                if (scope.initialData.initialText) {
                    composeDiv[0].innerText = scope.initialData.initialText;
                    scope.initialData.initialText = '';
                } else if (scope.initialData.draft !== undefined) {
                    composeDiv[0].innerText = scope.initialData.draft;
                }

                let chatBlocked = false;

                // Function to update blocking state
                function setChatBlocked(blocked: boolean) {
                    chatBlocked = blocked;
                    $log.debug(logTag, 'Receiver blocked:', blocked);
                    if (blocked) {
                        sendTrigger.removeClass(TRIGGER_ENABLED_CSS_CLASS);
                        emojiTrigger.removeClass(TRIGGER_ENABLED_CSS_CLASS);
                        fileTrigger.removeClass(TRIGGER_ENABLED_CSS_CLASS);
                        composeDiv.attr('contenteditable', false);
                        if (emojiKeyboard.hasClass('active')) {
                            hideEmojiPicker();
                        }
                    } else {
                        if (composeAreaIsEmpty()) {
                            sendTrigger.removeClass(TRIGGER_ENABLED_CSS_CLASS);
                        } else {
                            sendTrigger.addClass(TRIGGER_ENABLED_CSS_CLASS);
                        }
                        emojiTrigger.addClass(TRIGGER_ENABLED_CSS_CLASS);
                        fileTrigger.addClass(TRIGGER_ENABLED_CSS_CLASS);
                        composeDiv.attr('contenteditable', true);
                    }
                }

                // Initialize blocking state
                setChatBlocked(receiverService.isBlocked(scope.receiver));

                // Watch `isBlocked` flag for changes
                scope.$watch(
                    (_scope) => receiverService.isBlocked(_scope.receiver),
                    (isBlocked: boolean, wasBlocked: boolean) => {
                        if (isBlocked !== wasBlocked) {
                            setChatBlocked(isBlocked);
                        }
                    },
                );

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
                                    htmlElement: wrapper[0].querySelector('div.twemoji-picker'),
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
                    return composeArea.get_text(false).length === 0;
                }

                // Submit the text from the compose area.
                //
                // Emoji images are converted to their alt text in this process.
                function submitText(): Promise<any> {
                    const text = composeArea.get_text(false).replace(/\r/g, '');

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

                        if (text.length > scope.maxTextLength) {
                            const pieces: string[] = stringService.byteChunk(text, scope.maxTextLength, 50);
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
                            submitTexts([text]);
                        }
                    });
                }

                function sendText(): boolean {
                    if (!composeAreaIsEmpty()) {
                        submitText().then(() => {
                            // Clear compose div
                            composeArea.clear();
                            composeArea.focus();

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
                        const text = composeArea.get_text(true);
                        if (text === '\n') {
                            composeDiv[0].innerText = '';
                        // TODO
                        // } else if ((ev.keyCode === 190 || ev.key === ':') && caretPosition !== null) {
                        //    // A ':' is pressed, try to parse
                        //    const currentWord = stringService.getWord(text, caretPosition.fromChar, [':']);
                        //    if (currentWord.realLength > 2 && currentWord.word.substr(0, 1) === ':') {
                        //        const trimmed = currentWord.word.substr(1, currentWord.word.length - 2);
                        //        const unicodeEmoji = shortnameToUnicode(trimmed);
                        //        if (unicodeEmoji !== null) {
                        //            return insertEmoji(unicodeEmoji,
                        //                caretPosition.from - currentWord.realLength,
                        //                caretPosition.to);
                        //        }
                        //    }
                        }

                        // Update typing information
                        if (text.trim().length === 0) {
                            stopTyping();
                            scope.onTyping('');
                        } else {
                            startTyping();
                            scope.onTyping(text.trim(), null/* TODO stringService.getWord(text, caretPosition.from)*/);
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
                        if (text) {
                            const tokens = emojifyNew(text);
                            for (const token of tokens) {
                                if (isEmojiInfo(token)) {
                                    insertEmoji(token);
                                } else {
                                    composeArea.insert_text(token);
                                }
                            }
                            updateView();
                        }
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

                    // Find some selectors
                    const allEmoji: any = angular.element(emojiPicker.querySelectorAll('.content .em'));
                    const allEmojiTabs: any = angular.element(emojiPicker.querySelectorAll('.tab label img'));

                    // Add event handlers
                    allEmoji.on('click', onEmojiChosen);
                    allEmojiTabs.on('keydown', onEmojiTabSelected);

                    // set focus to fix chat scroll bug
                    $timeout(() => {
                        composeDiv[0].focus();
                    });
                }

                // Hide emoji picker element
                function hideEmojiPicker() {
                    const emojiPicker: HTMLElement = EmojiPickerContainer.get().htmlElement;

                    // Hide
                    emojiKeyboard.removeClass('active');
                    emojiTrigger.removeClass(TRIGGER_ACTIVE_CSS_CLASS);

                    // Find some selectors
                    const allEmoji: any = angular.element(emojiPicker.querySelectorAll('.content .em'));
                    const allEmojiTabs: any = angular.element(emojiPicker.querySelectorAll('.tab label img'));

                    // Remove event handlers
                    allEmoji.off('click', onEmojiChosen);
                    allEmojiTabs.off('keydown', onEmojiTabSelected);
                    EmojiPickerContainer.destroy();
                }

                // Emoji trigger is clicked
                function onEmojiTrigger(ev: UIEvent): void {
                    ev.stopPropagation();
                    if (chatBlocked) {
                        hideEmojiPicker();
                        return;
                    }
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
                    insertEmojiString(this.textContent);
                }

                // Emoji tab is selected
                function onEmojiTabSelected(ev: KeyboardEvent): void {
                    if (ev.key === ' ' || ev.key === 'Enter') {
                        // Warning: Hacky
                        this.parentElement.previousElementSibling.checked = true;
                    }
                }

                // Insert a single emoji, passed in as string
                function insertEmojiString(emojiString: string): void {
                    const tokens = emojifyNew(emojiString);
                    if (tokens.length !== 1) {
                        throw new Error(`Emoji parsing failed: Expected 1 element, found ${tokens.length}`);
                    }
                    const emoji = tokens[0];
                    if (!isEmojiInfo(emoji)) {
                        throw new Error(`Emoji parsing failed: Returned text, not emoji info`);
                    }
                    insertEmoji(emoji);
                }

                // Insert a single emoji
                function insertEmoji(emoji: threema.EmojiInfo): void {
                    const img: HTMLElement = composeArea.insert_image(emoji.imgPath, emoji.emojiString, 'em');
                    img.draggable = false;
                    img.ondragstart = () => false;
                }

                // TODO
                // function insertMention(mentionString, posFrom?: number, posTo?: number): void {
                //     const mentionElement = ($filter('mentionify') as any)(mentionString) as string;
                //     insertHTMLElement(mentionString, mentionElement, posFrom, posTo);
                // }

                // File trigger is clicked
                function onFileTrigger(ev: UIEvent): void {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (chatBlocked) {
                        return;
                    }
                    const input = element[0].querySelector('.file-input') as HTMLInputElement;
                    input.click();
                }

                function onSendTrigger(ev: UIEvent): boolean {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (chatBlocked) {
                        return;
                    }
                    return sendText();
                }

                // File(s) are uploaded via input field
                function onFileSelected() {
                    uploadFiles(this.files);
                    fileInput.val('');
                }

                // Set all correct styles
                function updateView() {
                    if (composeAreaIsEmpty()) {
                        sendTrigger.removeClass(TRIGGER_ENABLED_CSS_CLASS);
                    } else {
                        sendTrigger.addClass(TRIGGER_ENABLED_CSS_CLASS);
                    }
                }

                // Handle typing events
                composeDiv.on('keydown', onKeyDown);
                composeDiv.on('keyup', onKeyUp);

                // Handle selection change
                document.addEventListener('selectionchange', () => {
                    composeArea.store_selection_range();
                });

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
                            id="composeDiv"
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
