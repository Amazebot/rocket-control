import { logger } from '@amazebot/logger'
import * as api from '@amazebot/rocket-rest'
import * as ddp from '@amazebot/rocket-socket'
import { config } from './config'
import { Cache } from './cache'
import {
  IMessageCallback,
  IMessageFilters,
  IMessage,
  IMessageMeta
} from './interfaces'

/**
 * Driver is implemented by bots to provide high-level minimal coding interface
 * with Rocket.Chat subscriptions and method calls.
 */
export class Driver {
  logger = logger
  api = api
  socket = new ddp.Socket()
  cache = new Cache(this.socket)
  id = config.get('integration-id')
  subscription: ddp.ISubscription | undefined
  joined: string[] = [] // Array of joined room IDs
  uid?: string

  /** Proxy for socket login method, but also joins configured rooms. */
  async login (credentials: ddp.Credentials) {
    this.uid = (await ddp.socket.login(credentials)).id
    await this.joinRooms(config.get('join').split(','))
    return this.uid
  }

  /** Proxy for socket login method (which also unsubscribes to all). */
  logout () {
    return ddp.socket.logout().then(() => this.uid = undefined)
  }

  /** Setup caches for room lookup method results. */
  setupCache (): void {
    logger.debug('[driver] Setting up method catch')
    this.cache.create('getRoomIdByNameOrId', {
      max: config.get('room-cache-max-size'),
      maxAge: config.get('room-cache-max-age')
    }),
    this.cache.create('getRoomNameById', {
      max: config.get('room-cache-max-size'),
      maxAge: config.get('room-cache-max-age')
    })
    this.cache.create('createDirectMessage', {
      max: config.get('dm-cache-max-size'),
      maxAge: config.get('dm-cache-max-age')
    })
  }

  /** Subscribe to default "my messages" collection or other as given. */
  subscribe (
    stream: string = config.get('stream-name'),
    room: string = config.get('stream-room')
  ) {
    if (!this.uid) throw new Error('[driver] Login required before subscription')
    return this.socket.subscribe(stream, [room, true], (e) => {
      logger.debug(`[bot] ${stream} event in ${room} collection: ${JSON.stringify(e)}`)
    })
  }

  /** Add callback to aggregated message stream (ignoring filtered sources). */
  async onMessage (callback: IMessageCallback, filters: IMessageFilters = {}) {
    if (!this.subscription) this.subscription = await this.subscribe()
    const ignore = (Object.assign({
      direct: config.get('ignore-direct'),
      livechat: config.get('ignore-livechat'),
      edited: config.get('ignore-edited')
    }, filters))
    this.subscription.onEvent((e) => {
      try {
        const message: IMessage = e.fields.args[0]
        const meta: IMessageMeta = e.fields.args[1] || {}
        if (!message || !message._id) {
          callback(new Error('Message handler fired on event without message or meta data'))
        } else {
          const username = (message.u) ? message.u.username : 'unknown'
          if (
            (message.u && message.u._id === this.uid) ||
            (meta.roomType === 'd' && ignore.direct) ||
            (meta.roomType === 'l' && ignore.livechat) ||
            (typeof message.editedAt !== 'undefined' && ignore.edited)
          ) {
            logger.debug(`[driver] Message ${message._id} ignored by filters`)
          } else {
            logger.info(`[driver] Message ${message._id} received from ${username}`)
            callback(null, message, meta)
          }
        }
      } catch (err) {
        logger.error(`[driver] Message handler err: ${err.message}`)
        callback(err)
      }
    })
  }

  /**
   * Wraps method calls to ensure they return a promise with caught exceptions.
   * @param method The Rocket.Chat server method, to call through socket
   * @param params Single or array of parameters of the method to call
   */
  asyncCall (method: string, ...params: any[]) {
    logger.debug(`[driver] Call ${method} Calling (async): ${JSON.stringify(params)}`)
    return this.socket.call(method, ...params)
  }

  /**
   * Wraps socket method calls, passed through method cache if cache is valid.
   * @param method The Rocket.Chat server method, to call through socket
   * @param key Single string parameters only, required to use as cache key
   */
  cacheCall (method: string, key: string): Promise<any> {
    logger.debug(`[driver] returning cached result for ${method}(${key})`)
    return this.cache.call(method, key)
  }

  /**
   * Call a method as async via socket, or through cache if one is created.
   * If the method doesn't have or need parameters, it can't use them for caching
   * so it will always call asynchronously.
   * @param method The Rocket.Chat server method to call
   * @param params Single or array of parameters of the method to call
   */
  callMethod (method: string, ...params: any[]): Promise<any> {
    const result = (this.cache.has(method) && typeof params[0] !== 'undefined')
      ? this.cacheCall(method, params[0])
      : this.asyncCall(method, ...params)
    return result
      .catch((err: Error) => {
        logger.error(`[driver] Call ${method} error:`, err)
        throw err // throw after log to stop async chain
      })
      .then((result: any) => {
        (result)
          ? logger.debug(`[driver] Call ${method} success: ${JSON.stringify(result)}`)
          : logger.debug(`[driver] Call ${method} success`)
        return result
      })
  }

