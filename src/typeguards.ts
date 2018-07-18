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

// User defined type guards are small functions that determine the type of an object.
// See https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards
// for more information.

/**
 * Contact receiver type guard
 */
export function isContactReceiver(
    receiver: threema.BaseReceiver,
): receiver is threema.ContactReceiver {
    return receiver.type === 'contact';
}

/**
 * Group receiver type guard
 */
export function isGroupReceiver(
    receiver: threema.BaseReceiver,
): receiver is threema.GroupReceiver {
    return receiver.type === 'group';
}

/**
 * Distribution list receiver type guard
 */
export function isDistributionListReceiver(
    receiver: threema.BaseReceiver,
): receiver is threema.DistributionListReceiver {
    return receiver.type === 'distributionList';
}

/**
 * Valid receiver types type guard
 */
export function isValidReceiverType(
    receiverType: string,
): receiverType is threema.ReceiverType {
    switch (receiverType) {
        case 'me':
        case 'contact':
        case 'group':
        case 'distributionList':
            return true;
    }
    return false;
}

/**
 * Valid disconnect reasons type guard
 */
export function isValidDisconnectReason(
    reason: string,
): reason is threema.DisconnectReason {
    switch (reason) {
        case 'stop':
        case 'delete':
        case 'disable':
        case 'replace':
            return true;
    }
    return false;
}
