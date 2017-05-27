import { expect } from 'chai';
import * as sseFormatter from '../src/sse_formatter';

describe('sse_formatter', () => {
    const availSseFields = ['event', 'data', 'id', 'retry'];
    const testSerializer = (data: any) => `((${data}))`;

    describe('instruction()', () => {
        it('formats a SSE instruction', () => {
            availSseFields.forEach((field: sseFormatter.SSEField) => {
                const line = sseFormatter.instruction(field, 'message', testSerializer).toString();

                expect(line).to.equal(`${field}: ((message))\n`);
            });
        });

        it('uses JSON as the default serialization format', () => {
            const lineAuto = sseFormatter.instruction('event', 'message').toString();
            const lineJson = sseFormatter.instruction('event', 'message', JSON.stringify).toString();

            expect(lineAuto).to.equal(lineJson);
        });
    });

    describe('comment()', () => {
        it('formats a SSE comment', () => {
            const comment = sseFormatter.comment('my comment').toString();

            expect(comment).to.equal(': my comment\n');
        });
    });

    describe('block()', () => {
        it('formats a SSE block', () => {
            const block = sseFormatter.block({ id: 42, data: 'message' }, testSerializer).toString();

            expect(block).to.equal('id: 42\ndata: ((message))\n\n');
        });

        it('applies the user serializer only the "data" field only', () => {
            const block = sseFormatter.block({
                id: 42,
                event: 'xkcd/posts/new',
                data: 'correct horse battery staple',
                retry: 3000
            }, testSerializer).toString();

            const expectedBlock = 'id: 42\n' +
                'event: xkcd/posts/new\n' +
                'data: ((correct horse battery staple))\n' +
                'retry: 3000\n\n';

            expect(block).to.equal(expectedBlock);
        });
    });

    describe('message()', () => {
        it('formats a standard SSE message (data-only)', () => {
            const message = sseFormatter.message(
                null,
                'correct horse battery staple',
                void 0,
                testSerializer
            ).toString();

            const expectedMessage = 'data: ((correct horse battery staple))\n\n';

            expect(message).to.equal(expectedMessage);
        });

        it('formats a standard SSE message (event+data)', () => {
            const message = sseFormatter.message(
                'xkcd/posts/new',
                'correct horse battery staple',
                void 0,
                testSerializer
            ).toString();

            const expectedMessage = 'event: xkcd/posts/new\n' +
                'data: ((correct horse battery staple))\n\n';

            expect(message).to.equal(expectedMessage);
        });

        it('formats a standard SSE message (id+event+data)', () => {
            const message = sseFormatter.message(
                'xkcd/posts/new',
                'correct horse battery staple',
                45..toString(),
                testSerializer
            ).toString();

            const expectedMessage = 'id: 45\n' +
                'event: xkcd/posts/new\n' +
                'data: ((correct horse battery staple))\n\n';

            expect(message).to.equal(expectedMessage);
        });

        it('throws when asked to format a data-less SSE message', () => {
            const crash = () => sseFormatter.message('xkcd/posts/new', void 0, void 0).toString();

            expect(crash).to.throw(/.*data.*mandatory.*/);
        });
    });
});
