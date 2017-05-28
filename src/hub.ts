import * as fmt from './sse_formatter';
import { ISseFunctions } from './sse_middleware';

export class Hub {
    private clients = new Set<ISseFunctions>();

    public register(funcs: ISseFunctions): void {
        this.clients.add(funcs);
    }

    public unregister(funcs: ISseFunctions): void {
        this.clients.delete(funcs);
    }

    public data(data: fmt.SseValue, id?: string): void {
        this.clients.forEach(client => client.data(data, id));
    }

    public event(event: string, data: fmt.SseValue, id?: string): void {
        this.clients.forEach(client => client.event(event, data, id));
    }

    public comment(comment: string): void {
        this.clients.forEach(client => client.comment(comment));
    }
}
