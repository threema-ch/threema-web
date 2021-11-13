// Constants
const regex = {
    error: new RegExp('^[a-zA-Z]*Error:'),
};

// DOM elements
const elements = {
    wrapper: document.querySelector('#wrapper'),
    prompt: document.querySelector('#prompt'),
    container: document.querySelector('#container'),
    browser: document.querySelector('#browser'),
    config: document.querySelector('#config'),
    userConfig: document.querySelector('#userconfig'),
    log: document.querySelector('#log'),
};

// Show prompt and hide log container
elements.prompt.hidden = false;
elements.container.hidden = true;

/**
 * Escape HTML.
 */
function escapeHTML(text) {
    const template = document.createElement('span');
    template.innerText = text;
    return template.innerHTML;
}

/**
 * Create an element from HTML.
 */
function createElementFromHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}

/**
 * Format a record (message) value.
 */
function formatRecordValue(value) {
    // Handle null
    if (value === null) {
        return `<span class="null">${escapeHTML(`${value}`)}</span>`;
    }

    // Handle boolean
    if (typeof value === 'boolean') {
        return `<span class="boolean">${escapeHTML(value)}</span>`;
    }

    // Handle number
    if (typeof value === 'number' || typeof value === 'bigint') {
        return `<span class="number">${escapeHTML(value)}</span>`;
    }

    // Handle string, converted types (e.g. ArrayBuffer, Blob, ...)
    // and errors (exceptions).
    if (typeof value === 'string') {
        if (value.startsWith('[') && value.endsWith(']')) {
            return `<span class="converted">${escapeHTML(value)}</span>`;
        }
        if (regex.error.test(value)) {
            return `<span class="error">${escapeHTML(value)}</span>`;
        }
        return `<span class="string">${escapeHTML(value)}</span>`;
    }

    // Handle array
    if (value instanceof Array) {
        return `
            <details>
                <summary class="type">Array(${value.length})</summary>
                <ol>
                    ${value.map((item, index) => {
                        return `<li><span class="type">${index}:</span> ${formatRecordValue(item)}</li>`;
                    }).join('\n')}
                </ol>
            </details>`;
    }


    // Handle object
    if (typeof value === 'object') {
        const entries = Object.entries(value);
        return `
            <details>
                <summary class="type">Object(${entries.length})</summary>
                <ul>
                    ${entries.map(([key, value]) => {
                        return `<li><span class="type">${escapeHTML(key)}:</span> ${formatRecordValue(value)}</li>`;
                    }).join('\n')}
                </ul>
            </details>`;
    }

    // Unknown
    return `[${escapeHTML(value.constructor)}]`;
}

/**
 * Show the log in the UI.
 * @param data A log report in JSON notation.
 */
function showLog(data) {
    // Decode as JSON
    let container;
    try {
        container = JSON.parse(data);
    } catch (error) {
        return console.error('Could not parse pasted text to object:', error);
    }

    // Required keys to be available
    if (!(container.config instanceof Object) ||
        container.browser.constructor !== String ||
        !(container.log instanceof Array)) {
        return console.error('Not a valid container object');
    }

    // Hide prompt and show log container
    elements.prompt.hidden = true;
    elements.container.hidden = false;

    // Display meta data
    elements.browser.textContent = container.browser;
    elements.config.textContent = JSON.stringify(container.config, null, 2);
    elements.userConfig.textContent = JSON.stringify(container.userConfig, null, 2);

    // Display log records
    elements.log.innerHTML = '';
    let startTimestampMs;
    for (let [timestampMs, type, tag, ...values] of container.log) {
        // Determine start timestamp so we can display the offset in seconds
        if (startTimestampMs === undefined) {
            startTimestampMs = timestampMs;
        }

        // Get CSS style from tag (if any)
        if (tag.startsWith('%c')) {
            const style = escapeHTML(values.shift());
            tag = `<span style="${style}">${escapeHTML(tag.substring(2))}</span>`;
        } else {
            tag = escapeHTML(tag);
        }

        // Add element to log container
        elements.log.appendChild(createElementFromHTML(`
            <tbody>
                <tr class="record ${escapeHTML(type)}">
                    <td class="date" title="${new Date(timestampMs)}">${((timestampMs - startTimestampMs) / 1000).toFixed(3)}</td>
                    <td class="tag">${tag}</td>
                    <td class="message">${values.map((value) => formatRecordValue(value)).join('\n')}</td>
                </tr>
            </tbody>`));
    }
}

/**
 * Listen for *paste* events.
 */
document.addEventListener('paste', (event) => {
    // If no clipboard data is available, do nothing.
    let text;
    try {
        text = event.clipboardData.getData('text');
    } catch (error) {
        return console.error('Could not retrieve pasted data as text:', error);
    }

    // Show log
    showLog(text);
});

/**
 * Listen for *drag* events.
 */
document.addEventListener('dragover', (event) => {
    event.preventDefault();
});
document.addEventListener('dragenter', () => {
    elements.wrapper.className = 'drag-over';
});
document.addEventListener('drop', (event) => {
    event.preventDefault();
    elements.wrapper.className = '';

    // Read first file (if any)
    const files = event.dataTransfer.files;
    if (files.length === 0) {
        console.error('No files in drop event');
        return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
        showLog(event.target.result);
    });
    reader.readAsText(files[0]);
});
