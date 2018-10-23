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

import {saveAs} from 'file-saver';

import {bufferToUrl, logAdapter} from '../helpers';
import {MediaboxService} from '../services/mediabox';

export default [
    '$rootScope',
    '$document',
    '$log',
    'MediaboxService',
    function($rootScope: ng.IRootScopeService,
             $document: ng.IDocumentService,
             $log: ng.ILogService,
             mediaboxService: MediaboxService) {
        return {
            restrict: 'E',
            scope: {},
            bindToController: {},
            controllerAs: 'ctrl',
            controller: [function() {
                this.logTag = '[MediaboxDirective]';

                // Data attributes
                this.imageDataUrl = null;
                this.caption = '';

                // Close and save
                this.close = ($event?: Event) => {
                    if ($event !== undefined) {
                        // If this was triggered by a click event, only close the box
                        // if the click was directly on the target element.
                        if ($event.target === $event.currentTarget) {
                            this.imageDataUrl = null;
                        }
                    } else {
                        this.imageDataUrl = null;
                    }
                };
                this.save = () => {
                    saveAs(new Blob([mediaboxService.data]), mediaboxService.filename || 'image.jpg');
                };

                // Listen to Mediabox service events
                mediaboxService.evtMediaChanged.attach((dataAvailable: boolean) => {
                    $rootScope.$apply(() => {
                        if (dataAvailable) {
                            this.imageDataUrl = bufferToUrl(
                                mediaboxService.data,
                                mediaboxService.mimetype,
                                logAdapter($log.debug, this.logTag),
                            );
                            this.caption = mediaboxService.caption || mediaboxService.filename;
                        } else {
                            this.close();
                        }
                    });
                });
            }],
            link($scope: any, $element: ng.IAugmentedJQuery, attrs) {
                // Register event handler for ESC key
                $document.on('keyup', (e: Event) => {
                    const ke = e as KeyboardEvent;
                    if (ke.key === 'Escape' && $scope.ctrl.imageDataUrl !== null) {
                        $scope.$apply($scope.ctrl.close);
                    }
                });
            },
            // tslint:disable:max-line-length
            template: `
                <div class="box" ng-if="ctrl.imageDataUrl !== null">
                    <md-icon class="save material-icons md-24" ng-click="ctrl.save()" aria-label="Save" translate-attr="{'aria-label': 'common.SAVE', 'title': 'common.SAVE'}">save</md-icon>
                    <md-icon class="close material-icons md-24" ng-click="ctrl.close()" aria-label="Close" translate-attr="{'aria-label': 'common.CLOSE', 'title': 'common.CLOSE'}">close</md-icon>
                    <div class="inner" ng-click="ctrl.close($event)">
                        <img ng-src="{{ ctrl.imageDataUrl }}">
                        <div class="caption" title="{{ ctrl.caption | escapeHtml}}">
                            <span ng-bind-html="ctrl.caption | escapeHtml | markify | emojify"></span>
                        </div>
                    </div>
                </div>
            `,
        };
    },
];
