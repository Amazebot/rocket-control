[control]: https://github.com/Amazebot/rocket-control
[socket]: https://github.com/Amazebot/rocket-socket
[lru]: https://www.npmjs.com/package/lru-cache

# 🤖 Rocket Bot
Consume Rocket.Chat message streams and automate method calls.

---

### Usage

Full use-case examples are on the todo list. See below for method usage.

### Config

See the main [`rocket-control` README][control] for general configuration.

Specific configs for this module are as follows (none are required):

| Env var                | Description                                         |
| ---------------------- | ----------------------------------------------------|
| `RC_INTEGRATION_ID`    | Applies `message.bot.i` to identify sent messages   |
| `RC_JOIN`              | CSV of room names or IDs to join on login           |
| `RC_STREAM_NAME`       | Stream name to subscribe to for messages            |
| `RC_STREAM_ROOM`       | Room or collection for subscription parameters      |
| `RC_IGNORE_DIRECT`     | Filter direct messages out of aggregated stream     |
| `RC_IGNORE_LIVECHAT`   | Filter livechat messages out of aggregated stream   |
| `RC_IGNORE_EDITED`     | Filter edited messages out of aggregated stream     |

### Driver

Provides a high level interface for connection, login and subscribing to message
streams in Rocket.Chat. The default driver instance can be required for general
usage, to subscribe and respond to the aggregated message stream for a bot user.

```js
const { driver } = require('@amazebot/rocket-bot')
```

Or use the `Driver` class to create multiple driver instances if you need to
connect to different sources, streams or isolate cached method results.

#### `new Driver()`

Create a driver instance. It exposes the lower level `socket` and `api`
dependencies as properties to allow more advanced usage.

```js
const { Driver } = require('@amazebot/rocket-bot')
const driver = new Driver()
```

#### `.login(credentials)`

Proxy for [Socket login method](https://github.com/Amazebot/rocket-control/tree/master/packages/socket#logincredentials-and-logout)

By default uses credentials in `RC_USERNAME` and `RC_PASSWORD` env vars or
_package.json_: `{ "rcConfig": { "username": "bot", "password": "pass" } }`

```js
driver.login().then(() => console.log('🚀🤖 Logged in!'))
```

Credentials can also be given at run-time.

```js
driver.login({ username: 'me', password: 'pass' }).then(() => console.log('👍'))
```

#### `.onMessage(callback, options)`

Call a callback on every event in the user's aggregated message stream. The
callback arguments use error-first pattern, followed by the message and meta
object.

```js
driver.onMessage((err, message, meta) => {
  if (!err) console.log({ message, meta })
})
```

A second argument can be given to override config for ignored messages. e.g.

```js
const callback = (err, message, meta) => console.log(err || message)
driver.onMessage(callback, {
  edited: true,
  livechat: false,
  direct: false
}) // 👆 ignores livechat and DMs, fires on edited (regardless of config)
```

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

#### Helpers and Aliases

A collection of methods provide extra utility for bots that are not yet
documented other than in source. Some simply alias socket methods. See the
[socket][socket readme] or [the codebase]('./src/driver.ts') for description
and usage of the following:

- `asyncCall`
- `cacheCall`
- `callMethod`
- `userById`
- `getRoomId`
- `getRoomName`
- `getDirectMessageRoomId`
- `joinRoom`
- `leaveRoom`
- `joinRooms`
- `leaveRooms`
- `prepareMessage`
- `sendMessage`
- `sendToRoomId`
- `sendToRoom`
- `sendDirectToUser`
- `editMessage`
- `setReaction`
