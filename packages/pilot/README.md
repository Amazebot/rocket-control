[dotenv]: https://github.com/motdotla/dotenv
[yargs]: https://yargs.js.org/

# 👨‍✈️ Rocket Pilot
Centralised Rocket.Chat user credentials and connection settings.
---

## Configuration

### Load

Pilot loads configuration for a default Rocket.Chat host and user from a range
of optional sources:
  - Command line args
  - Local `.env` file
  - Environment variables
  - Package JSON `'rcConfig': {}`
  - `rc-config.json` file

```
import * as pilot from '@amazebot/rocket-pilot'
pilot.instance.load()
pilot.user.load()
```

Configs in the `.env` file or host environment must use the prefix `RC_`.

Command line arguments use hyphenated names, JSON settings use camel case and
environment variables use all caps with underscore separators and prefix.

## Instances

| Env var                | Description                                         |
| ---------------------- | ----------------------------------------------------|
| `RC_URL`               | URL of the Rocket.Chat to connect to                |
| `RC_SSL`               | Force connection to use SSL (default false)         |

### Load settings for the default instance

```
import * as pilot from '@amazebot/rocket-pilot'
const instance = pilot.instance.load() // same as pilot.instance.load('default')
console.log(instance.url)
```

`pilot.instance.load()` will load any default instance from:
- env `RC_URL="my.chat"`
- cli `--rc-url 'my.chat'`
- package.json `rcConfig: { url: 'my.chat' }`

### Load additional instance settings by key

```
import * as pilot from '@amazebot/rocket-pilot'
const prod = pilot.instance.key('production').load()
console.log(prod.url) // my.chat
```

`pilot.instance.key('production').load()` loads from prefixed vars:
- env `RC_PRODUCTION_URL="my.chat"`
- cli `--rc-production-url my.chat`
- package json `rcConfig: { productionUrl: 'my.chat' }`

### Set and get after load

For default instance:

```
pilot.instance.set('url', 'my.chat')
pilot.instance.get('url') // my.chat
```

For instance by named key:

```
pilot.instance.key('production').set('url', 'my.chat')
pilot.instance.key('production').get('url') // my.chat
```

## Users

| Env var                | Description                                         |
| ---------------------- | ----------------------------------------------------|
| `RC_USERNAME`          | Username for account login                          |
| `RC_PASSWORD`          | Password for account login                          |
| `RC_AUTH`              | Set to 'ldap' to enable LDAP login                  |

Load/get/set user settings exactly as above, except via the `.user` property
instead of `.instance`. Examples below:

`pilot.user.load()` loads default user settings from:
- env `RC_USERNAME` / `RC_PASSWORD`
- cli `--username` / `--password`
- package.json `rcConfig: { username: 'name', password: '****' }`

`pilot.user.get('username')` will return the default user's username.

`pilot.user.key('admin').load()` will load `RC_ADMIN_USERNAME` etc.

`pilot.user.key('admin').get('admin')` will return the settings loaded above.

### Extend Options

Extending triggers load again with additional defined settings.

```
import * as pilot from '@amazebot/rocket-pilot'
pilot.instance.extend({
  'my-setting': {
    type: 'boolean',
    description: 'toggle enabling of widget',
    default: false
  }
})
console.log(pilot.config.mySetting) // loaded settings
```

All Loaded settings are kept under their camel case variant, so the example
above could load from any of the following:
- **CLI** arg `my-setting`
- **JSON** att `mySetting`
- **ENV** var `RC_MY_SETTING`

To extend the settings specific to users and instances, use `pilot.user.extend`
and `pilot.instance.extend` respectively.

This is useful for modules using pilot to provide settings for custom behaviour.
Under the hood pilot uses [.ENV][dotenv] and [Yargs][yargs]. See those projects
for more detail on how configs are loaded and options declared.