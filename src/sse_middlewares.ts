import { Handler } from 'express';

export interface ISseMiddlewareOptions {
    /**
     * Determines the interval, in milliseconds, between keep-alive packets (neutral SSE comments).
     */
    keepAliveInterval: number;
}

export function sse(options: Partial<ISseMiddlewareOptions> = {}): Handler {
    const { keepAliveInterval = 5000 } = options;

    return (req, res, next) => {
        res.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache'
        });

        res.write(': sse-start\n');

        const keepAliveTimer = setInterval(() => {
            res.write(': sse-keep-alive\n');
        }, keepAliveInterval);

        res.on('close', () => clearInterval(keepAliveTimer));

        next();
    };
}
