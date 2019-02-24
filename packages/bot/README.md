[control]: https://github.com/Amazebot/rocket-control
[lru]: https://www.npmjs.com/package/lru-cache

# 🤖 Rocket Bot
Consume Rocket.Chat message streams and automate method calls.

---

### Usage

See the main [`rocket-control` README][control] for general configuration.

[This example script][mentions] uses `rocket-socket` and `rocket-sims` to create
a new bot user, connect to the general channel and stream all bot mentions to
the console.

### Driver

Provides a high level interface for connection, login and subscribing to message
events in Rocket.Chat. The default driver instance can be required for general
usage, to subscribe and respond to the aggregated message stream for a bot user.

```ts
import driver from '@amazebot/rocket-bot'
```

Or use the `Driver` class to create multiple driver instances if you need to
connect to different sources, streams or isolate cached method results.

#### `new Driver()`

Create a driver instance. It exposes the lower level `socket` and `api`
dependencies as a properties to allow more advanced usage.

```ts
import { Driver } from '@amazebot/rocket-bot'
const driver = new Driver()
```

#### `.login(credentials)`

Proxy for [Socket login method](https://github.com/Amazebot/rocket-control/tree/master/packages/socket#logincredentials-and-logout)

By default uses credentials in `RC_USERNAME` and `RC_PASSWORD` env vars or
_package.json_: `{ "rcConfig": { "username": "bot", "password": "pass" } }`

```ts
import driver from '@amazebot/rocket-bot'
driver.login().then(() => console.log('🚀🤖 Logged in!'))
```

Credentials can also be given at run-time.

```ts
import driver from '@amazebot/rocket-bot'
driver.login({ username: 'me', password: 'pass' }).then(() => console.log('👍'))
```

#### `.onMessage(callback, options)`

> WARNING: The meta field in streams is unstable, may be deprecated in future.
> See [Issue #12574](https://github.com/RocketChat/Rocket.Chat/issues/12574) and
> [PR #12763](https://github.com/RocketChat/Rocket.Chat/pull/12763).
>
> Please make use of meta conditional to avoid failures on upcoming Rocket.Chat
> releases and review any changes to message schema for possible updates to
> `roomType` and `roomName` attributes.

#### `.subscribe(stream, room)`

Lower level method for creating subscription through socket. Can be called
explicitly to create any number of streams for specific rooms, but mainly used
implicitly by `onMessage` for the main aggregated message stream.

Returned subscription instance includes an `.onEvent` method for adding event
handlers and `.unsubscribe` method to cancel the subscription.

```ts
const 
```

### Cache

[LRU Cache][lru] is used to manage results of method calls to the server. For
results that are unlikely to change, like Room ID lookups, the 
