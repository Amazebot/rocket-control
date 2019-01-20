[control]: https://github.com/Amazebot/rocket-control
[mentions]: https://github.com/Amazebot/rocket-control/tree/master/packages/examples/src/bot-mentions.ts

# 👩‍🎤 Rocket Sims
Populate Rocket.Chat with mock users and messages for testing.

---

### Usage

See the main [`rocket-control` README][control] for general configuration.

[This example script][mentions] uses `rocket-socket` and `rocket-sims` to create
a new bot user, connect to the general channel and stream all bot mentions to
the console.

#### `.lookup(username)`

Get user data for existing users.

```ts
import { user } from '@amazebot/rocket-sims'
user.lookup('admin')
  .then((data) => console.log(data))
```

#### `.create(user)`

Register new user from given attributes and defaults.

```ts
import { user } from '@amazebot/rocket-sims'
async function registerSims {
  const u1 = await user.create({ username: 'sim1' })
  const u2 = await user.create({ username: 'sim2' })
}
```

You muse include `username` OR `name`. Other attributes and defaults are:

```
password: string // default: random
email: string // default: null account at test.smtp.org
roles: string[] // default: ['user']
joinDefaultChannels: boolean // default: false
requirePasswordChange: boolean // default: false
sendWelcomeEmail: boolean // default: false
verified: boolean // default: true
```

You can also include any key/value pairs for custom user fields.

Create methods returns a user *record* containing:
- `.id` the created user ID
- `.account` contains details from creation (params merged with defaults)
- `.login()` logs in the user via websocket (DDP / Realtime API)
- `.delete()` deletes this user from server

Login returns a websocket instance for the logged in user to make subsequent
server method calls and subscriptions. e.g:

```ts
u1 = await user.create({ username: 'sim1' })
ws1 = await u1.login()
await ws1.call('joinRoom', 'general')
```

#### `.random()`

Creates a user with a random name. Returns the same as `.create`

#### `.records`

A collection of created users assigned to their ID.

#### `.deleteAll()`

Deletes all users created in the current session.
