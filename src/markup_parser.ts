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

export const enum TokenType {
    Text,
    Newline,
    Asterisk,
    Underscore,
    Tilde,
}

export interface Token {
    kind: TokenType;
    value?: string;
}

// The markup characters.
const markupChars = {
    [TokenType.Asterisk]: '*',
    [TokenType.Underscore]: '_',
    [TokenType.Tilde]: '~',
};

// CSS classes for the HTML markup.
const cssClasses = {
    [TokenType.Asterisk]: 'text-bold',
    [TokenType.Underscore]: 'text-italic',
    [TokenType.Tilde]: 'text-strike',
};

/**
 * Return whether the specified token type is a markup token.
 */
function isMarkupToken(tokenType: TokenType) {
    return markupChars.hasOwnProperty(tokenType);
}

/**
 * Return whether the specified character is a boundary character.
 * When `character` is undefined, the function will return true.
 */
function isBoundary(character?: string) {
    return character === undefined || /[\s.,!?¡¿‽⸮;:&(){}\[\]⟨⟩‹›«»'"‘’“”*~\-_…⋯᠁]/.test(character);
}

/**
 * This function accepts a string and returns a list of tokens.
 */
export function tokenize(text: string): Token[] {
    const tokens = [];
    let textBuf = '';

    const pushTextBufToken = () => {
        if (textBuf.length > 0) {
            tokens.push({ kind: TokenType.Text, value: textBuf });
            textBuf = '';
        }
    };

    for (let i = 0; i < text.length; i++) {
        const currentChar = text[i];
        const prevIsBoundary = isBoundary(text[i - 1]);
        const nextIsBoundary = isBoundary(text[i + 1]);

        if (currentChar === '*' && (prevIsBoundary || nextIsBoundary)) {
            pushTextBufToken();
            tokens.push({ kind: TokenType.Asterisk });
        } else if (currentChar === '_' && (prevIsBoundary || nextIsBoundary)) {
            pushTextBufToken();
            tokens.push({ kind: TokenType.Underscore });
        } else if (currentChar === '~' && (prevIsBoundary || nextIsBoundary)) {
            pushTextBufToken();
            tokens.push({ kind: TokenType.Tilde });
        } else if (currentChar === '\n') {
            pushTextBufToken();
            tokens.push({ kind: TokenType.Newline });
        } else {
            textBuf += currentChar;
        }
    }

    pushTextBufToken();

    return tokens;
}

export function parse(tokens: Token[]): string {
    const stack: Token[] = [];

    // Booleans to avoid searching the stack.
    // This is used for optimization.
    const tokensPresent = {
        [TokenType.Asterisk]: false,
        [TokenType.Underscore]: false,
        [TokenType.Tilde]: false,
    };

    // Helper: When called with a value, mark the token type as present or not.
    // When called without a value, return whether this token type is present.
    const hasToken = (token: TokenType, value?: boolean) => {
        if (value === undefined) {
            return tokensPresent[token];
        }
        tokensPresent[token] = value;
    };

    // Helper: Consume the stack, return a string.
    const consumeStack = () => {
        let textBuf = '';
        for (const token of stack) {
            switch (token.kind) {
                case TokenType.Text:
                    textBuf += token.value;
                    break;
                case TokenType.Asterisk:
                case TokenType.Underscore:
                case TokenType.Tilde:
                    textBuf += markupChars[token.kind];
                    break;
                case TokenType.Newline:
                    throw new Error('Unexpected newline token on stack');
                default:
                    throw new Error('Unknown token on stack: ' + token.kind);
            }
        }
        // Clear stack
        // https://stackoverflow.com/a/1232046
        stack.splice(0, stack.length);
        return textBuf;
    };

    // Helper: Pop the stack, throw an exception if it's empty
    const popStack = () => {
        const stackTop = stack.pop();
        if (stackTop === undefined) {
            throw new Error('Stack is empty');
        }
        return stackTop;
    };

    // Helper: Add markup HTML to the stack
    const pushMarkup = (textParts: string[], cssClass: string) => {
        let html = `<span class="${cssClass}">`;
        for (let i = textParts.length - 1; i >= 0; i--) {
            html += textParts[i];
        }
        html += '</span>';
        stack.push({ kind: TokenType.Text, value: html });
    };

    // Process the tokens. Add them to a stack. When a token pair is complete
    // (e.g. the second asterisk is found), pop the stack until you find the
    // matching token and convert everything in between to formatted text.
    for (const token of tokens) {
        switch (token.kind) {

            // Keep text as-is
            case TokenType.Text:
                stack.push(token);
                break;

            // If a markup token is found, try to find a matching token.
            case TokenType.Asterisk:
            case TokenType.Underscore:
            case TokenType.Tilde:
                // Optimization: Only search the stack if a token with this token type exists
                if (hasToken(token.kind)) {
                    // Pop tokens from the stack. If a matching token was found, apply
                    // markup to the text parts in between those two tokens.
                    const textParts = [];
                    while (true) {
                        const stackTop = popStack();
                        if (stackTop.kind === TokenType.Text) {
                            textParts.push(stackTop.value);
                        } else if (stackTop.kind === token.kind) {
                            if (textParts.length > 0) {
                                pushMarkup(textParts, cssClasses[token.kind]);
                            } else {
                                // If this happens, then two markup chars were following each other (e.g. **hello).
                                // In that case, just keep them as regular text characters, without applying any markup.
                                const markupChar = markupChars[token.kind];
                                stack.push({ kind: TokenType.Text, value: markupChar + markupChar });
                            }
                            hasToken(token.kind, false);
                            break;
                        } else if (isMarkupToken(stackTop.kind)) {
                            textParts.push(markupChars[stackTop.kind]);
                        } else {
                            throw new Error('Unknown token on stack: ' + token.kind);
                        }
                        hasToken(stackTop.kind, false);
                    }
                } else {
                    stack.push(token);
                    hasToken(token.kind, true);
                }
                break;

            // Don't apply formatting across newlines, consume the current stack!
            case TokenType.Newline:
                stack.push({ kind: TokenType.Text, value: consumeStack() + '\n' });
                hasToken(TokenType.Asterisk, false);
                hasToken(TokenType.Underscore, false);
                hasToken(TokenType.Tilde, false);
                break;

            default:
                throw new Error('Invalid token kind: ' + token.kind);
        }
    }

    // Concatenate processed tokens
    return consumeStack();
}

export function markify(text: string): string {
    return parse(tokenize(text));
}