  /** Get ID for a room by name (or ID). */
  getRoomId (name: string): Promise<string> {
    return this.cacheCall('getRoomIdByNameOrId', name)
  }

  /** Get name for a room by ID. */
  getRoomName (id: string): Promise<string> {
    return this.cacheCall('getRoomNameById', id)
  }

  /**
   * Get ID for a DM room by its recipient's name.
   * Will create a DM (with the bot) if it doesn't exist already.
   */
  getDirectMessageRoomId (username: string): Promise<string> {
    return this.cacheCall('createDirectMessage', username).then((DM) => DM.rid)
  }

  /** Join the bot into a room by its name or ID */
  async joinRoom (room: string): Promise<void> {
    let roomId = await this.getRoomId(room)
    let joinedIndex = this.joined.indexOf(roomId)
    if (joinedIndex !== -1) {
      logger.error(`[driver] Join room failed, already joined`)
    } else {
      await this.asyncCall('joinRoom', roomId)
        .catch((err) => logger.error(`[driver] Join room failed, ${err.reason}`))
      this.joined.push(roomId)
    }
  }

  /** Exit a room the bot has joined */
  async leaveRoom (room: string) {
    let roomId = await this.getRoomId(room)
    let joinedIndex = this.joined.indexOf(roomId)
    if (joinedIndex === -1) delete this.joined[joinedIndex]
    return this.asyncCall('leaveRoom', roomId)
      .catch((err) => logger.error(`[driver] Leave room failed, ${err.reason}`))
  }

  /** Join a set of rooms by array of names or IDs */
  joinRooms (rooms: string[]) {
    return Promise.all(rooms.map((room) => this.joinRoom(room)))
  }

  /** Leave a set of rooms by array of names or IDs */
  leaveRooms (rooms: string[] = this.joined) {
    return Promise.all(rooms.map((room) => this.leaveRoom(room)))
  }

  /**
   * Structure message content, optionally addressing to room ID.
   * Accepts message text string or a structured message object.
   */
  export function prepareMessage (
    content: string | IMessage,
    roomId?: string
  ): Message {
    const message = new Message(content, integrationId)
    if (roomId) message.setRoomId(roomId)
    return message
  }

  /**
   * Send a prepared message object (with pre-defined room ID).
   * Usually prepared and called by sendMessageByRoomId or sendMessageByRoom.
   */
  export function sendMessage (message: IMessage) {
    return (asyncCall('sendMessage', message) as Promise<IMessageReceipt>)
  }

  /**
   * Prepare and send string/s to specified room ID.
   * @param content Accepts message text string or array of strings.
   * @param roomId  ID of the target room to use in send.
   * @todo Returning one or many gets complicated with type checking not allowing
   *       use of a property because result may be array, when you know it's not.
   *       Solution would probably be to always return an array, even for single
   *       send. This would be a breaking change, should hold until major version.
   */
  export function sendToRoomId (
    content: string | string[] | IMessage,
    roomId: string
  ): Promise<IMessageReceipt[] | IMessageReceipt> {
    if (!Array.isArray(content)) {
      return sendMessage(prepareMessage(content, roomId))
    } else {
      return Promise.all(content.map((text) => {
        return sendMessage(prepareMessage(text, roomId))
      }))
    }
  }

  /**
   * Prepare and send string/s to specified room name (or ID).
   * @param content Accepts message text string or array of strings.
   * @param room    A name (or ID) to resolve as ID to use in send.
   */
  export function sendToRoom (
    content: string | string[] | IMessage,
    room: string
  ): Promise<IMessageReceipt[] | IMessageReceipt> {
    return getRoomId(room)
      .then((roomId) => sendToRoomId(content, roomId))
  }

  /**
   * Prepare and send string/s to a user in a DM.
   * @param content   Accepts message text string or array of strings.
   * @param username  Name to create (or get) DM for room ID to use in send.
   */
  export function sendDirectToUser (
    content: string | string[] | IMessage,
    username: string
  ): Promise<IMessageReceipt[] | IMessageReceipt> {
    return getDirectMessageRoomId(username)
      .then((rid) => sendToRoomId(content, rid))
  }

  /**
   * Edit an existing message, replacing any attributes with those provided.
   * The given message object should have the ID of an existing message.
   */
  export function editMessage (message: IMessage): Promise<IMessage> {
    return asyncCall('updateMessage', message)
  }

  /**
   * Send a reaction to an existing message. Simple proxy for method call.
   * @param emoji     Accepts string like `:thumbsup:` to add 👍 reaction
   * @param messageId ID for a previously sent message
   */
  export function setReaction (emoji: string, messageId: string) {
    return asyncCall('setReaction', [emoji, messageId])
  }
}

export const driver = new Driver()

export default driver
