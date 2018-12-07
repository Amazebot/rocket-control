[lerna]: https://lernajs.io/
[node]: https://nodejs.org/
[yarn]: https://yarnpkg.com/
[rc]: https://rocket.chat/
[mongo]: https://www.mongodb.com/
[socket]: https://github.com/Amazebot/rocket-control/tree/master/packages/socket
[rest]: https://github.com/Amazebot/rocket-control/tree/master/packages/rest
[rest]: https://github.com/Amazebot/rocket-control/tree/master/packages/sims
[config]: https://github.com/Amazebot/util/tree/master/packages/config

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

### 🔌 [Rocket Socket][socket]
Communicate with Rocket.Chat Realtime API via websocket (DDP).

[![npm version](https://badge.fury.io/js/%40amazebot%2Frocket-socket.svg)](https://badge.fury.io/js/%40amazebot%2Frocket-socket)

### 🛏️ [Rocket Rest][rest]
Simple handlers for calling Rocket.Chat REST API endpoints.

[![npm version](https://badge.fury.io/js/%40amazebot%2Frocket-rest.svg)](https://badge.fury.io/js/%40amazebot%2Frocket-rest)

### 👨‍🎤 [Rocket Sims][sims]
Populate Rocket.Chat with mock users and messages for testing.

[![npm version](https://badge.fury.io/js/%40amazebot%2Frocket-sims.svg)](https://badge.fury.io/js/%40amazebot%2Frocket-sims)

## In development...

### 🤖 Rocket Bot
Consume Rocket.Chat message streams and automate method calls.

### 💻 Rocket Command
CLI to manage and provision Rocket.Chat instances and databases.

### 📓 Rocket Logger
Basic log handling with overrides for use within other modules.

---

## Get Started

[Node.js][node] is required, recommended with [Yarn][yarn] as a package manager.

Environment configs can be loaded from `.env` file or the server environment.
All configs used by Rocket Control packages use the `RC_` prefix.
e.g. for the default user. create a `.env` file with the following:

```
RC_USER="admin"
RC_PASS="pass"
```

See the README in each of the [package paths](https://github.com/Amazebot/rocket-control/tree/master/packages) for further usage instructions.

For more detail on how config is loaded, see the config utility [README][config].

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
- [ ] Generate changelog
