import { compose } from 'compose-middleware';
import { Handler, NextFunction, Request, Response } from 'express';
import * as fmt from './sse_formatter';
import { ISSEMiddlewareOptions, sseHandler } from './sse_handler_middleware';

export interface ISSECapableResponse extends Response {
    /**
     * Writes a standard SSE message on the socket.
     *
     * @param event The event name, null to create a data-only message
     * @param data The event data, mandatory
     * @param id The event ID, useful for replay thanks to the Last-Event-ID header
     */
    sse(event: string|null, data: fmt.SSEValue, id?: string): boolean;

    /**
     * Writes a standard SSE comment on the socket.
     * Comments are informative and useful for debugging. There are discarded by EventSource on the browser.
     *
     * @param comment The comment message (not serialized)
     */
    sseComment(comment: string): boolean;
}

/**
 * SSE middleware that configures an Express response for an SSE session,
 * and installs sse() and sseComment() functions on the Response object
 *
 * @param options An ISSEMiddlewareOptions to configure the middleware's behaviour.
 */
export function sse(options: Partial<ISSEMiddlewareOptions> = {}): Handler {
    const { serializer } = options;

    function middleware(req: Request, res: ISSECapableResponse, next: NextFunction) {
        //=> Install the sse*() functions on Express' Response
        res.sse = (event: string|null, data: fmt.SSEValue, id?: string) => {
            return res.write(fmt.message(event, data, id, serializer));
        };

        res.sseComment = (comment: string) => {
            return res.write(fmt.comment(comment));
        };

        //=> Done
        next();
    }

    return compose(sseHandler(options), middleware);
}
