import { Handler } from 'express';
import * as fmt from './sse_formatter';

export interface ISseMiddlewareOptions {
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

export function sseHandler(options: Partial<ISseMiddlewareOptions> = {}): Handler {
    const { keepAliveInterval = 5000 } = options;

    return (req, res, next) => {
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

        res.once('close', () => clearInterval(keepAliveTimer));

        //=> Done
        next();
    };
}
