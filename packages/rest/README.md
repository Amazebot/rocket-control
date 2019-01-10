[control]: https://github.com/Amazebot/rocket-control
[config]: https://github.com/Amazebot/rocket-control#config
[axios]: https://github.com/axios/axios
[rest-docs]: https://rocket.chat/docs/developer-guides/rest-api/

# 🛏️ Rocket Rest
Simple helpers for calling Rocket.Chat REST API endpoints.

---

### Usage

See the main [Rocket Control README][control] for general configuration.

See [Rocket.Chat's REST API docs][rest-docs] for specific endpoint requirements.

Install the package.

```sh
yarn add @amazebot/rocket-rest
```

Import the API helpers.

Typescript / Babel:
```ts
import * as API from '@amazebot/rocket-rest'
```

Javascript
```js
const API = require('@amazebot/rocket-rest')
```

#### `.client([host])`

Defines the URL for subsequent API requests. Returns an [Axios][axios] client.

API requests can be sent without an explicit connection, using the environment
defaults from [environment configs][config]. It is called implicitly by all
requests, so it only needs to be called explicitly to set a new host, or one
that's different from the env defaults.

```ts
const local = await API.get('channels.list') // env url (default localhost)
API.client('https://my.live.server') // changes target of following requests
const live = await API.get('channels.list') // will request from my.live.server
```

#### `.login([credentials])` and `.logout()`

Login is required before making requests to any endpoints that need
authorisation. Refer to the [Rest API docs][rest-docs], but most do.

Credentials object can be undefined or: `{ username: string, password: string }`

Login without credentials will use defaults from [environment configs][config].

```ts
API.login({ username: 'admin', password: 'pass' })
```

#### `.loggedIn`

Property contains a boolean of the login status.

#### `.request(method, endpoint[, data, auth, ignore])`

Make a request to your Rocket.Chat instance API.

**Endpoint** appended to the client URL, with `/api/v1` included.
**Method** can be `'POST' | 'GET' | 'PUT' | 'DELETE'`
**Data** can be an object to post or convert to query params for get requests.
**Auth** is a boolean to set if the endpoint requires auth (default true).
**Ignore** optional RegExp for expected error messages to prevent throwing.

```ts
// basic server info does not require auth
await API.request('GET', 'info', {}, false)

// get auth and request user list with query params
await API.login()
const users = await API.request('GET', 'users.list', {
  fields: { 'username': 1 },
  query: { type: { $in: ['user'] } }
})
```

#### `.get(endpoint[, data, auth, ignore])`

Proxy for `.request('GET', ...arguments)`

#### `.post(endpoint[, data, auth, ignore])`

Proxy for `.request('POST', ...arguments)`

#### `.put(endpoint[, data, auth, ignore])`

Proxy for `.request('PUT', ...arguments)`

#### `.del(endpoint[, data, auth, ignore])`

Proxy for `.request('DELETE', ...arguments)`
