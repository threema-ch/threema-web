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

import {isActionTrigger} from '../helpers';
import {emojifyNew, shortnameToUnicode} from '../helpers/emoji';
import {BrowserService} from '../services/browser';
import {LogService} from '../services/log';
import {ReceiverService} from '../services/receiver';
import {StringService} from '../services/string';
import {TimeoutService} from '../services/timeout';
import {isEmojiInfo, isKeyboardEvent} from '../typeguards';

/**
 * The compose area where messages are written.
 */
export default [
    'BrowserService',
    'LogService',
    'StringService',
    'TimeoutService',
    'ReceiverService',
    '$timeout',
    '$translate',
    '$mdDialog',
    '$filter',
    '$rootScope',
    'CONFIG',
    function(browserService: BrowserService,
             logService: LogService,
             stringService: StringService,
             timeoutService: TimeoutService,
             receiverService: ReceiverService,
             $timeout: ng.ITimeoutService,
             $translate: ng.translate.ITranslateService,
             $mdDialog: ng.material.IDialogService,
             $filter: ng.IFilterService,
             $rootScope: ng.IRootScopeService,
             CONFIG: threema.Config) {
        const log = logService.getLogger('ComposeArea-C');
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
            link: function(scope: any, wrapper: JQLite) {
                // Constants
                const TRIGGER_ENABLED_CSS_CLASS = 'is-enabled';
                const TRIGGER_ACTIVE_CSS_CLASS = 'is-active';

                // Elements
                const select = (selector) => angular.element(wrapper[0].querySelector(selector));
                const composeDiv = select('div.compose') as JQuery<HTMLElement>;
                const emojiTrigger = select('i.emoji-trigger') as JQuery<HTMLElement>;
                const emojiKeyboard = select('.emoji-keyboard') as JQuery<HTMLElement>;
                const sendTrigger = select('i.send-trigger') as JQuery<HTMLElement>;
                const fileTrigger = select('i.file-trigger') as JQuery<HTMLElement>;
                const fileInput = select('input.file-input') as JQuery<HTMLInputElement>;

                // Initialize compose area lib
                const composeArea = ComposeArea.bind_to(composeDiv[0], CONFIG.COMPOSE_AREA_LOG_LEVEL);
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
                    log.debug('Receiver blocked:', blocked);
                    if (blocked) {
                        sendTrigger.removeClass(TRIGGER_ENABLED_CSS_CLASS);
                        emojiTrigger.removeClass(TRIGGER_ENABLED_CSS_CLASS);
                        fileTrigger.removeClass(TRIGGER_ENABLED_CSS_CLASS);
                        composeDiv.attr('contenteditable', 'false');
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
                        composeDiv.attr('contenteditable', 'true');
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
                    return composeArea.get_text().length === 0;
                }

                // Submit the text from the compose area.
                //
                // Emoji images are converted to their alt text in this process.
                function submitText(): Promise<any> {
                    const text = composeArea.get_text().replace(/\r/g, '');

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

                        // Check for max length
                        const byteLength = (new TextEncoder().encode(text)).length;
                        if (byteLength > scope.maxTextLength) {
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
                            log.warn('Failed to submit text');
                        });

                        return true;
                    }
                    return false;
                }

                // Handle typing events

                let isComposing = false;
                let compositionHasJustEnded = false; // We all love Safari!

                function onCompositionStart(ev: CompositionEvent): void {
                    isComposing = true;
                }

                function onCompositionEnd(ev: CompositionEvent): void {
                    isComposing = false;
                    compositionHasJustEnded = true;
                }

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

                    // If the enter key is part of a composition (e.g. when
                    // entering text with an IME), don't submit the text.
                    // See https://github.com/threema-ch/threema-web/issues/777
                    if ((ev as any).isComposing || isComposing || compositionHasJustEnded) {
                        return;
                    }

                    // If a : is pressed, possibly insert emoji
                    if (ev.key === ':') {
                        const modified = onEmojiShortcodeKeyPressed(ev, ':', false);
                        if (modified) {
                            ev.preventDefault();
                            return;
                        }
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
                    compositionHasJustEnded = false;

                    // If the compose area contains only a single <br>, make it fully empty.
                    // See also: https://stackoverflow.com/q/14638887/284318
                    const text = composeArea.get_text(true);
                    if (text === '\n') {
                        composeDiv[0].innerText = '';
                    }

                    // Update typing information
                    if (text.trim().length === 0) {
                        stopTyping();
                        scope.onTyping('');
                    } else {
                        startTyping();
                        scope.onTyping(text.trim());
                    }

                    updateView();
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
                            .catch((e) => log.error('Could not send file:', e));
                        scope.onUploading(false);

                    }).catch((ev: ErrorEvent) => {
                        log.error('Could not load file:', ev.message);
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
                                log.warn('Pasted file has an invalid MIME type: "' + blob.type + '"');
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
                                .catch((msg) => log.error('Could not send file:', msg));
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
                    // If the emoji picker is triggered too early, it's possible that the picker element
                    // has not yet been fully loaded (e.g. during UI tests). Therefore enqueue the event
                    // handler at the end of the event loop.
                    $timeout(() => {
                        const emojiPicker = wrapper[0].querySelector('div.twemoji-picker');

                        // Show
                        emojiKeyboard.addClass('active');
                        emojiKeyboard.attr('aria-expanded', 'true');
                        emojiTrigger.attr('aria-pressed', 'true');
                        emojiTrigger.addClass(TRIGGER_ACTIVE_CSS_CLASS);

                        // Find some selectors
                        const allEmoji = angular.element(emojiPicker.querySelectorAll('.content .em'));
                        const allEmojiTabs = angular.element(emojiPicker.querySelectorAll('.tab label img'));

                        // Add event handlers
                        allEmoji.on('click', onEmojiChosen as any);
                        allEmoji.on('keydown', onEmojiChosen as any);
                        allEmojiTabs.on('keydown', onEmojiTabSelected as any);

                        // Focus compose area again
                        composeArea.focus();
                    });
                }

                // Hide emoji picker element
                function hideEmojiPicker() {
                    const emojiPicker = wrapper[0].querySelector('div.twemoji-picker');

                    // Hide
                    emojiKeyboard.removeClass('active');
                    emojiKeyboard.attr('aria-expanded', 'false');
                    emojiTrigger.attr('aria-pressed', 'false');
                    emojiTrigger.removeClass(TRIGGER_ACTIVE_CSS_CLASS);

                    // Find some selectors
                    const allEmoji = angular.element(emojiPicker.querySelectorAll('.content .em'));
                    const allEmojiTabs = angular.element(emojiPicker.querySelectorAll('.tab label img'));

                    // Remove event handlers
                    allEmoji.off('click', onEmojiChosen as any);
                    allEmoji.off('keydown', onEmojiChosen as any);
                    allEmojiTabs.off('keydown', onEmojiTabSelected as any);
                }

                // Emoji trigger is clicked
                function onEmojiTrigger(ev: KeyboardEvent): void {
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
                function onEmojiChosen(ev: MouseEvent | KeyboardEvent): void {
                    if (ev.type === 'click' || (isKeyboardEvent(ev) && isActionTrigger(ev))) {
                        ev.stopPropagation();
                        if (isKeyboardEvent(ev)) {
                            ev.preventDefault();
                        }
                        insertSingleEmojiString((ev.target as Element).textContent);
                        updateView();
                    }
                }

                // Emoji tab is selected
                function onEmojiTabSelected(ev: KeyboardEvent): void {
                    if (isActionTrigger(ev)) {
                        // Warning: Hacky
                        (ev.target as any).parentElement.previousElementSibling.checked = true;
                    }
                }

                // Insert a single emoji, passed in as string
                function insertSingleEmojiString(emojiString: string): void {
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
                    img.setAttribute('data-c', emoji.codepoint);
                    img.draggable = false;
                    img.ondragstart = () => false;
                }

                // The emoji shortcode trigger (:) was inserted. Return a boolean
                // indicating whether the compose area contents were modified.
                //
                // The `alreadyProcessed` indicates whether the key has already
                // been processed in the DOM (onKeyUp) or not (onKeyDown).
                function onEmojiShortcodeKeyPressed(ev, trigger: string, alreadyProcessed: boolean): boolean {
                    const word = composeArea.get_word_at_caret();
                    if (word === undefined) {
                        return false;
                    }
                    let before = word.before();
                    const after = word.after();
                    if (!alreadyProcessed) {
                        before += trigger;
                    }
                    if (after.length === 0 && before.length > 2) {
                        if (before.startsWith(trigger) && before.endsWith(trigger)) {
                            const trimmed = before.substr(1, before.length - 2);
                            const unicodeEmoji = shortnameToUnicode(trimmed);
                            if (unicodeEmoji !== null) {
                                composeArea.select_word_at_caret();
                                composeArea.store_selection_range();
                                insertSingleEmojiString(unicodeEmoji);
                                return true;
                            }
                        }
                    }
                    return false;
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
                    const input = wrapper[0].querySelector('.file-input') as HTMLInputElement;
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
                composeDiv.on('compositionstart', onCompositionStart as any);
                composeDiv.on('compositionend', onCompositionEnd as any);
                composeDiv.on('keydown', onKeyDown as any);
                composeDiv.on('keyup', onKeyUp as any);

                // Handle selection change
                document.addEventListener('selectionchange', () => {
                    composeArea.store_selection_range();
                });

                // Handle paste event
                composeDiv.on('paste', onPaste as any);

                // Handle click on emoji trigger
                emojiTrigger.on('click', onEmojiTrigger as any);
                emojiTrigger[0].addEventListener('keypress', (ev: KeyboardEvent) => {
                    if (isActionTrigger(ev)) {
                        $rootScope.$apply(() => {
                            onEmojiTrigger(ev);
                        });
                    }
                });

                // Handle click on file trigger
                fileTrigger.on('click', onFileTrigger as any);
                fileTrigger[0].addEventListener('keypress', (ev: any) => {
                    if (isActionTrigger(ev)) {
                        $rootScope.$apply(() => {
                            onFileTrigger(ev);
                        });
                    }
                });

                // Handle file uploads
                fileInput.on('change', onFileSelected);

                // Handle click on send trigger
                sendTrigger.on('click', onSendTrigger as any);
                sendTrigger[0].addEventListener('keypress', (ev: any) => {
                    if (isActionTrigger(ev)) {
                        $rootScope.$apply(() => {
                            onSendTrigger(ev);
                        });
                    }
                });

                updateView();

                // Listen to broadcasts
                const unsubscribeListeners = [];
                unsubscribeListeners.push($rootScope.$on('onQuoted', (event: ng.IAngularEvent, args: any) => {
                    composeArea.focus();
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
                        <i class="md-primary emoji-trigger trigger is-enabled material-icons" role="button" aria-label="emoji" aria-pressed="false" tabindex="0">tag_faces</i>
                    </div>
                    <div>
                        <div
                            class="compose"
                            id="composeDiv"
                            contenteditable
                            autofocus
                            data-gramm="false"
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
                <div class="emoji-keyboard" aria-expanded="false">
                    <ng-include src="'partials/emoji-picker.html'" include-replace></ng-include>
                </div>
            `,
        };
    },
];
