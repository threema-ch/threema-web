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
 * A general purpose dialog controller.
 */
export class DialogController {
    public readonly $mdDialog: ng.material.IDialogService;
    public readonly activeElement: HTMLElement | null;

    public static readonly $inject = ['$mdDialog'];
    constructor($mdDialog: ng.material.IDialogService, activeElement?: HTMLElement) {
        this.$mdDialog = $mdDialog;
        this.activeElement = activeElement !== undefined ? activeElement : document.activeElement as HTMLElement;
    }

    /**
     * Cancel the dialog.
     */
    public cancel(): void {
        this.$mdDialog.cancel();
        this.restoreFocus();
    }

    /**
     * Hide the dialog.
     */
    protected hide(data?: any): void {
        this.$mdDialog.hide(data);
        this.restoreFocus();
    }

    /**
     * Restore focus to the previously active element.
     */
    private restoreFocus(): void {
        if (this.activeElement !== null) {
            this.activeElement.focus();
        }
    }
}
