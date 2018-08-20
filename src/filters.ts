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

import {bufferToUrl, escapeRegExp, filter, logAdapter} from './helpers';
import {MimeService} from './services/mime';
import {NotificationService} from './services/notification';
import {WebClientService} from './services/webclient';

function timeIt(name: string, func) {
    let counter = 0;
    let time = 0;
    return (...args) => {
        const t0 = performance.now();
        const ret = func(...args);
        const t1 = performance.now();
        counter += 1;
        time += (t1 - t0);
        const node = document.querySelector('#filters .' + name);
        if (node !== null) {
            node.innerHTML = counter + 'x (' + time + 'ms)';
        } else {
            // tslint:disable-next-line:no-console
            console.warn('timeIt: Node for ' + name + ' is null');
        }
        return ret;
    };
}

angular.module('3ema.filters', [])

/**
 * Escape HTML by replacing special characters with HTML entities.
 */
.filter('escapeHtml', function() {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return timeIt('escapeHtml', (text: string) => {
        if (text === undefined || text === null) {
            text = '';
        }
        return text.replace(/[&<>"']/g, (m) => map[m]);
    });
})

/**
 * Replace newline characters with a <br> tag.
 */
.filter('nlToBr', function() {
    return timeIt('nlToBr', (text, enabled: boolean) => {
        if (enabled || enabled === undefined) {
            text = text.replace(/\n/g, '<br>');
        }
        return text;
    });
})

/**
 * Replace a undefined/null or empty string with a placeholder
 */
.filter('emptyToPlaceholder', function() {
    return timeIt('emptyToPlaceholder', (text, placeholder: string = '-') => {
        if (text === null || text === undefined || text.trim().length === 0) {
            return placeholder;
        }
        return text;
    });
})

/**
 * Convert links in text to <a> tags.
 */
.filter('linkify', function() {
    const autolinker = new Autolinker({
        // Open links in new window
        newWindow: true,
        // Don't strip protocol prefix
        stripPrefix: false,
        // Don't truncate links
        truncate: 99999,
        // Add class name to linked links
        className: 'autolinked',
        // Link urls
        urls: true,
        // Link e-mails
        email: true,
        // Don't link phone numbers (doesn't work reliably)
        phone: false,
        // Don't link mentions
        mention: false,
        // Don't link hashtags
        hashtag: false,
    });
    return timeIt('linkify', (text) => autolinker.link(text));
})

/**
 * Convert emoji unicode characters to images.
 * Reference: http://git.emojione.com/demos/latest/index.html#js
 *
 * Set the `imgTag` parameter to `true` to use inline PNGs instead of sprites.
 */
.filter('emojify', function() {
    return timeIt('emojify', function(text, imgTag = false, greedyMatch = false) {
        if (text !== null) {
            emojione.sprites = imgTag !== true;
            emojione.emojiSize = '32';
            emojione.imagePathPNG = 'img/e1/';
            emojione.greedyMatch = greedyMatch;
            return emojione.unicodeToImage(text);
        } else {
            return text;
        }
    });
})

/**
 * Enlarge 1-3 emoji.
 */
.filter('enlargeSingleEmoji', function() {
    const pattern = /<span class="e1 ([^>]*>[^<]*)<\/span>/g;
    const singleEmojiThreshold = 3;
    const singleEmojiClassName = 'large-emoji';
    return timeIt('enlargeSingleEmoji', function(text, enlarge = false) {
        if (!enlarge) {
            return text;
        }
        const matches = text.match(pattern);
        if (matches != null && matches.length >= 1 && matches.length <= singleEmojiThreshold) {
            if (text.replace(pattern, '').length === 0) {
                text = text.replace(pattern, '<span class="e1 ' + singleEmojiClassName + ' $1</span>');
            }
        }
        return text;
    });
})

/**
 * Convert markdown elements to html elements
 */
.filter('markify', function() {
    return timeIt('markify', function(text) {
        if (text !== null) {
            text = text.replace(/\B\*([^\r\n]+?)\*\B/g, '<span class="text-bold">$1</span>');
            text = text.replace(/\b_([^\r\n]+?)_\b/g, '<span class="text-italic">$1</span>');
            text = text.replace(/\B~([^\r\n]+?)~\B/g, '<span class="text-strike">$1</span>');
            return text;
        }
        return text;
    });
})

/**
 * Convert mention elements to html elements
 */
.filter('mentionify', [
    'WebClientService',
    '$translate',
    'escapeHtmlFilter',
    function(webClientService: WebClientService, $translate: ng.translate.ITranslateService, escapeHtmlFilter) {
        return timeIt('mentionify', (text) => {
            if (text !== null && text.length > 10) {
                let result = text.match(/@\[([\*\@a-zA-Z0-9][\@a-zA-Z0-9]{7})\]/g);
                if (result !== null) {
                    result = ([...new Set(result)]);
                    // Unique
                    for (const possibleMention of result) {
                        const identity = possibleMention.substr(2, 8);
                        let mentionName;
                        let cssClass;
                        if (identity === '@@@@@@@@') {
                            mentionName = $translate.instant('messenger.ALL');
                            cssClass = 'all';
                        } else if (identity === webClientService.me.id) {
                            mentionName = webClientService.me.displayName;
                            cssClass = 'me';
                        } else {
                            const contact = webClientService.contacts.get(possibleMention.substr(2, 8));
                            if (contact !== null && contact !== undefined) {
                                // Add identity to class for a simpler parsing
                                cssClass = 'id ' + identity;
                                mentionName = contact.displayName;
                            }
                        }

                        if (mentionName !== undefined) {
                            text = text.replace(
                                new RegExp(escapeRegExp(possibleMention), 'g'),
                                '<span class="mention ' + cssClass + '"'
                                    + ' text="@[' + identity + ']">' + escapeHtmlFilter(mentionName) + '</span>',
                            );
                        }
                    }
                }
            }
            return text;
        });
    },
])

/**
 * Reverse an array.
 */
.filter('reverse', function() {
    return timeIt('reverse', (list) => list.slice().reverse());
})

/**
 * Return whether receiver has corresponding data.
 */
.filter('hasData', function() {
    return timeIt('hasData', function(obj, receivers) {
        const valid = (receiver) => receivers.get(receiver.type).has(receiver.id);
        return filter(obj, valid);
    });
})

/**
 * Return whether item has a corresponding contact.
 */
.filter('hasContact', function() {
    return timeIt('hasContact', function(obj, contacts) {
        const valid = (item) => contacts.has(item.id);
        return filter(obj, valid);
    });
})

/**
 * Return whether contact is not me.
 */
.filter('isNotMe', ['WebClientService', function(webClientService: WebClientService) {
    return timeIt('isNotMe', function(obj: threema.Receiver) {
        const valid = (contact: threema.Receiver) => contact.id !== webClientService.receivers.me.id;
        return filter(obj, valid);
    });
}])

/**
 * Filter for duration formatting.
 */
.filter('duration', function() {
    return timeIt('duration', function(seconds) {
        const left = Math.floor(seconds / 60);
        const right = seconds % 60;
        const padLeft = left < 10 ? '0' : '';
        const padRight = right < 10 ? '0' : '';
        return padLeft + left + ':' + padRight + right;
    });
})

/**
 * Convert an ArrayBuffer to a data URL.
 *
 * Warning: Make sure that this is not called repeatedly on big data, or performance will decrease.
 */
.filter('bufferToUrl', ['$sce', '$log', function($sce, $log) {
    const logTag = '[filters.bufferToUrl]';
    return timeIt('bufferToUrl', function(buffer: ArrayBuffer, mimeType: string, trust: boolean = true) {
        if (!buffer) {
            $log.error(logTag, 'Could not apply bufferToUrl filter: buffer is', buffer);
            return '';
        }
        const uri = bufferToUrl(buffer, mimeType, logAdapter($log.warn, logTag));
        if (trust) {
            return $sce.trustAsResourceUrl(uri);
        } else {
            return uri;
        }
    });
}])

.filter('mapLink', function() {
    return timeIt('mapLink', function(location: threema.LocationInfo) {
        return 'https://www.openstreetmap.org/?mlat='
            + location.lat + '&mlon='
            + location.lon;
    });
})

/**
 * Convert message state to material icon class.
 */
.filter('messageStateIcon', function() {
    return timeIt('messageStateIcon', (message: threema.Message) => {
        if (!message) {
            return '';
        }

        if (!message.isOutbox) {
            switch (message.state) {
                case 'user-ack':
                    return 'thumb_up';
                case 'user-dec':
                    return 'thumb_down';
                default:
                    return 'reply';
            }
        }
        switch (message.state) {
            case 'pending':
            case 'sending':
                return 'file_upload';
            case 'sent':
                return 'email';
            case 'delivered':
                return 'move_to_inbox';
            case 'read':
                return 'visibility';
            case 'send-failed':
                return 'report_problem';
            case 'user-ack':
                return 'thumb_up';
            case 'user-dec':
                return 'thumb_down';
            case 'timeout':
                return 'sync_problem';
            default:
                return '';
        }
    });
})

/**
 * Convert message state to title text.
 */
.filter('messageStateTitleText', ['$translate', function($translate: ng.translate.ITranslateService) {
    return timeIt('messageStateTitleText', (message: threema.Message) => {
        if (!message) {
            return null;
        }

        if (!message.isOutbox) {
            switch (message.state) {
                case 'user-ack':
                    return 'messageStates.WE_ACK';
                case 'user-dec':
                    return 'messageStates.WE_DEC';
                default:
                    return 'messageStates.UNKNOWN';
            }
        }
        switch (message.state) {
            case 'pending':
                return 'messageStates.PENDING';
            case 'sending':
                return 'messageStates.SENDING';
            case 'sent':
                return 'messageStates.SENT';
            case 'delivered':
                return 'messageStates.DELIVERED';
            case 'read':
                return 'messageStates.READ';
            case 'send-failed':
                return 'messageStates.FAILED';
            case 'user-ack':
                return 'messageStates.USER_ACK';
            case 'user-dec':
                return 'messageStates.USER_DEC';
            case 'timeout':
                return 'messageStates.TIMEOUT';
            default:
                return 'messageStates.UNKNOWN';
        }
    });
}])

.filter('fileSize', function() {
    return timeIt('fileSize', (size: number) => {
        if (!size) {
            return '';
        }
        const i = Math.floor( Math.log(size) / Math.log(1024) );
        const x = (size / Math.pow(1024, i)).toFixed(2);
        return (x + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i]);
    });
})

/**
 * Return the MIME type label.
 */
.filter('mimeTypeLabel', ['MimeService', function(mimeService: MimeService) {
    return timeIt('mimeTypeLabel', (mimeType: string) => mimeService.getLabel(mimeType));
}])

/**
 * Return the MIME type icon URL.
 */
.filter('mimeTypeIcon', ['MimeService', function(mimeService: MimeService) {
    return timeIt('mimeTypeIcon', (mimeType: string) => mimeService.getIconUrl(mimeType));
}])

/**
 * Convert ID-Array to (Display-)Name-String, separated by ','
 */
.filter('idsToNames', ['WebClientService', function(webClientService: WebClientService) {
    return timeIt('idsToNames', (ids: string[]) => {
        const names: string[] = [];
        for (const id of ids) {
            this.contactReceiver = webClientService.contacts.get(id);
            names.push(this.contactReceiver.displayName);
        }
        return names.join(', ');
    });
}])

/**
 * Format a unix timestamp as a date.
 */
.filter('unixToTimestring', ['$translate', function($translate) {
    function formatTime(date) {
        return ('00' + date.getHours()).slice(-2) + ':' +
               ('00' + date.getMinutes()).slice(-2);
    }

    function formatMonth(num) {
        switch (num) {
            case 0x0:
                return 'date.month_short.JAN';
            case 0x1:
                return 'date.month_short.FEB';
            case 0x2:
                return 'date.month_short.MAR';
            case 0x3:
                return 'date.month_short.APR';
            case 0x4:
                return 'date.month_short.MAY';
            case 0x5:
                return 'date.month_short.JUN';
            case 0x6:
                return 'date.month_short.JUL';
            case 0x7:
                return 'date.month_short.AUG';
            case 0x8:
                return 'date.month_short.SEP';
            case 0x9:
                return 'date.month_short.OCT';
            case 0xa:
                return 'date.month_short.NOV';
            case 0xb:
                return 'date.month_short.DEC';
        }
    }

    function isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear()
            && date1.getMonth() === date2.getMonth()
            && date1.getDate() === date2.getDate();
    }

    return timeIt('unixToTimestring', (timestamp: number, forceFull: boolean = false) => {
        const date = new Date(timestamp * 1000);

        const now = new Date();
        if (!forceFull && isSameDay(date, now)) {
            return formatTime(date);
        }

        const yesterday = new Date(now.getTime() - 1000 * 60 * 60 * 24);
        if (!forceFull && isSameDay(date, yesterday)) {
            return $translate.instant('date.YESTERDAY') + ', ' + formatTime(date);
        }

        let year = '';
        if (forceFull || date.getFullYear() !== now.getFullYear()) {
            year = ' ' + date.getFullYear();
        }
        return date.getDate() + '. '
             + $translate.instant(formatMonth(date.getMonth()))
             + year + ', '
             + formatTime(date);
    });
}])

/**
 * Return a simplified DND mode.
 *
 * This will return either 'on', 'off' or 'mention'.
 * The 'until' mode will be processed depending on the expiration timestamp.
 */
.filter('dndModeSimplified', ['NotificationService', function(notificationService: NotificationService) {
    return timeIt('dndModeSimplified', (conversation: threema.Conversation) => {
        const simplified = notificationService.getAppNotificationSettings(conversation);
        if (simplified.dnd.enabled) {
            return simplified.dnd.mentionOnly ? 'mention' : 'on';
        }
        return 'off';
    });
}])

/**
 * Mark data as trusted.
 */
.filter('unsafeResUrl', ['$sce', function($sce: ng.ISCEService) {
    return $sce.trustAsResourceUrl;
}])

;
