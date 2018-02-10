import { compose, Handler as ComposeHandler } from 'compose-middleware';
import { Handler, NextFunction, Request, Response } from 'express';
import * as fmt from './sse_formatter';
import { ISseMiddlewareOptions, sseHandler } from './sse_handler_middleware';

export interface ISseFunctions {
    /**
     * Writes a standard SSE data message on the socket.
     *
     * Client example:
     *     const ev = new EventSource('/sse');
     *     ev.addEventListener('message', event => console.log(event.data)); // recommended
     *     ev.onmessage = event => console.log(event.data); // legacy way
     *
     * @param data The event data1
     * @param id The event ID, useful for replay thanks to the Last-Event-ID header
     */
    data(data: fmt.SseValue, id?: string): void;

    /**
     * Writes a standard SSE message (with named event) on the socket.
     *
     * Client example:
     *     const ev = new EventSource('/sse');
     *     ev.addEventListener('evname', event => console.log(event.data));
     *
     * @param event The event name
     * @param data The event data (mandatory!)
     * @param id The event ID, useful for replay thanks to the Last-Event-ID header
     */
    event(event: string, data: fmt.SseValue, id?: string): void;

    /**
     * Writes a standard SSE comment on the socket.
     * Comments are informative and useful for debugging. There are discarded by EventSource on the browser.
     *
     * @param comment The comment message (not serialized)
     */
    comment(comment: string): void;
}

/**
 * An ISseResponse is an augmented Express response that contains an `sse` property that contains various
 * functions (data, event and comment) to send SSE messages.
 */
export interface ISseResponse extends Response {
    sse: ISseFunctions;
}

/**
 * SSE middleware that configures an Express response for an SSE session, and installs the `sse.*` functions
 * on the Response object.
 *
 * @param options An ISseMiddlewareOptions to configure the middleware's behaviour.
 */
export function sse(options: Partial<ISseMiddlewareOptions> = {}): Handler {
    const { serializer } = options;

    function middleware(req: Request, res: Response, next: NextFunction): void {
        //=> Install the sse*() functions on Express' Response
        (res as ISseResponse).sse = {
            data(data: fmt.SseValue, id?: string) {
                res.write(fmt.message(null, data, id, serializer));
            },
            event(event: string, data: fmt.SseValue, id?: string) {
                res.write(fmt.message(event, data, id, serializer));
            },
            comment(comment: string) {
                res.write(fmt.comment(comment));
            }
        };

        //=> Done
        next();
    }

    return compose(sseHandler(options) as ComposeHandler, middleware as ComposeHandler);
}
