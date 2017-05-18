import { Handler, Response } from 'express';
import * as fmt from './sse_formatter';

export interface ISSEMiddlewareOptions {
    /**
     * Serializer function applied on all messages' data field (except when you direclty pass a Buffer).
     * SSE comments are not serialized using this function.
     * Defaults to JSON.stringify().
     */
    serializer: fmt.SSESerializer;

    /**
     * Determines the interval, in milliseconds, between keep-alive packets (neutral SSE comments).
     */
    keepAliveInterval: number;
}

export interface ISSECapableResponse extends Response {
    /**
     * Writes a standard SSE message on the socket.
     * @param event The event name, null to create a data-only message
     * @param data The event data, mandatory
     * @param id The event ID, useful for replay thanks to the Last-Event-ID header
     */
    sse(event: string|null, data: fmt.SSEValue, id?: string): boolean;

    /**
     * Writes a standard SSE comment on the socket.
     * Comments are informative and useful for debugging. There are discarded by EventSource on the browser.
     * @param comment The comment message (not serialized)
     */
    sseComment(comment: string): boolean;
}

/**
 * SSE middleware that configures an Express response for an SSE session,
 * and installs sse() and sseComment() functions on the Response object
 * @param options An ISSEMiddlewareOptions to configure the middleware's behaviour.
 */
export function sse(options: Partial<ISSEMiddlewareOptions> = {}): Handler {
    const { serializer, keepAliveInterval = 5000 } = options;

    return (req, res: ISSECapableResponse, next) => {
        //=> Basic headers for an SSE session
        res.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache'
        });

        //=> Write immediately on the socket.
        // This has the advantage to 'test' the connection: if the client can't access this resource because of
        // CORS restrictions, the connection will fail instantly.
        res.write(': sse-start\n');

        //=> Regularly send keep-alive SSE comments, clear interval on socket close
        const keepAliveTimer = setInterval(() => {
            res.write(': sse-keep-alive\n');
        }, keepAliveInterval);

        res.on('close', () => clearInterval(keepAliveTimer));

        //=> Install the sse*() functions on Express' Response
        res.sse = (event: string|null, data: fmt.SSEValue, id?: string) => {
            return res.write(fmt.message(event, data, id, serializer));
        };

        res.sseComment = (comment: string) => {
            return res.write(fmt.comment(comment));
        };

        //=> Goto consumer's SSE middleware
        next();
    };
}
