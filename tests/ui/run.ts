/**
 * Copyright © 2016-2018 Threema GmbH (https://threema.ch/).
 *
 * This file is part of Threema Web.
 */

// tslint:disable:no-reference
// tslint:disable:no-console
// tslint:disable:no-unused-expression

/// <reference path="../../src/threema.d.ts" />

import { expect } from 'chai';
import { Builder, By, Key, until, WebDriver, WebElement } from 'selenium-webdriver';
import * as TermColor from 'term-color';

import { extractText as extractTextFunc } from '../../src/helpers';

// Script arguments
const browser = process.argv[2];
const filterQuery = process.argv[3];

// Type aliases
type Testfunc = (driver: WebDriver) => void;

// Shared selectors
const composeArea = By.css('div.compose');
const emojiKeyboard = By.css('.emoji-keyboard');
const emojiTrigger = By.css('.emoji-trigger');

/**
 * Helper function to extract text.
 */
async function extractText(driver: WebDriver): Promise<string> {
    const script = `
        ${extractTextFunc.toString()}
        const element = document.querySelector("div.compose");
        return extractText(element);
    `;
    return driver.executeScript<string>(script);
}

/**
 * The emoji trigger should toggle the emoji keyboard.
 */
async function showEmojiSelector(driver: WebDriver) {
    // Initially not visible
    expect(
        await driver.findElement(emojiKeyboard).isDisplayed()
    ).to.be.false;

    // Show
    await driver.findElement(emojiTrigger).click();

    expect(
        await driver.findElement(emojiKeyboard).isDisplayed()
    ).to.be.true;

    // Hide
    await driver.findElement(emojiTrigger).click();

    expect(
        await driver.findElement(emojiKeyboard).isDisplayed()
    ).to.be.false;
}

/**
 * Insert two emoji and some text.
 */
async function insertEmoji(driver: WebDriver) {
    // Show emoji keyboard
    await driver.findElement(emojiTrigger).click();

    // Insert woman zombie emoji
    await driver.findElement(By.css('.e1._1f9df-2640')).click();

    // Insert text
    await driver.findElement(composeArea).sendKeys('hi');

    // Insert beer
    await driver.findElement(By.className('e1-food')).click();
    await driver.findElement(By.css('.e1._1f37b')).click();

    // Validate emoji
    const emoji = await driver.findElement(composeArea).findElements(By.xpath('*'));
    expect(emoji.length).to.equal(2);
    expect(await emoji[0].getAttribute('title')).to.equal(':woman_zombie:');
    expect(await emoji[1].getAttribute('title')).to.equal(':beers:');

    // Validate text
    const html = await driver.findElement(composeArea).getAttribute('innerHTML');
    expect(/>hi<img/.test(html)).to.be.true;
}

/**
 * Insert a newline using shift-enter.
 */
async function insertNewline(driver: WebDriver) {
    // Insert text
    await driver.findElement(composeArea).click();
    await driver.findElement(composeArea).sendKeys('hello');
    await driver.findElement(composeArea).sendKeys(Key.SHIFT, Key.ENTER);
    await driver.findElement(composeArea).sendKeys('threema');
    await driver.findElement(composeArea).sendKeys(Key.SHIFT, Key.ENTER);
    await driver.findElement(composeArea).sendKeys('web');

    const text = await extractText(driver);
    expect(text).to.equal('hello\nthreema\nweb');
}

/**
 * Insert an emoji after some newlines.
 * Regression test for #574.
 */
async function regression574(driver: WebDriver) {
    // Insert text
    await driver.findElement(composeArea).click();
    await driver.findElement(composeArea).sendKeys('hello');
    await driver.findElement(composeArea).sendKeys(Key.SHIFT, Key.ENTER);
    await driver.findElement(composeArea).sendKeys('threema');
    await driver.findElement(composeArea).sendKeys(Key.SHIFT, Key.ENTER);
    await driver.findElement(composeArea).sendKeys('web');
    await driver.findElement(composeArea).sendKeys(Key.SHIFT, Key.ENTER);

    // Insert emoji
    await driver.findElement(emojiTrigger).click();
    await driver.findElement(By.css('.e1[title=":smile:"]')).click();

    const text = await extractText(driver);
    expect(text).to.equal('hello\nthreema\nweb\n😄');
}

/**
 * Insert two emoji in the middle of existing text.
 * Regression test for #671.
 */
async function regression671(driver: WebDriver) {
    // Insert text
    await driver.findElement(composeArea).click();
    await driver.findElement(composeArea).sendKeys('helloworld');
    await driver.findElement(composeArea).sendKeys(Key.LEFT, Key.LEFT, Key.LEFT, Key.LEFT, Key.LEFT);

    // Insert emoji
    await driver.findElement(emojiTrigger).click();
    const emoji = await driver.findElement(By.css('.e1[title=":smile:"]'));
    await emoji.click();
    await emoji.click();

    const text = await extractText(driver);
    expect(text).to.equal('hello😄😄world');
}

/**
 * Insert two emoji between two lines of text.
 * Regression test for #672.
 */
async function regression672(driver: WebDriver) {
    // Insert text
    await driver.findElement(composeArea).click();
    await driver.findElement(composeArea).sendKeys('hello');
    await driver.findElement(composeArea).sendKeys(Key.SHIFT, Key.ENTER);
    await driver.findElement(composeArea).sendKeys(Key.SHIFT, Key.ENTER);
    await driver.findElement(composeArea).sendKeys('world');
    await driver.findElement(composeArea).sendKeys(Key.UP);

    // Insert two emoji
    await driver.findElement(emojiTrigger).click();
    const emoji = await driver.findElement(By.css('.e1[title=":tired_face:"]'));
    await emoji.click();
    await emoji.click();

    const text = await extractText(driver);
    expect(text).to.equal('hello\n😫😫\nworld');
}

// Register tests here
const TESTS: Array<[string, Testfunc]> = [
    ['Show and hide emoji selector', showEmojiSelector],
    ['Insert emoji and text', insertEmoji],
    ['Insert three lines of text', insertNewline],
    ['Regression test #574', regression574],
    ['Regression test #671', regression671],
    ['Regression test #672', regression672],
];

// Test runner
const TEST_URL = 'http://localhost:7777/tests/ui/compose_area.html';
(async function() {
    const driver: WebDriver = await new Builder().forBrowser(browser).build();
    let i = 0;
    let success = 0;
    let failed = 0;
    let skipped = 0;
    console.info('\n====== THREEMA WEB UI TESTS ======\n');
    if (filterQuery !== undefined) {
        console.info(`Filter query: "${filterQuery}"\n`);
    }
    try {
        for (const [name, testfunc] of TESTS) {
            try {
                if (filterQuery === undefined || name.toLowerCase().indexOf(filterQuery.toLowerCase()) !== -1) {
                    console.info(TermColor.blue(`» ${i + 1}: Running test: ${name}`));
                    await driver.get(TEST_URL);
                    await testfunc(driver);
                    success++;
                } else {
                    skipped++;
                }
            } catch (e) {
                console.error(TermColor.red(`\nTest failed:`));
                console.error(e);
                failed++;
            } finally {
                i++;
            }
        }
    } finally {
        await driver.quit();
    }
    const colorFunc = failed > 0 ? TermColor.red : TermColor.green;
    console.info(colorFunc(`\nSummary: ${i} tests run, ${success} succeeded, ${failed} failed, ${skipped} skipped`));
    process.exit(failed > 0 ? 1 : 0);
})();
