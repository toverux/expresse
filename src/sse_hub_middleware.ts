import { compose, Handler as ComposeHandler } from 'compose-middleware';
import { Handler, NextFunction, Request, Response } from 'express';
import { Hub, IHub } from './hub';
import { ISseMiddlewareOptions } from './sse_handler_middleware';
import { ISseFunctions, ISseResponse, sse } from './sse_middleware';

export interface ISseHubFunctions extends ISseFunctions {
    /**
     * Holds the broadcasting variants of the normal SSE functions.
     */
    broadcast: ISseFunctions;
}

/**
 * An ISseHubResponse is an augmented ISseResponse that contains a `sse.broadcast` property that contains the normal
 * SSE functions, except that they will send messages to every client connected to the hub.
 *
 * Example:
 *     res.sse.event('myevent', data'); // send to the client that originated the request.
 *     res.sse.broadcast.event('myevent', 'data'); // send to every client that passed through the middleware.
 */
export interface ISseHubResponse extends Response {
    sse: ISseHubFunctions;
}

export interface ISseHubMiddlewareOptions extends ISseMiddlewareOptions {
    /**
     * You can pass a IHub-compatible instance for controlling the stream outside of the middleware.
     * Otherwise, a Hub instance is automatically created.
     */
    hub: IHub;
}

/**
 * SSE middleware that configures an Express response for an SSE session, installs `sse.*` functions on the Response
 * object, as well as the `sse.broadcast.*` variants.
 *
 * @param options An ISseMiddlewareOptions to configure the middleware's behaviour.
 */
export function sseHub(options: Partial<ISseHubMiddlewareOptions> = {}): Handler {
    const { hub = new Hub() } = options;

    function middleware(req: Request, res: ISseResponse, next: NextFunction): void {
        //=> Register the SSE functions of that client on the hub
        hub.register(res.sse);

        //=> Unregister the user from the hub when its connection gets closed (close=client, finish=server)
        res.once('close', () => hub.unregister(res.sse));
        res.once('finish', () => hub.unregister(res.sse));

        //=> Make hub's functions available on the response
        (res as ISseHubResponse).sse.broadcast = {
            data: hub.data.bind(hub),
            event: hub.event.bind(hub),
            comment: hub.comment.bind(hub),
        };

        //=> Done
        next();
    }

    return compose(sse(options) as ComposeHandler, middleware as ComposeHandler);
}
