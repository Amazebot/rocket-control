import { logger } from '@amazebot/logger'
import * as api from '@amazebot/rocket-rest'
import { Socket, Credentials, ISubscription } from '@amazebot/rocket-socket'
import { config } from './config'
import { Cache } from './cache'
import {
  IMessageCallback,
  IMessageFilters,
  IMessage,
  IMessageMeta,
  IMessageReceipt
} from './interfaces'

<<<<<<< Updated upstream
=======
/** Make sure configs initialised. */
config.load()

/** Interface alias for accepted content types to create message/s. */
export type IMessageContents = string | string[] | IMessage

>>>>>>> Stashed changes
/** Use class/interface merging for implicit properties. */
export interface Message extends IMessage {}

/** Rocket.Chat message class. */
export class Message implements IMessage {
  /**
   * Create message instance.
   * @param content Accepts message text or a preformed message object
   * @param iId Integration ID for tracing source of automated sends
   * @param rId Room ID allows overriding existing content property
   */
  constructor (content: string | IMessage, iId?: string, rId?: string) {
    if (typeof content === 'string') this.msg = content
    else Object.assign(this, content)
    if (iId) this.bot = { i: iId }
    if (rId) this.rid = rId
  }
<<<<<<< Updated upstream
  /** Set Room ID and return message */
  setRoomId (roomId: string) {
    this.rid = roomId
    return this
  }
}

/** Interface alias for accepted content types to create message/s. */
export type IMessageContents = string | string[] | IMessage

=======
}

>>>>>>> Stashed changes
/**
 * Driver is implemented by bots to provide high-level minimal coding interface
 * with Rocket.Chat subscriptions and method calls.
 */
export class Driver {
  logger = logger
  api = api
  socket = new Socket()
  cache = new Cache(this.socket)
  id = config.get('integration-id')
  subscription: ISubscription | undefined
  joined: string[] = [] // Array of joined room IDs
  uId?: string
  username?: string

  /** Proxy for socket login method, but also joins configured rooms. */
<<<<<<< Updated upstream
  async login (credentials?: ddp.Credentials) {
    const result = await ddp.socket.login(credentials)
    this.uId = result.id
    this.username = result.username
=======
  async login (credentials?: Credentials) {
    await this.socket.login(credentials)
    this.uId = this.socket.user!.id
    this.username = this.socket.user!.username
>>>>>>> Stashed changes
    if (!this.username) {
      this.username = await this.userById(this.uId)
        .then((user) => user.username)
    }
<<<<<<< Updated upstream
    await this.joinRooms(config.get('join').split(','))
=======
    const rooms = (config.get('join'))
      ? config.get('join').split(',')
      : []
    if (rooms.length) await this.joinRooms(config.get('join').split(','))
>>>>>>> Stashed changes
    return this.uId
  }

  /** Proxy for socket login method (which also unsubscribes to all). */
  logout () {
<<<<<<< Updated upstream
    return ddp.socket.logout().then(() => this.uId = undefined)
=======
    return this.socket.logout().then(() => this.uId = undefined)
>>>>>>> Stashed changes
  }

  /** Setup caches for room lookup method results. */
  setupCache (): void {
    logger.debug('[driver] Setting up method catch')
    this.cache.create('getUserById', {
      max: config.get('user-cache-size'),
      maxAge: config.get('user-cache-age')
    })
    this.cache.create('getRoomIdByNameOrId', {
      max: config.get('room-cache-size'),
      maxAge: config.get('room-cache-age')
    }),
    this.cache.create('getRoomNameById', {
      max: config.get('room-cache-size'),
      maxAge: config.get('room-cache-age')
    })
    this.cache.create('createDirectMessage', {
      max: config.get('dm-cache-size'),
      maxAge: config.get('dm-cache-age')
    })
  }

  /** Subscribe to default "my messages" collection or other as given. */
  subscribe (
    stream: string = config.get('stream-name'),
    room: string = config.get('stream-room')
  ) {
    if (!this.uId) throw new Error('[driver] Login required before subscription')
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
            (message.u && message.u._id === this.uId) ||
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

  async userById (id: string) {
    const result = await this.callMethod('getFullUserData', { id, limit: 1 })
    if (result.length) return result[0]
  }

  /** Get ID for a room by name (or ID). */
  getRoomId (name: string) {
    return this.cacheCall('getRoomIdByNameOrId', name) as Promise<string>
  }

  /** Get name for a room by ID. */
  getRoomName (id: string) {
    return this.cacheCall('getRoomNameById', id) as Promise<string>
  }

  /**
   * Get ID for a DM room by its recipient's name.
   * Will create a DM (with the bot) if it doesn't exist already.
   */
  getDirectMessageRoomId (username: string) {
    return this.cacheCall('createDirectMessage', username)
      .then((DM) => DM.rid) as Promise<string>
  }

  /** Join the bot into a room by its name or ID */
  async joinRoom (room: string) {
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

  /** Structure message content, optionally addressing to room ID. */
  prepareMessage (content: string | IMessage, roomId?: string): Message {
    return new Message(content, this.id, roomId)
  }

  /** Send a prepared message object (with pre-defined room ID). */
  sendMessage (message: IMessage) {
    return (this.asyncCall('sendMessage', message) as Promise<IMessageReceipt>)
  }

  /**
   * Prepare and send string/s to specified room ID.
   * @param contents Accepts message text string or array of strings.
   * @param roomId  ID of the target room to use in send.
   */
  sendToRoomId (contents: IMessageContents, roomId: string) {
    let sends: Promise<IMessageReceipt>[] = []
    if (!Array.isArray(contents)) {
      sends.push(this.sendMessage(this.prepareMessage(contents, roomId)))
    } else {
      sends = contents.map((text) => {
        return this.sendMessage(this.prepareMessage(text, roomId))
      })
    }
    return Promise.all(sends)
  }

  /**
   * Prepare and send string/s to specified room name (or ID).
   * @param contents Accepts message text string or array of strings.
   * @param room    A name (or ID) to resolve as ID to use in send.
   */
  sendToRoom (contents: IMessageContents, room: string) {
    return this.getRoomId(room)
      .then((roomId) => this.sendToRoomId(contents, roomId))
  }

  /**
   * Prepare and send string/s to a user in a DM.
   * @param content   Accepts message text string or array of strings.
   * @param username  Name to create (or get) DM for room ID to use in send.
   */
  sendDirectToUser (content: IMessageContents, username: string) {
    return this.getDirectMessageRoomId(username)
      .then((roomId) => this.sendToRoomId(content, roomId))
  }

  /**
   * Edit an existing message, replacing any attributes with those provided.
   * The given message object should have the ID of an existing message.
   */
  editMessage (message: IMessage) {
    return this.asyncCall('updateMessage', message) as Promise<IMessage>
  }

  /**
   * Send a reaction to an existing message. Simple proxy for method call.
   * @param emoji     Accepts string like `:thumbsup:` to add 👍 reaction
   * @param messageId ID for a previously sent message
   */
  setReaction (emoji: string, messageId: string) {
    return this.asyncCall('setReaction', [emoji, messageId])
  }

  /** Inform Rocket.Chat the current (bot) or another user is typing. */
  // userTyping (roomId: string, username?: string) {
  //   if (!username) username = this.username
  // }
}

export const driver = new Driver()

export default driver
