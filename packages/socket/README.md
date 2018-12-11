[control]: https://github.com/Amazebot/rocket-control
[mentions]: https://github.com/Amazebot/rocket-control/tree/master/packages/examples/src/bot-mentions.ts

# 🔌 Rocket Socket
Communicate with Rocket.Chat Realtime API via websocket (DDP).
---

### Usage

See the main [`rocket-control` README][control] for general configuration.

[This example script][mentions] uses `rocket-socket` and `rocket-sims` to create
a new bot user, connect to the general channel and stream all bot mentions to
the console.

#### `new Socket()`

Accepts options object, or uses defaults from environment config. Attributes can
include `host` *string* and `useSsl` *boolean*.

Creates a websocket handler instance to manage the connection with Rocket.Chat.

```
import { Socket } from '@amazebot/rocket-socket'
const socket = new Socket()
```

#### `.open()` and `.close()`

Opens connection with Rocket.Chat. Returns promise.

Accepts option number of ms to attempt re-opening.

```
const socket = new Socket()
await socket.open()
await socket.close()
```

#### `.login(credentials)` and `.logout()`

Login can be called without explicit `.open()`, it will open the socket to login.

Login can be called without credentials to use the default user/pass from environment [configs][control].

Login returns a credential object that can be used to resume login after closing and re-opening socket.

Login accepts a range of credential objects (including the resume object mentioned above):

Username/password:
```ts
{
  username: string
  password: string
}
```

Server credentials:
```ts
{
  user: { username: string }
  password: { digest: string, algorithm: string }
}
```

Oauth token:
```ts
{
  oauth: {
    credentialToken: string
    credentialSecret: string
  }
}
```

Resume token:
```ts
{
  resume: string
}
```

#### `.connected` and `.loggedIn`

Boolean attributes for confirming connection status.

#### `.subscribe(name, params, callback)`

Subscribe to any stream of events on the server, passing the stream `name` and `params` *array* as per Realtime API docs here: https://rocket.chat/docs/developer-guides/realtime-api/subscriptions/

The callback function will be called with every emitted event.

Subscribe method returns a subscription object, with the same attributes used to create it, along with an `.id` and `.unsubscribe()` method.
