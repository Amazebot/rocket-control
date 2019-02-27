import { logger } from '@amazebot/logger'
import * as api from '@amazebot/rocket-rest'
import { Socket, Credentials, ISubscription } from '@amazebot/rocket-socket'
import { config } from './config'
import { Cache } from './cache'
import {
  IMessageCallback,
  IMessageSources,
  IMessage,
  IMessageMeta,
  IMessageReceipt
} from './interfaces'

/** Make sure configs initialised. */
config.load()

/** Interface alias for accepted content types to create message/s. */
export type IMessageContents = string | string[] | IMessage

/** Use class/interface merging for implicit properties. */
export interface Message extends IMessage {}

/** Rocket.Chat message class. */
export class Message implements IMessage {
  /**
   * Create message instance.
   * @param content Accepts message text or a preformed message object
   * @param rId Room ID allows overriding existing content property
   */
  constructor (content: string | IMessage, rId?: string) {
    if (typeof content === 'string') this.msg = content
    else Object.assign(this, content)
    if (rId) this.rid = rId
  }

  /** Set Room ID and return message */
  setRoomId (roomId: string) {
    this.rid = roomId
    return this
  }
}

/**
 * Driver is implemented by bots to provide high-level minimal coding interface
 * with Rocket.Chat subscriptions and method calls.
 */
export class Driver {
  logger = logger
  api = api
  socket = new Socket()
  cache = new Cache(this.socket)
  subscriptions: { [key: string]: ISubscription } = {}
  joined: string[] = [] // Array of joined room IDs
  id?: string
  username?: string

  /** Proxy for socket login method, but also joins configured rooms. */
  async login (credentials?: Credentials) {
    await this.socket.login(credentials)
    this.id = this.socket.user!.id
    this.username = this.socket.user!.username
    if (!this.username) {
      const { username } = await this.userById(this.id)
      this.username = username
    }
    await this.joinRooms(config.get('join').split(','))
    return this.id
  }

  /** Proxy for socket login method (which also unsubscribes to all). */
  logout () {
    return (this.socket.loggedIn)
      ? this.socket.logout().then(() => this.id = undefined)
      : Promise.resolve()
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
  async subscribe (
    stream: string = config.get('stream-name'),
    room: string = config.get('stream-room')
  ) {
    const key = `${stream}:${room}`
    if (this.subscriptions[key]) return this.subscriptions[key]
    if (!this.id) throw new Error('[driver] Login required before subscription')
    this.subscriptions[key] = await this.socket.subscribe(stream, [room, true], (e) => {
      logger.debug(`[bot] ${stream} event in ${room} collection: ${JSON.stringify(e)}`)
    })
    return this.subscriptions[key]
  }

  /** Get ignored message sources from options and config. */
  ignoreSources (enabledSources: IMessageSources = {}) {
    const toggleSources: IMessageSources = {}
    for (const key in enabledSources) toggleSources[key] = !enabledSources[key]
    return Object.assign({
      direct: config.get('ignore-direct'),
      livechat: config.get('ignore-livechat'),
      edited: config.get('ignore-edited')
    }, toggleSources)
  }

  /**
   * Add callback to aggregated message stream (ignoring disabled sources).
   * Always ignores it's own messages other than special type when adding users
   * to room, to allow triggering on enter callbacks.
   */
  async onMessage (callback: IMessageCallback, sources?: IMessageSources) {
    const subscription = await this.subscribe()
    const ignore = this.ignoreSources(sources)
    subscription.onEvent((e) => {
      try {
        const message: IMessage = e.fields.args[0]
        const meta: IMessageMeta = e.fields.args[1] || {}
        if (!message || !message._id) {
          callback(new Error('Message handler fired on event without message or meta data'))
        } else {
          const username = (message.u) ? message.u.username : 'unknown'
          if (
            (message.u && message.u._id === this.id && message.t !== 'au') ||
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
  joinRooms (rooms: string[] = []) {
    return Promise.all(rooms.map((room) => this.joinRoom(room)))
  }

  /** Leave a set of rooms by array of names or IDs */
  leaveRooms (rooms: string[] = this.joined) {
    return Promise.all(rooms.map((room) => this.leaveRoom(room)))
  }

  /** Structure message content, optionally addressing to room ID. */
  prepareMessage (content: string | IMessage, roomId?: string): Message {
    const integrationId = config.get('integration-id')
    const message = new Message(content, roomId)
    message.bot = { i: integrationId }
    return message
  }

  /** Send a prepared message object (with pre-defined room ID). */
  sendMessage (message: IMessage) {
    return this.asyncCall('sendMessage', message) as Promise<IMessageReceipt>
  }

  /** Send array of message objects. */
  async sendMessages (messages: IMessage[]) {
    const sent = []
    for (const message of messages) {
      const result = await this.sendMessage(message) as IMessageReceipt
      sent.push(result)
    }
    return sent
  }

  /**
   * Prepare and send string/s to specified room ID.
   * @param contents Accepts message text string or array of strings.
   * @param roomId  ID of the target room to use in send.
   */
  async sendToRoomId (contents: IMessageContents, roomId: string) {
    const messages = []
    if (!Array.isArray(contents)) {
      messages.push(this.prepareMessage(contents, roomId))
    } else {
      contents.map((text) => messages.push(this.prepareMessage(text, roomId)))
    }
    return this.sendMessages(messages)
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
   * @param shouldReact Sets a reaction state instead of using as toggle
   */
  setReaction (emoji: string, messageId: string, shouldReact?: boolean) {
    return this.asyncCall('setReaction', emoji, messageId, shouldReact)
  }

  /** Inform Rocket.Chat the current (bot) or another user is typing. */
  // userTyping (roomId: string, username?: string) {
  //   if (!username) username = this.username
  // }
}

export const driver = new Driver()

export default driver
