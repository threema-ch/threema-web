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
 * Copy a string into the clipboard.
 *
 * @param text The string to be copied.
 * @param useSelectionRange whether a selection range should be used. Required
 *   for Safari.
 *
 * Throws an error in case it was unsuccessful.
 */
export function copyString(text: string, useSelectionRange: boolean = false): void {
    const activeElement = document.activeElement as HTMLElement | null;

    // Create temporary (and hidden) textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    try {
        // Copy the text into the textarea element and select the text
        if (useSelectionRange) {
            // Safari: Create a selection range.
            // Inspiration: https://stackoverflow.com/a/34046084/284318
            textArea.contentEditable = 'true';
            textArea.readOnly = false;
            const range = document.createRange();
            const selection = self.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            textArea.setSelectionRange(0, 999999);
        } else {
            textArea.focus();
            textArea.select();
        }

        // Copy selection to clipboard
        if (!document.execCommand('copy')) {
            throw new Error('Unable to copy into clipboard');
        }
    } finally {
        // Remove temporary textarea element
        document.body.removeChild(textArea);

        // Restore focus to the previously active element (if any)
        if (activeElement !== null) {
            activeElement.focus();
        }
    }
}
