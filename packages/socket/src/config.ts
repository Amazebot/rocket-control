import { Config } from '@amazebot/config'

/** Rocket.Chat instance to connect to. e.g. from RC_URL */
export const instance = new Config({
  'url': {
    type: 'string',
    description: 'URL of the Rocket.Chat to connect to',
    default: 'localhost:3000'
  },
  'ssl': {
    type: 'boolean',
    description: 'Force connection to use SSL',
    default: false
  }
}, 'RC')

/** Rocket.Chat user credentials for socket connection. */
export const user = new Config({
  'username': {
    type: 'string',
    description: 'Username for account login',
    default: 'admin'
  },
  'password': {
    type: 'string',
    description: 'Password for account login',
    default: 'pass'
  },
  'auth': {
    type: 'string',
    description: 'Set to "ldap" to enable LDAP login'
  }
}, 'RC')

user.load()
instance.load()
