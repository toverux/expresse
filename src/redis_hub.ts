import * as Redis from 'ioredis';
import { Hub } from './hub';
import * as fmt from './sse_formatter';
import { ISseFunctions } from './sse_middleware';

interface ISerializedSseMessage {
    type: keyof ISseFunctions;
    args: any[];
}

export class RedisHub extends Hub {
    public constructor(
        public readonly channel: string,
        private readonly pub = new Redis(),
        private readonly sub = new Redis()
    ) {
        super();

        sub.subscribe(channel);
        sub.on('message', (chan, message) => this.handleRedisMessage(message));
    }

    public data(data: fmt.SseValue, id?: string): void {
        this.publish('data', arguments);
    }

    public event(event: string, data: fmt.SseValue, id?: string): void {
        this.publish('event', arguments);
    }

    public comment(comment: string): void {
        this.publish('comment', arguments);
    }

    private publish(type: keyof ISseFunctions, args: IArguments): void {
        const message: ISerializedSseMessage = {
            type, args: Array.from(args)
        };

        this.pub.publish(this.channel, JSON.stringify(message));
    }

    private handleRedisMessage(jsonMessage: string): void {
        const { type, args } = JSON.parse(jsonMessage) as ISerializedSseMessage;

        super[type].apply(this, args);
    }
}
