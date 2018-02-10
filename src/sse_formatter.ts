export type SseField = 'event' | 'data' | 'id' | 'retry'; // keyof fieldBufs

export type SseValue = Buffer | any;

export type SseSerializer = (value: any) => string | Buffer;

export interface ISseBlockConfiguration {
    [field: string /* in fact SseField */]: SseValue;
}

const fieldBuffers = {
    __comment__: Buffer.from(': '),
    event: Buffer.from('event: '),
    data: Buffer.from('data: '),
    id: Buffer.from('id: '),
    retry: Buffer.from('retry: ')
};

const eolBuf = Buffer.from('\n');

const stringSerialize: SseSerializer = String;
const jsonSerialize: SseSerializer = JSON.stringify;

/**
 * Creates a Buffer for a SSE "instruction" -- `event: myEvent\n`
 *
 * @param field The instruction field
 * @param value The instruction value
 * @param serializer Value serializer for `data`
 */
export function instruction(field: SseField, value: SseValue, serializer?: SseSerializer): Buffer {
    return Buffer.concat([
        fieldBuffers[field], toBuffer(value, serializer), eolBuf
    ]);
}

/**
 * Creates a Buffer for a SSE comment -- `: this is a comment\n`
 *
 * @param comment The comment message
 */
export function comment(comment: string): Buffer { // tslint:disable-line:no-shadowed-variable
    return instruction('__comment__' as SseField, comment, stringSerialize);
}

/**
 * Creates a Buffer for a SSE block of instructions -- event: myEvent\ndata: "eventData"\n\n
 *
 * @param instructions An object map of SSEFields to SSEValues
 * @param serializer Value serializer for `data`
 */
export function block(instructions: ISseBlockConfiguration, serializer?: SseSerializer): Buffer {
    const lines = Object.keys(instructions).map((field) => {
        const fieldSerializer = field === 'data' ? serializer : stringSerialize;

        return instruction(
            field as SseField,
            toBuffer(instructions[field], fieldSerializer)
        );
    });

    return Buffer.concat([...lines, eolBuf]);
}

/**
 * Create a buffer for a standard SSE block composed of `event`, `data`, and `id` (only `data` is mandatory).
 * To create a data-only message (without event name), pass `null` to `event`.
 *
 * @param event The event name, null to create a data-only message
 * @param data The event data
 * @param id The event ID
 * @param serializer Value serializer for `data`
 */
export function message(
    event: string | null,
    data: SseValue,
    id?: string,
    serializer?: SseSerializer
): Buffer {
    const frame: ISseBlockConfiguration = {};

    id != null && (frame.id = id);
    event != null && (frame.event = event);

    if (data === undefined) {
        throw new Error('The `data` field in a message is mandatory');
    }

    frame.data = data;

    return block(frame, serializer);
}

/**
 * Applies the serializer on a value then converts the resulting string in an UTF-8 Buffer of characters.
 *
 * @param value The value to serialize
 * @param serializer Value serializer
 */
function toBuffer(value: SseValue, serializer: SseSerializer = jsonSerialize) {
    if (Buffer.isBuffer(value)) {
        return value;
    }

    const serialized = serializer(value);

    return Buffer.isBuffer(serialized)
        ? serialized
        : Buffer.from(serialized);
}
