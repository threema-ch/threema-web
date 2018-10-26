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

export default [
    '$log', '$translate',
    function($log: ng.ILogService, $translate: ng.translate.ITranslateService) {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                contact: '=',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                this.$onInit = function() {
                    const contact: threema.ContactReceiver = this.contact;

                    let label;
                    switch (contact.verificationLevel) {
                        case 1:
                            this.cls = 'level1';
                            label = 'VERIFICATION_LEVEL1_EXPLAIN';
                            break;
                        case 2:
                            this.cls = 'level2';
                            if (contact.isWork) {
                                label = 'VERIFICATION_LEVEL2_WORK_EXPLAIN';
                            } else {
                                label = 'VERIFICATION_LEVEL2_EXPLAIN';
                            }
                            break;
                        case 3:
                            this.cls = 'level3';
                            label = 'VERIFICATION_LEVEL3_EXPLAIN';
                            break;
                        default:
                            /* ignore, handled on next line */
                    }

                    if (label === undefined) {
                        $log.error('invalid verification level', this.level);
                        return;
                    }

                    if (contact.isWork) {
                        // append work class
                        this.cls += ' work';
                    }

                    this.description = $translate.instant('messenger.' + label);
                };
            }],
            template: `
                <span class="verification-dots {{ctrl.cls}}" title="{{ctrl.description}}">
                    <div></div><div></div><div></div>
                </span>
            `,
        };
    },
];
