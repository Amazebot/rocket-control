import { Config } from '@amazebot/config'

/** Rocket.Chat instance to connect to. e.g. from RC_URL */
export const config = new Config({
  'integration-id': {
    type: 'string',
    description: 'Applied as `bot.i` attribute on sent messages',
    default: 'rc-bot'
  },
  'join': {
    type: 'string',
    description: 'CSV of room names or IDs to join on login',
    default: 'GENERAL'
  },
  'stream-name': {
    type: 'string',
    description: 'Stream name to subscribe to for messages',
    default: 'stream-room-messages'
  },
  'stream-room': {
    type: 'string',
    description: 'Stream room or collection for subscription parameters',
    default: '__my_messages__'
  },
  'room-cache-size': {
    type: 'number',
    description: 'Amount of room lookups to keep in cache (0 is infinite)',
    default: 99
  },
  'room-cache-age': {
    type: 'number',
    description: 'Milliseconds to keep room lookups in cache',
    default: 1000 * 60 * 60
  },
  'dm-cache-size': {
    type: 'number',
    description: 'Amount of DM room lookups to keep in cache (0 is infinite)',
    default: 99
  },
  'dm-cache-age': {
    type: 'number',
    description: 'Milliseconds to keep DM room lookups in cache',
    default: 1000 * 60 * 60 * 24
  },
  'ignore-direct': {
    type: 'boolean',
    description: 'Filter direct messages out of aggregated event stream.',
    default: false
  },
  'ignore-livechat': {
    type: 'boolean',
    description: 'Filter livechat messages out of aggregated event stream.',
    default: false
  },
  'ignore-edited': {
    type: 'boolean',
    description: 'Filter edited messages out of aggregated event stream.',
    default: false
  }
}, 'RC')
