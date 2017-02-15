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
    '$timeout',
    '$state',
    function($timeout, $state: ng.ui.IStateService) {
        return {
            restrict: 'A',
            scope: {},
            link(scope, el, attrs) {
                $timeout(() => {
                    for (let node of el[0].childNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE
                            && (node as Element).tagName.toLowerCase() === 'a') {

                            let link = (node as Element).innerHTML;

                            if (link !== undefined) {
                                let addRegex = /\bthreema:\/\/add\?id=([\w\*]{8})\b/gi;

                                if (link.match(addRegex)) {
                                    let threemaId = link.replace(addRegex, '$1');
                                    (node as Element).addEventListener('click', function(e) {
                                        $state.go('messenger.home.create', {
                                            type: 'contact',
                                            initParams: {
                                                identity: threemaId,
                                            },
                                        });
                                    });
                                }
                            }
                        }
                    }
                }, 0);
            },
        };
    },
];
