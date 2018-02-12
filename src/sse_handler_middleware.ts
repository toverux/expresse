import { Handler, Response } from 'express';
import * as fmt from './sse_formatter';

export interface ISseMiddlewareOptions {
    /**
     * Serializer function applied on all messages' data field (except when you direclty pass a Buffer).
     * SSE comments are not serialized using this function.
     *
     * @default JSON.stringify
     */
    serializer: fmt.SseSerializer;

    /**
     * Determines the interval, in milliseconds, between keep-alive packets (neutral SSE comments).
     * Pass false to disable heartbeats (ie. you only support modern browsers/native EventSource implementation and
     * therefore don't need heartbeats to avoid the browser closing an inactive socket).
     *
     * @default 5000
     */
    keepAliveInterval: false | number;

    /**
     * If you are using expressjs/compression, you MUST set this option to true.
     * It will call res.flush() after each SSE messages so the partial content is compressed and reaches the client.
     * Read {@link https://github.com/expressjs/compression#server-sent-events} for more.
     *
     * @default false
     */
    flushAfterWrite: boolean;
}

export const sseWrite = Symbol('@toverux/expresse#sseWrite');

export interface ISseHandlerResponse extends Response {
    [sseWrite]: (chunk: any) => void;
}

export function sseHandler(options: Partial<ISseMiddlewareOptions> = {}): Handler {
    const { keepAliveInterval = 5000, flushAfterWrite = false } = options;

    return (req, res, next) => {
        //=> Basic headers for an SSE session
        res.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        });

        //=> Write immediately on the socket.
        // This has the advantage to 'test' the connection: if the client can't access this resource because of
        // CORS restrictions, the connection will fail instantly.
        write(': sse-start\n');

        //=> Start heartbeats (if not disabled)
        if (keepAliveInterval !== false) {
            if (typeof keepAliveInterval !== 'number') {
                throw new Error('keepAliveInterval must be a number or === false');
            }

            startKeepAlives(keepAliveInterval);
        }

        //=> Attach the res.write wrapper function to the response for internal use
        (res as ISseHandlerResponse)[sseWrite] = write;

        //=> Done.
        next();

        /**
         * Writes on the response socket with respect to compression settings.
         */
        function write(chunk: any) {
            res.write(chunk);
            flushAfterWrite && (res as any).flush();
        }

        /**
         * Writes heartbeats at a regular rate on the socket.
         */
        function startKeepAlives(interval: number) {
            //=> Regularly send keep-alive SSE comments, clear interval on socket close
            const keepAliveTimer = setInterval(() => write(': sse-keep-alive\n'), interval);

            //=> When the connection gets closed (close=client, finish=server), stop the keep-alive timer
            res.once('close', () => clearInterval(keepAliveTimer));
            res.once('finish', () => clearInterval(keepAliveTimer));
        }
    };
}
