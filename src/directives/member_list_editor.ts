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

import {hasFeature} from '../helpers';
import {LogService} from '../services/log';
import {WebClientService} from '../services/webclient';

const AUTOCOMPLETE_MAX_RESULTS = 20;

export default [
    'LogService', 'WebClientService',
    function(logService: LogService, webClientService: WebClientService) {
        const log = logService.getLogger('MemberListEditor-C');
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                members: '=activeMembers',
                onChange: '=onChange',
                placeholder: '=placeholder',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                this.selectedItemChange = (contactReceiver: threema.ContactReceiver) => {
                    if (contactReceiver !== undefined) {
                        this.members.push(contactReceiver.id);
                        this.selectedItem = null;
                        this.onChange(this.members);
                    }
                };

                this.querySearch = (query: string): threema.ContactReceiver[] => {
                    if (query !== undefined && query.length <= 0) {
                        // Do not show a result on empty entry
                        return [];
                    } else {
                        // Search for contacts, do not show selected contacts
                        const lowercaseQuery = query.toLowerCase();
                        const hideInactiveContacts = !webClientService.appConfig.showInactiveIDs;
                        const result = this.allContacts
                            .filter((contactReceiver: threema.ContactReceiver) => {
                                // Ignore already selected contacts
                                if (this.members.filter((id: string) => id === contactReceiver.id).length !== 0) {
                                    return false;
                                }

                                // Ignore own contact
                                if (contactReceiver.id === webClientService.me.id) {
                                    return false;
                                }

                                // Potentially ignore inactive contacts
                                if (hideInactiveContacts && contactReceiver.state === 'INACTIVE') {
                                    return false;
                                }

                                // Search in display name
                                if (contactReceiver.displayName.toLowerCase().indexOf(lowercaseQuery) >= 0) {
                                    return true;
                                }

                                // Search in identity
                                if (contactReceiver.id.toLowerCase().indexOf(lowercaseQuery) >= 0) {
                                    return true;
                                }

                                // Not found
                                return false;
                            });

                        return result.length <= AUTOCOMPLETE_MAX_RESULTS ? result
                            : result.slice(0, AUTOCOMPLETE_MAX_RESULTS);
                    }
                };

                this.onRemoveMember = (contact: threema.ContactReceiver): boolean => {
                    if (contact.id === webClientService.me.id) {
                        return false;
                    }
                    this.members = this.members.filter(
                        (identity: string) => identity !== contact.id,
                    );
                    return true;
                };

                this.$onInit = function() {
                    // Cache all contacts
                    this.allContacts = Array.from(webClientService.contacts.values());
                };

            }],
            template: `
                <ul class="member-list">
                    <li>
                        <md-autocomplete
                                md-no-cache="false"
                                md-delay="200"
                                md-selected-item="ctrl.selectedItem"
                                md-search-text="ctrl.searchText"
                                md-selected-item-change="ctrl.selectedItemChange(contactReceiver)"
                                md-items="contactReceiver in ctrl.querySearch(ctrl.searchText)"
                                md-item-text="contactReceiver.displayName"
                                md-min-length="0"
                                placeholder="{{ctrl.placeholder}}"
                                md-menu-class="autocomplete-custom-template">
                            <md-item-template>
                                <eee-contact-badge
                                        eee-contact="contactReceiver"
                                        eee-disable-click="true"/>
                            </md-item-template>
                        </md-autocomplete>
                    </li>
                    <li ng-repeat="identity in ctrl.members">
                        <eee-contact-badge
                                eee-identity="identity"
                                eee-disable-click="true"
                                eee-on-remove="ctrl.onRemoveMember"/>
                    </li>
                </ul>
            `,
        };
    },
];
