[lerna]: https://lernajs.io/
[node]: https://nodejs.org/
[yarn]: https://yarnpkg.com/
[rc]: https://rocket.chat/
[mongo]: https://www.mongodb.com/
[socket]: https://github.com/Amazebot/rocket-control/tree/master/packages/socket
[rest]: https://github.com/Amazebot/rocket-control/tree/master/packages/rest
[sims]: https://github.com/Amazebot/rocket-control/tree/master/packages/sims
[bot]: https://github.com/Amazebot/rocket-control/tree/master/packages/bot
[packages]: https://github.com/Amazebot/rocket-control/tree/master/packages
[config]: https://github.com/Amazebot/util/tree/master/packages/config
[configA]: https://github.com/Amazebot/rocket-control#config
[examples]: https://github.com/Amazebot/rocket-control/tree/master/packages/examples/src

# 🚀 Rocket Control
[Node.js][node] utilities to manage Rocket.Chat instances and drive integrations

<!-- [![CircleCI](https://circleci.com/gh/Amazebot/rocket-control/tree/master.svg?style=shield)](https://circleci.com/gh/Amazebot/rocket-control/tree/master) -->
<!-- [![codecov](https://codecov.io/gh/Amazebot/rocket-control/branch/master/graph/badge.svg)](https://codecov.io/gh/Amazebot/rocket-control/branch/master) -->

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)
[![Buy me a coffee](https://img.shields.io/badge/buy%20me%20a%20coffee-☕-yellow.svg)](https://www.buymeacoffee.com/UezGWCarA)

---

## Meet the family

See the README in each [package path][packages] for further usage instructions.

### 🔌 [Rocket Socket][socket]
Communicate with Rocket.Chat Realtime API via websocket (DDP).

[![npm version](https://badge.fury.io/js/%40amazebot%2Frocket-socket.svg)](https://badge.fury.io/js/%40amazebot%2Frocket-socket)

### 🛏️ [Rocket Rest][rest]
Simple helpers for calling Rocket.Chat REST API endpoints.

[![npm version](https://badge.fury.io/js/%40amazebot%2Frocket-rest.svg)](https://badge.fury.io/js/%40amazebot%2Frocket-rest)

### 👨‍🎤 [Rocket Sims][sims]
Populate Rocket.Chat with mock users and messages for testing.

[![npm version](https://badge.fury.io/js/%40amazebot%2Frocket-sims.svg)](https://badge.fury.io/js/%40amazebot%2Frocket-sims)

### 🤖 Rocket Bot[bot]
Consume Rocket.Chat message streams and automate method calls.

[![npm version](https://badge.fury.io/js/%40amazebot%2Frocket-bot.svg)](https://badge.fury.io/js/%40amazebot%2Frocket-bot)

## Future release...

### 💻 Rocket Command
CLI to manage and provision Rocket.Chat instances and databases.

## Examples

[See examples][examples] that combine usage of these packages. After you've
read through [the config][configA] and have a Rocket.Chat instance to test with,
you can run the examples from source, for example:

```
yarn ts-node packages/examples/src/bot-mentions
```

## Config

Environment settings for instance and credentials to log in to Rocket.Chat.
Required by all packages:

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

## Development

Lerna is used to link and publish packages that depend on each other, to streamline local development. All packages are written in Typescript and follow Standard JS style, with a minimum of 80% test coverage.

If you'd like to contribute, our priority is ensuring stability with new Rocket.Chat releases and communicating any known incompatibility with prior versions. We welcome enhancements to CI to test against an array of RC version containers - ideally with some persistent visibility for the community.

A note about the **Rocket.Chat JS SDK**. This suite reproduces some features of the official SDK (it was made by the same person) but the SDK is evolving under direction of the core team for a wider variety of use cases. These packages are aimed at providing simple low level pieces in isolation for bespoke usage.

Development requires [Node][node] and [Lerna][lerna] and a local (or non-production remote) instance of [Rocket.Chat][rc].

It's recommended to install [Mongo][mongo] as a service, so the DB is accessible while the Rocket.Chat isn't running.
> e.g. on OS X `ln -sfv /usr/local/opt/mongodb/*.plist ~/Library/LaunchAgents`

Clone and run a clean Rocket.Chat install **in a different path**, to make it available for unit tests.
1. Clone    `git clone https://github.com/RocketChat/Rocket.Chat.git rocketchat-test`
2. Enter    `cd rocketchat-test`
3. Install  `meteor npm install`
4. Run      `export MONGO_URL='mongodb://localhost:27017/rocketchat-test'; meteor`

You can use the startup wizard to create the admin user, but if you're installing often it's recommended to add the following environment configs to your bash profile, for Rocket.Chat to pick up on first install:

```sh
export ADMIN_USERNAME="admin"
export ADMIN_PASS="pass"
export LOG_LEVEL=debug
export TEST_MODE=true
export OVERWRITE_SETTING_Show_Setup_Wizard=completed
```

### @TODO

- [ ] Add CircleCI
- [ ] Add CodeCov
- [ ] Add Greenkeeper
