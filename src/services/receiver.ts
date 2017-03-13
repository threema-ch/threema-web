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

export class ReceiverService {
    private $log: ng.ILogService;
    private activeReceiver: threema.Receiver;
    public static $inject = ['$log'];

    constructor($log: ng.ILogService) {
        // Angular services
        this.$log = $log;
    }

    /**
     * Set the currently active receiver.
     */
    public setActive(activeReceiver: threema.Receiver): void {
        this.activeReceiver = activeReceiver;
    }

    /**
     * Return the currently active receiver.
     */
    public getActive(): threema.Receiver {
        return this.activeReceiver;
    }

    public isConversationActive(conversation: threema.Conversation): boolean {
        if (this.activeReceiver !== undefined) {
           return this.compare(conversation, this.activeReceiver);
        }
    }

    public compare(a: threema.Conversation | threema.Receiver,
                   b: threema.Conversation | threema.Receiver): boolean {
        return a !== undefined
            && b !== undefined
            && a.type === b.type
            && a.id === b.id;
    }

    public isContact(receiver: threema.Receiver): boolean {
        return receiver !== undefined
            && receiver.type === 'contact';
    }

    public isGroup(receiver: threema.Receiver): boolean {
        return receiver !== undefined
            && receiver.type === 'group';
    }

    public isDistributionList(receiver: threema.Receiver): boolean {
        return receiver !== undefined
            && receiver.type === 'distributionList';
    }

    public isBusinessContact(receiver: threema.Receiver): boolean {
        return this.isContact(receiver)
            && receiver.id.substr(0, 1) === '*';

    }
}
