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

// This file contains helper functions related to receivers.
// Try to keep all functions pure!

/**
 * Return wether a contact is a Threema Gateway contact.
 */
export function isGatewayContact(receiver: threema.ContactReceiver) {
    return receiver.id.startsWith('*');
}

/**
 * Return wether a contact is the ECHOECHO test contact.
 */
export function isEchoContact(receiver: threema.ContactReceiver) {
    return receiver.id === 'ECHOECHO';
}
