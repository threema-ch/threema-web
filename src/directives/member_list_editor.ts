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

import {WebClientService} from "../services/webclient";

export default [
    'WebClientService',
    function(webClientService: WebClientService) {
        return {
            restrict: 'EA',
            scope: {},
            bindToController: {
                members: '=eeeMembers',
                onChange: '=eeeOnChange',
                placeholder: '=eeePlaceholder',
            },
            controllerAs: 'ctrl',
            controller: [function() {
                const AUTOCOMPLETE_MAX_RESULTS = 20;

                // cache all feature level >= 1 contacts
                this.allContacts = Array
                    .from(webClientService.contacts.values())
                    .filter((contactReceiver: threema.ContactReceiver) => {
                        return contactReceiver.featureLevel >= 0;
                    }) as threema.ContactReceiver[];

                this.selectedItemChange = (contactReceiver: threema.ContactReceiver) => {
                    if (contactReceiver !== undefined) {
                        this.members.push(contactReceiver.id);
                        this.selectedItem = null;
                        this.onChange(this.members);
                    }
                };

                this.querySearch = (query: string): threema.ContactReceiver[] => {

                    if (query !== undefined && query.length <= 0) {
                        // do not show a result on empty entry
                        return [];
                    } else {
                        // search for contacts, do not show selected contacts
                        let lowercaseQuery = angular.lowercase(query);
                        let result = this.allContacts.filter((contactReceiver: threema.ContactReceiver) => {
                            return this.members.filter((identity: string) => {
                                    return identity === contactReceiver.id;
                                }).length === 0
                                && (
                                    // find in display name
                                    contactReceiver.displayName.toLowerCase().indexOf(lowercaseQuery) >= 0
                                    // or threema identity
                                    || contactReceiver.id.toLowerCase().indexOf(lowercaseQuery) >= 0
                                );
                        });

                        return result.length <= AUTOCOMPLETE_MAX_RESULTS ? result
                            : result.slice(0, AUTOCOMPLETE_MAX_RESULTS);
                    }
                };

                this.onRemoveMember = (contact: threema.ContactReceiver): boolean => {
                    if (contact.id === webClientService.getMyIdentity().identity) {
                        return false;
                    }

                    this.members = this.members.filter(function (i: string) {
                        return i !== contact.id;
                    });
                    return true;
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
