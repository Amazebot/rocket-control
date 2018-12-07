[config]: https://github.com/Amazebot/util/tree/master/packages/config

# 🔌 Rocket Socket
Communicate with Rocket.Chat Realtime API via websocket (DDP).
---

### Config

Uses [`@amazebot/config`][config] to load instance and user credentials for
connecting and logging in into Rocket.Chat server.

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

See the [README][config] for more info on defining configs.

### Usage

