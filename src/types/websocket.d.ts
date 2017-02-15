// Type definitions for websocket
// Definitions by: Danilo Bargen <https://github.com/dbrgn>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare const enum ReadyState {
    Connecting = 0,
    Open = 1,
    Closing = 2,
    Closed = 3,
}

declare module "websocket" {

    export interface WebSocket {
        binaryType: string;
        bufferedAmount: number; // readonly
        extensions: string;
        onclose: EventListener;
        onerror: EventListener;
        onmessage: EventListener;
        onopen: EventListener;
        protocol: string;
        readyState: ReadyState; // readonly
        url: string; // readonly

        constructor(url: string, protocols?: string | string[]);
        close(code?: number, reason?: string);
        send(data: string | ArrayBuffer | Blob);
    }
}
