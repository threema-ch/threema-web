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
import {Conversations, StringHashSet} from '../../src/threema/container';

function getConversations(): Conversations {
    const receiverService = new ReceiverService();
    return new Conversations(receiverService);
}

function makeContactConversation(id: string, position?: number): threema.ConversationWithPosition {
    return {
        type: 'contact',
        id: id,
        position: position,
        messageCount: 5,
        unreadCount: 0,
        latestMessage: null,
        isStarred: false,
    };
}

function getId(c: threema.Conversation): string {
    return c.id;
}

describe('Container', () => {

    describe('Conversations', () => {
        it('find', function() {
            const conversations = getConversations();
            conversations.set([
                makeContactConversation('1'),
                makeContactConversation('2'),
                makeContactConversation('3'),
                makeContactConversation('4'),
            ]);

            const receiver1: threema.BaseReceiver = { id: '2', type: 'contact' };
            const receiver2: threema.BaseReceiver = { id: '5', type: 'contact' };
            const receiver3: threema.BaseReceiver = { id: '2', type: 'me' };

            expect(conversations.find(receiver1)).toEqual(makeContactConversation('2'));
            expect(conversations.find(receiver2)).toEqual(null);
            expect(conversations.find(receiver3)).toEqual(null);
        });

        describe('set', function() {
            it('overwrites previous data', function() {
                const conversations = getConversations();
                expect(conversations.get()).toEqual([]);

                conversations.add(makeContactConversation('0'));
                expect(conversations.get().map(getId)).toEqual(['0']);

                conversations.set([makeContactConversation('1')]);
                expect(conversations.get().map(getId)).toEqual(['1']);
            });

            it('clears position field', function() {
                const conversations = getConversations();
                conversations.set([makeContactConversation('1', 7)]);

                const expected = makeContactConversation('1');
                delete expected.position;
                expect((conversations as any).conversations).toEqual([expected]);
            });

            it('sets defaults', function() {
                const conversations = getConversations();

                const conversation = makeContactConversation('1', 7);
                delete conversation.isStarred;
                conversations.set([conversation]);

                const expected = makeContactConversation('1');
                expect((conversations as any).conversations[0].isStarred).toEqual(false);
            });
        });

        describe('add', function() {
            it('adds a new conversation at the correct location', function() {
                const conversations = getConversations();
                expect(conversations.get()).toEqual([]);

                conversations.add(makeContactConversation('0', 0));
                conversations.add(makeContactConversation('1', 1));
                expect(conversations.get().map(getId)).toEqual(['0', '1']);

                conversations.add(makeContactConversation('2', 1));
                expect(conversations.get().map(getId)).toEqual(['0', '2', '1']);
            });
        });

        describe('updateOrAdd', function() {
            it('adds a new conversation at the correct location', function() {
                const conversations = getConversations();
                conversations.set([
                    makeContactConversation('0'),
                    makeContactConversation('1'),
                ]);
                expect(conversations.get().map(getId)).toEqual(['0', '1']);

                conversations.updateOrAdd(makeContactConversation('2', 2));
                expect(conversations.get().map(getId)).toEqual(['0', '1', '2']);

                conversations.updateOrAdd(makeContactConversation('3', 2));
                expect(conversations.get().map(getId)).toEqual(['0', '1', '3', '2']);
            });

            it('moves an existing conversation to the correct location', function() {
                const conversations = getConversations();
                conversations.set([
                    makeContactConversation('0'),
                    makeContactConversation('1'),
                    makeContactConversation('2'),
                ]);
                expect(conversations.get().map(getId)).toEqual(['0', '1', '2']);

                conversations.updateOrAdd(makeContactConversation('2', 1));
                expect(conversations.get().map(getId)).toEqual(['0', '2', '1']);

                conversations.updateOrAdd(makeContactConversation('1', 0));
                expect(conversations.get().map(getId)).toEqual(['1', '0', '2']);

                conversations.updateOrAdd(makeContactConversation('0', 2));
                expect(conversations.get().map(getId)).toEqual(['1', '2', '0']);

                conversations.updateOrAdd(makeContactConversation('1', 7));
                expect(conversations.get().map(getId)).toEqual(['2', '0', '1']);
            });
        });
    });

    describe('StringHashSet', () => {
        it('clearAll', function() {
            const shs = new StringHashSet();
            shs.add('hello');
            shs.add('hello');
            shs.add('bye');
            expect(shs.values()).toEqual(['hello', 'bye']);
            shs.clearAll();
            expect(shs.values()).toEqual([]);
        });
    });

});
