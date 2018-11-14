/**
 * Copyright © 2016-2018 Threema GmbH (https://threema.ch/).
 *
 * This file is part of Threema Web.
 */
// tslint:disable:no-unused-expression

import { Selector, ClientFunction } from 'testcafe';

// NOTE: These tests use test cafe.
// See http://devexpress.github.io/testcafe/documentation/getting-started/ for
// documentation on how to write UI tests.

fixture `Compose Area`
    .page `http://localhost:7777/tests/ui/compose_area.html`;

test('Show and hide emoji selector', async (t) => {
    const keyboard = await Selector('.emoji-keyboard');

    // Not visible initially
    await t.expect(keyboard.visible).eql(false);

    // Show
    await t.click('.emoji-trigger');

    // Visible
    await t.expect(keyboard.visible).eql(true);

    // Hide
    await t.click('.emoji-trigger');

    // Visible
    await t.expect(keyboard.visible).eql(false);
});

test('Insert emoji', async (t) => {
    // Show emoji keyboard
    await t.click('.emoji-trigger');

    // Insert woman zombie emoji
    await t.click('.e1._1f9df-2640');

    // Insert beer
    await t.click('.e1-food').click('.e1._1f37b');

    // Ensure both have been inserted
    const getChildNodeCount = await ClientFunction(() => {
        return document.querySelector('div.compose').childNodes.length;
    });
    await t.expect(await getChildNodeCount()).eql(2);

    const firstEmoji = await Selector('div.compose img').nth(0)();
    await t.expect(firstEmoji.tagName).eql('img');
    await t.expect(firstEmoji.attributes.title).eql(':woman_zombie:');
    await t.expect(firstEmoji.classNames).eql(['e1']);

    const secondEmoji = await Selector('div.compose img').nth(1)();
    await t.expect(secondEmoji.tagName).eql('img');
    await t.expect(secondEmoji.attributes.title).eql(':beers:');
    await t.expect(secondEmoji.classNames).eql(['e1']);
});
