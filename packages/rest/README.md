[config]: https://github.com/Amazebot/util/tree/master/packages/config

# 🔌 Rocket Socket
Communicate with Rocket.Chat Realtime API via websocket (DDP).
---

### Config

Environment settings for instance and credentials to log in to Rocket.Chat:

| Env var                | Description                                         |
| ---------------------- | ----------------------------------------------------|
| `RC_URL`               | URL of the Rocket.Chat to connect to                |
| `RC_SSL`               | Force connection to use SSL (default false)         |
| `RC_USERNAME`          | Username for account login                          |
| `RC_PASSWORD`          | Password for account login                          |
| `RC_AUTH`              | Set to 'ldap' to enable LDAP login                  |

The default URL is `localhost:3000` and username `admin` password `pass`.

These can also be set via `.env` file or added to package.json in an `rcConfig`
attribute, using *camelCase* for property names instead of *ENV_FORMAT*.

See the [`@amazebot/config` README][config] for more info on defining configs.

### Usage

#### `.lookup(username)`

Get user data for existing users.

```
import { user } from '@amazebot/rocket-sims'
user.lookup('admin')
  .then((data) => console.log(data))
```

#### `.create(user)`

Register new user from given attributes and defaults.

```
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

Create methods returns a user "record" containing:
- `.id` the created user ID
- `.account` contains details from creation (params merged with defaults)
- `.login()` logs in the user via websocket (DDP / Realtime API)
- `.delete()` deletes this user from server

Login returns a websocket instance for the logged in user to make subsequent
server method calls and subscriptions. e.g:

```
u1 = await user.create({ username: 'sim1' })
ws1 = await u1.login()
await ws1.call('joinRoom', 'general)
```

#### `.random()`

Creates a user with a random name. Returns the same as `.create`

#### `.records`

Contains a collection of created users assigned to their ID.

#### `.deleteAll()`

Deletes all users created in the current session.

### Example

This example script creates a new bot user, connects to the general channel and
streams all their mentions to the console:

```
async function mentions
```
