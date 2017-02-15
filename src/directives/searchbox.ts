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
 * Add this as an attribute to the search box div.
 *
 * The "searchbox-focus" attribute must point to a boolean indicating whether
 * the search is active or not.
 */
export default [
    function() {
        return {
            restrict: 'A',
            scope: {
                visible: '=searchboxFocus',
            },
            link($scope, $element, attrs) {
                // Whenever the search visibility changes...
                $scope.$watch('visible', (currentValue, previousValue) => {
                    const input = $element.find('input');
                    if (currentValue === true && previousValue === false) {
                        // Show
                        $element.addClass('visible');
                        // Focus on input box
                        input[0].focus();
                    } else if (currentValue === false && previousValue === true) {
                        // Hide
                        $element.removeClass('visible');
                        // Clear search text
                        input.val('').triggerHandler('change');
                    }
                });
            },
        };
    },
];
