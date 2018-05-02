/**
 * Copyright © 2016-2018 Threema GmbH (https://threema.ch/).
 *
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

// tslint:disable:no-reference
/// <reference path="../../src/threema.d.ts" />

import {ReceiverService} from '../../src/services/receiver';
import {Conversations} from '../../src/threema/container';

function getConversations(): Conversations {
    const receiverService = new ReceiverService();
    return new Conversations(receiverService);
}

function makeContactConversation(id: string, position: number): threema.ConversationWithPosition {
    return {
        type: 'contact',
        id: id,
        position: position,
        messageCount: 5,
        unreadCount: 0,
        latestMessage: null,
    };
}

function simplifyConversation(c: threema.Conversation): Array<string | number> {
    return [c.id, c.position];
}

describe('Container', () => {

    describe('Conversations', () => {
        it('find', function() {
            const conversations = getConversations();
            conversations.set([
                makeContactConversation('1', 0),
                makeContactConversation('2', 1),
                makeContactConversation('3', 2),
                makeContactConversation('4', 3),
            ]);

            const receiver1: threema.BaseReceiver = { id: '2', type: 'contact' };
            const receiver2: threema.BaseReceiver = { id: '5', type: 'contact' };
            const receiver3: threema.BaseReceiver = { id: '2', type: 'me' };

            expect(conversations.find(receiver1)).toEqual(makeContactConversation('2', 1));
            expect(conversations.find(receiver2)).toEqual(null);
            expect(conversations.find(receiver3)).toEqual(null);
        });

        describe('set', function() {
            it('overwrites previous data', function() {
                const conversations = getConversations();
                expect(conversations.get()).toEqual([]);

                conversations.add(makeContactConversation('0', 0));
                expect(conversations.get().map(simplifyConversation)).toEqual([['0', 0]]);

                conversations.set([makeContactConversation('1', 1)]);
                expect(conversations.get().map(simplifyConversation)).toEqual([['1', 1]]);
            });
        });

        describe('add', function() {
            it('adds a conversation at the correct location', function() {
                const conversations = getConversations();
                expect(conversations.get()).toEqual([]);

                conversations.add(makeContactConversation('0', 0));
                conversations.add(makeContactConversation('1', 1));
                expect(conversations.get().map(simplifyConversation)).toEqual([
                    ['0', 0],
                    ['1', 1],
                ]);

                conversations.add(makeContactConversation('2', 1));
                expect(conversations.get().map(simplifyConversation)).toEqual([
                    ['0', 0],
                    ['2', 1],
                    ['1', 1],
                ]);
            });
        });
    });

});
