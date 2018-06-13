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

import {isContactReceiver} from '../typeguards';

export class ReceiverService {
    private activeReceiver: threema.Receiver;

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
        if (!this.activeReceiver) {
            return false;
        }
        return this.compare(conversation, this.activeReceiver);
    }

    /**
     * Compare two conversations and/or receivers.
     * Return `true` if they both have the same type and id.
     */
    public compare(a: threema.Conversation | threema.Receiver,
                   b: threema.Conversation | threema.Receiver): boolean {
        return a !== undefined
            && b !== undefined
            && a.type === b.type
            && a.id === b.id;
    }

    public isBusinessContact(receiver: threema.Receiver): boolean {
        return isContactReceiver(receiver)
            && receiver.id.substr(0, 1) === '*';

    }
}
