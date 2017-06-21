import { Handler } from 'express';
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
     *
     * @default 5000
     */
    keepAliveInterval: number;
}

export function sseHandler(options: Partial<ISseMiddlewareOptions> = {}): Handler {
    const { keepAliveInterval = 5000 } = options;

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
        res.write(': sse-start\n');

        //=> Regularly send keep-alive SSE comments, clear interval on socket close
        const keepAliveTimer = setInterval(() => res.write(': sse-keep-alive\n'), keepAliveInterval);

        //=> When the connection gets closed (close=client, finish=server), stop the handshake timer
        res.once('close', () => clearInterval(keepAliveTimer));
        res.once('finish', () => clearInterval(keepAliveTimer));

        //=> Done
        next();
    };
}
