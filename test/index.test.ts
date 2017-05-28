import { expect } from 'chai';
import * as index from '../src/index';
import * as sseHubMiddleware from '../src/sse_hub_middleware';
import * as sseMiddleware from '../src/sse_middleware';

describe('index', () => {
    describe('Public exports', () => {
        it('exports { sse } and also exports it as { default }', () => {
            expect(index.sse).to.equal(sseMiddleware.sse);
            expect(index.default).to.equal(sseMiddleware.sse);
        });

        it('exports { sseHub }', () => {
            expect(index.sseHub).to.equal(sseHubMiddleware.sseHub);
        });
    });
});
