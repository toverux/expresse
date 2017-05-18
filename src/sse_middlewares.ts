import { Handler } from 'express';

export function sse(): Handler {
    return (req, res, next) => {
        res.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache'
        });

        const keepAliveInterval = setInterval(() => {
            console.log('send keepalive');
            res.write(': keepalive ');
        }, 3000);

        res.on('close', () => clearInterval(keepAliveInterval));

        next();
    };
}
