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

export default [
    function() {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                message: '=eeeMessage',
                multiLine: '=?eeeMultiLine',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                // Get text depending on type
                let rawText = null;
                switch (this.message.type) {
                    case 'text':
                        rawText = this.message.body;
                        break;
                    case 'location':
                        rawText = this.message.location.poi;
                        break;
                    default:
                        rawText = this.message.caption;
                        break;
                }
                // Escaping will be done in the HTML using filters
                this.text = rawText;
                if (this.multiLine === undefined) {
                    this.multiLine = true;
                }
            }],
            template: `
                <span threema-action ng-bind-html="ctrl.text | escapeHtml | writeNewLine: ctrl.multiLine | emojify | markify | linkify"></span>
            `,
        };
    },
];
