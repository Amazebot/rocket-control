import { Collection } from './collection'

/** Defines user and instance settings collections. */
export class Pilot {
  instance = new Collection({
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
  })
  user = new Collection({
    'user': {
      type: 'string',
      description: 'Username for account login',
      default: 'admin'
    },
    'pass': {
      type: 'string',
      description: 'Password for account login',
      default: 'pass'
    },
    'auth': {
      type: 'string',
      description: 'Set to "ldap" to enable LDAP login'
    }
  })
}

export const pilot = new Pilot()
