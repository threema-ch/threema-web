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

// tslint:disable:no-reference
// tslint:disable:no-console
// tslint:disable:no-unused-expression

/// <reference path="../../src/threema.d.ts" />

import { expect } from 'chai';
import { Builder, By, Key, until, WebDriver, WebElement } from 'selenium-webdriver';

// Script arguments
const browser = process.argv[2];
const filterQuery = process.argv[3];

// Type aliases
type Testfunc = (driver: WebDriver) => void;

// Colored outout
function colorize(style: string) {
    return (val: string) => {
        return `${style}${val}\x1B[0m`;
    }
}
const red = colorize('\x1B[31m');
const green = colorize('\x1B[32m');
const blue = colorize('\x1B[34m');

// Shared selectors
const composeArea = By.id('composeDiv');
const emojiKeyboard = By.css('.emoji-keyboard');
const emojiTrigger = By.css('.emoji-trigger');


/**
 * Awaitable timeout function.
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper function to extract text.
 */
async function extractText(driver: WebDriver): Promise<string> {
    const script = `return window.composeArea.get_text();`;
    return driver.executeScript<string>(script);
}

/**
 * Helper function to send a KeyDown event.
 */
async function sendKeyDown(driver: WebDriver, key: string): Promise<void> {
    const script = `
        const e = document.createEvent('HTMLEvents');
        e.initEvent('keydown', false, true);
        e.key = '${key}';
        const element = document.querySelector("div.compose");
        element.dispatchEvent(e);
    `;
    return driver.executeScript<void>(script);
}

/**
 * Helper function to send a KeyUp event.
 */
async function sendKeyUp(driver: WebDriver, key: string): Promise<void> {
    const script = `
        const e = document.createEvent('HTMLEvents');
        e.initEvent('keyup', false, true);
        e.key = '${key}';
        const element = document.querySelector("div.compose");
        element.dispatchEvent(e);
    `;
    return driver.executeScript<void>(script);
}

/**
 * The emoji trigger should toggle the emoji keyboard.
 */
async function buttonTogglesEmojiSelector(driver: WebDriver) {
    // Initially not visible
    expect(
        await driver.findElement(emojiKeyboard).isDisplayed(),
    ).to.be.false;

    // Show
    await driver.findElement(emojiTrigger).click();

    expect(
        await driver.findElement(emojiKeyboard).isDisplayed(),
    ).to.be.true;

    // Hide
    await driver.findElement(emojiTrigger).click();

    expect(
        await driver.findElement(emojiKeyboard).isDisplayed(),
    ).to.be.false;
}

/**
 * Insert two emoji and some text.
 */
async function insertEmoji(driver: WebDriver) {
    // Show emoji keyboard
    await driver.findElement(emojiTrigger).click();

    // Insert woman zombie emoji
    await driver.findElement(By.css('.em[data-s=":woman_zombie:"]')).click();

    // Insert text
    await driver.findElement(composeArea).sendKeys('hi');

    // Insert beer
    await driver.findElement(By.className('em-food')).click();
    const elem = await driver.findElement(By.css('.em[data-s=":beers:"]'));
    await elem.click();

    // Validate emoji
    const emoji = await driver.findElement(composeArea).findElements(By.xpath('*'));
    expect(emoji.length).to.equal(2);
    expect(await emoji[0].getAttribute('data-c')).to.equal('1f9df-200d-2640-fe0f'); // woman zombie
    expect(await emoji[1].getAttribute('data-c')).to.equal('1f37b'); // clinking beer mugs

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
    await driver.findElement(By.css('.em[data-s=":happy:"]')).click();

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
    const emoji = await driver.findElement(By.css('.em[data-s=":happy:"]'));
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
    const emoji = await driver.findElement(By.css('.em[data-s=":tired:"]'));
    await emoji.click();
    await emoji.click();

    const text = await extractText(driver);
    expect(text).to.equal('hello\n😫😫\nworld');
}

/**
 * Insert emoji with a shortcode.
 */
async function insertEmojiWithShortcode(driver: WebDriver) {
    // Insert text
    await driver.findElement(composeArea).click();
    await driver.findElement(composeArea).sendKeys('hello :+1');
    await sendKeyDown(driver, ':');

    const text = await extractText(driver);
    expect(text).to.equal('hello 👍️');
}

// Register tests here
const TESTS: Array<[string, Testfunc]> = [
    ['Show and hide emoji selector', buttonTogglesEmojiSelector],
    ['Insert emoji and text', insertEmoji],
    ['Insert three lines of text', insertNewline],
    ['Regression test #574', regression574],
    ['Regression test #671', regression671],
    ['Regression test #672', regression672],
    ['Insert emoji through shortcode', insertEmojiWithShortcode],
];

// Test runner
const TEST_URL = 'http://localhost:7777/tests/ui/compose_area.html';
(async function() {
    const driver: WebDriver = await new Builder().forBrowser(browser).build();
    driver.manage().setTimeouts({implicit: 1000, pageLoad: 30000, script: 30000});
    let i = 0;
    let success = 0;
    let failed = 0;
    let skipped = 0;
    console.info('\n====== THREEMA WEB UI TESTS ======\n');
    if (filterQuery !== undefined) {
        console.info(`Filter query: "${filterQuery}"\n`);
    }
    try {
        // Initial pageload to ensure bundles are generated
        for (let j = 1; j <= 5; j++) {
            try {
                await driver.get(TEST_URL);
                break;
            } catch (error) {
                // In CI, this fails sometimes because the server is too slow to
                // start and the call runs into a timeout. Try it again...
                console.info(`(Initial request failed (attempt ${j}), trying again in 5s...)`);
                await sleep(5000);
            }
        }

        for (const [name, testfunc] of TESTS) {
            try {
                if (filterQuery === undefined || name.toLowerCase().indexOf(filterQuery.toLowerCase()) !== -1) {
                    i++;
                    console.info(blue(`» ${i}: Running test: ${name}`));
                    await driver.get(TEST_URL);
                    await testfunc(driver);
                    success++;
                } else {
                    skipped++;
                }
            } catch (e) {
                console.error(red(`\nTest failed:`));
                console.error(e);
                failed++;
            }
        }
    } finally {
        await driver.quit();
    }
    const colorFunc = failed > 0 ? red : green;
    console.info(colorFunc(`\nSummary: ${i} tests run, ${success} succeeded, ${failed} failed, ${skipped} skipped`));
    process.exit(failed > 0 ? 1 : 0);
})();
