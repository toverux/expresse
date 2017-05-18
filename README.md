<img src="https://raw.githubusercontent.com/toverux/expresse/master/expresse.png" alt="AssetBundleCompiler logo" align="right">

# ExpreSSE [![Travis Build](https://img.shields.io/travis/toverux/expresse.svg?style=flat-square)](https://travis-ci.org/toverux/expresse) ![typescript compatible](https://img.shields.io/badge/typescript-compatible-green.svg?style=flat-square)

----------------

ExpreSSE is a set of middlewares for working with [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) in [Express](http://expressjs.com/fr/). SSE is a simple unidirectional protocol that lets an HTTP server push messages to a client that uses `window.EventSource`. It's HTTP long-polling, without polling!

From the MDN:

> Traditionally, a web page has to send a request to the server to receive new data; that is, the page requests data from the server. With server-sent events, it's possible for a server to send new data to a web page at any time, by pushing messages to the web page. 

----------------

## :package: Installation & Usage

**Requirements:**

 - Node.js 5+ because ExpreSSE is transpiled down to ES6 ;
 - Express 4

Install it via the npm registry:

```
yarn add @toverux/expresse
```

*TypeScript users:* the library as distributed on npm already contains type definitions for TypeScript. :sparkles:

## `sse()` middleware

<details>
<summary>Import the middleware</summary>

 - Using ES2015 imports:
 
   `ISSECapableResponse` is a TypeScript interface. Don't try to import it when using JavaScript.

   ```typescript
   import { sse, ISSECapableResponse } from '@toverux/expresse';
   
   // named export { sse } is also exported as { default }:
   import sse from '@toverux/expresse';
   ```

 - Using CommonJS:

   ```javascript
   const { sse } = require('@toverux/expresse');
   ```
</details>

<details>
<summary>Available configuration options</summary>

```typescript
interface ISSEMiddlewareOptions {
    /**
     * Serializer function applied on all messages' data field (except when you direclty pass a Buffer).
     * SSE comments are not serialized using this function.
     * Defaults to JSON.stringify().
     */
    serializer?: (value: any) => string|Buffer;

    /**
     * Determines the interval, in milliseconds, between keep-alive packets (neutral SSE comments).
     */
    keepAliveInterval?: number;
}
```
</details>
<br>

Usage *(remove `ISSECapableResponse` when not using TypeScript)*:

```typescript
// somewhere in your module
router.get('/events', sse(/* options */), (req, res: ISSECapableResponse) => {
    // res.sse() and res.sseComment() are now available on Response
    
    let messageId = 0;
    
    someModule.on('event', (event) => {
        // you can pass an event name, a payload, and an ID.
        res.sse('myCustomEvent', event, ++messageId);
        
        // you can send a data-only message by passing null in the first argument.
        // in the browser, EventSource maps this under the 'message' event (or use with onmessage).
        res.sse(null, event);
    });
    
    // you can also send SSE comments, that are useful for debug
    someModule.on('trace', () => res.sseComment(`debug: ${trace}`));

    // (not recommended) to force the end of the connection, you can still use res.end()
    // beware that the specification does not support server-side close, so this will result in an error in EventSource.
    // prefer sending a normal event that asks the client to call EventSource#close() itself to gracefully terminate.
    someModule.on('finish', () => res.end());
});
```

## :bulb: Notes

### About browser support

The W3C standard client for Server-Sent events is [EventSource](https://developer.mozilla.org/fr/docs/Web/API/EventSource). Unfortunately, it is not yep implemented in Internet Explorer or Microsoft Edge.

You may want to use a polyfill on the client side if your application targets those browsers.

|                     | Chrome | Edge | Firefox | Opera | Safari |
|---------------------|--------|------|---------|-------|--------|
| EventSource Support | 6      | No   | 6       | Yes   | 5      |

### Using a serializer for messages' `data` fields

When sending a message, the `data` field is serialized using `JSON.stringify`. You can override that default serializer to use your own format.

The serializer must be compatible with the signature `(value: any) => string|Buffer;`.

For example, to format data using the `toString()` format of the value, you can use the `String()` constructor:

```typescript
app.get('/events', sse({ serializer: String }), yourMiddleware);

// or, less optimized:
app.get('/events', sse({ serializer: data => data.toString() }), yourMiddleware);
```
