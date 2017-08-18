<img src="https://raw.githubusercontent.com/toverux/expresse/master/expresse.png" alt="AssetBundleCompiler logo" align="right">

# ExpreSSE [![npm version](https://img.shields.io/npm/v/@toverux/expresse.svg?style=flat-square)](https://www.npmjs.com/package/@toverux/expresse) ![license](https://img.shields.io/github/license/mitmadness/UnityInvoker.svg?style=flat-square) [![Travis Build](https://img.shields.io/travis/toverux/expresse.svg?style=flat-square)](https://travis-ci.org/toverux/expresse) ![npm total downloads](https://img.shields.io/npm/dt/@toverux/expresse.svg?style=flat-square)

ExpreSSE is a set of middlewares - with a simple and elegant API - for working with [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) in [Express](http://expressjs.com/fr/). SSE is a simple unidirectional protocol that lets an HTTP server push messages to a client that uses `window.EventSource`. It's HTTP long-polling, without polling!

From the MDN:

> Traditionally, a web page has to send a request to the server to receive new data; that is, the page requests data from the server. With server-sent events, it's possible for a server to send new data to a web page at any time, by pushing messages to the web page. 

----------------

 - [Installation & Usage](#package-installation--usage)
 - [`sse()` middleware](#sse-middleware) — one to one (server to 1 client)
 - [`sseHub()` middleware](#ssehub-middleware) — one to many (server to _n_ clients)
 - [`RedisHub`](#redishub--redis-support-for-ssehub) — Redis support for `sseHub()` — (_n_ servers to _n_ clients)
 - Notes:
   [About browser support](#about-browser-support) / [Using a serializer for messages' `data` field](#using-a-serializer-for-messages-data-fields)

----------------

## :package: Installation & Usage

**Requirements:**

 - Node.js 5+ because ExpreSSE is transpiled down to ES 6 ;
 - Express 4

Install it via the npm registry:

```
yarn add @toverux/expresse
```

*TypeScript users:* the library as distributed on npm already contains type definitions for TypeScript. :sparkles:

## `sse()` middleware

<details>
<summary>Import the middleware</summary>

 - Using ES 2015 imports:
 
   `ISseResponse` is a TypeScript interface. Don't try to import it when using JavaScript.

   ```typescript
   import { ISseResponse, sse } from '@toverux/expresse';
   
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
interface ISseMiddlewareOptions {
    /**
     * Serializer function applied on all messages' data field (except when you direclty pass a Buffer).
     * SSE comments are not serialized using this function.
     *
     * @default JSON.stringify
     */
    serializer?: (value: any) => string|Buffer;

    /**
     * Determines the interval, in milliseconds, between keep-alive packets (neutral SSE comments).
     *
     * @default 5000
     */
    keepAliveInterval?: number;
}
```

:arrow_right: [Read more about `serializer`](#using-a-serializer-for-messages-data-fields)
</details>
<br>

Usage example *(remove `ISseResponse` when not using TypeScript)*:

```typescript
// somewhere in your module
router.get('/events', sse(/* options */), (req, res: ISseResponse) => {
    let messageId = parseInt(req.header('Last-Event-ID'), 10) || 0;
    
    someModule.on('someEvent', (event) => {
        //=> Data messages (no event name, but defaults to 'message' in the browser).
        res.sse.data(event);
        //=> Named event + data (data is mandatory)
        res.sse.event('someEvent', event);
        //=> Comment, not interpreted by EventSource on the browser - useful for debugging/self-documenting purposes.
        res.sse.comment('debug: someModule emitted someEvent!');
        //=> In data() and event() you can also pass an ID - useful for replay with Last-Event-ID header.
        res.sse.data(event, (messageId++).toString());
    });
    
    // (not recommended) to force the end of the connection, you can still use res.end()
    // beware that the specification does not support server-side close, so this will result in an error in EventSource.
    // prefer sending a normal event that asks the client to call EventSource#close() itself to gracefully terminate.
    someModule.on('someFinishEvent', () => res.end());
});
```

## `sseHub()` middleware

This one is very useful for pushing the same messages to multiples users at a time, so they share the same "stream".

It is based on the `sse()` middleware, meaning that you can still use `res.sse.*` functions, their behavior don't change.
For broadcasting to the users that have subscribed to the stream (meaning that they've made the request to the endpoint), use the `req.sse.broadcast.*` functions, that are exactly the same as their 1-to-1 variant.

<details>
<summary>Import the middleware</summary>

 - Using ES 2015 imports:
 
   `ISseHubResponse` is a TypeScript interface. Don't try to import it when using JavaScript.

   ```typescript
   import { Hub, ISseHubResponse, sseHub } from '@toverux/expresse';
   ```

 - Using CommonJS:

   ```javascript
   const { Hub, sseHub } = require('@toverux/expresse');
   ```
</details>

<details>
<summary>Available configuration options</summary>

The options are the same from the `sse()` middleware ([see above](#sse-middleware)), plus another, `hub`:

```typescript
interface ISseHubMiddlewareOptions extends ISseMiddlewareOptions {
    /**
     * You can pass a Hub instance for controlling the stream outside of the middleware.
     * Otherwise, a Hub is automatically created.
     * 
     * @default Hub
     */
    hub: Hub;
}
```
</details>
<br>

First usage example - where the client has control on the hub *(remove `ISseHubResponse` when not using TypeScript)*:

```typescript
// somewhere in your module
router.get('/events', sseHub(/* options */), (req, res: ISseHubResponse) => {
    //=> The 1-to-1 functions are still there
    res.sse.event('welcome', 'Welcome!');
    
    //=> But we also get a `broadcast` property with the same functions inside.
    //   Everyone that have hit /events will get this message - including the sender!
    res.sse.broadcast.event('new-user', `User ${req.query.name} just hit the /channel endpoint`);
});
```

More common usage example - where the Hub is deported outside of the middleware:

```typescript
const hub = new Hub();

someModule.on('someEvent', (event) => {
    //=> All the functions you're now used to are still there, data(), event() and comment().
    hub.event('someEvent', event);
});

router.get('/events', sseHub({ hub }), (req, res: ISseHubResponse) => {
    //=> The 1-to-1 functions are still there
    res.sse.event('welcome', 'Welcome! You\'ll now receive realtime events from someModule like everyone else');
});
```

### `RedisHub` – Redis support for `sseHub()`

In the previous example you can notice that we create the Hub object ourselves. This also mean that you can replace that class with another that has a compatible interface (implement `IHub` in [src/redis_hub.ts](src/redis_hub.ts) to make your own :coffee:).

_expresse_ provides an alternative subclass of `Hub`, `RedisHub` that uses Redis' pub/sub capabilities, which is very practical if you have multiple servers, and you want `res.sse.broadcast.*` to actually broadcast SSE messages between all the nodes.

```typescript
// connects to localhost:6379 (default Redis port)
const hub = new RedisHub('channel-name');
// ...or you can pass you own two ioredis clients to bind on a custom network address
const hub = new RedisHub('channel-name', new Redis(myRedisNodeUrl), new Redis(myRedisNodeUrl));

router.get('/channel', sseHub({ hub }), (req, res: ISseHubResponse) => {
    res.sse.event('welcome', 'Welcome!'); // 1-to-1
    res.sse.broadcast.event('new-user', `User ${req.query.name} just hit the /channel endpoint`);
});
```

## :bulb: Notes

### About browser support

The W3C standard client for Server-Sent events is [EventSource](https://developer.mozilla.org/fr/docs/Web/API/EventSource). Unfortunately, it is not yet implemented in Internet Explorer or Microsoft Edge.

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
