import * as WebSocket from 'ws'
import { createHash } from 'crypto'
import { logger } from '@amazebot/logger'
import {
  IOptions,
  ISubscription,
  ICallback,
  IHandler,
  Credentials,
  ILoginResult,
  isLoginBasic,
  isLoginPass,
  isLoginOAuth,
  isLoginAuthenticated,
  isLoginResult,
  hostToWS,
  user,
  instance
} from '.'

/** Debounce for reconnection on close. */
export function debounce<F extends (...params: any[]) => void> (fn: F, delay: number) {
  let timeoutID: NodeJS.Timer | null = null
  return function (this: any, ...args: any[]) {
    if (timeoutID) clearTimeout(timeoutID)
    timeoutID = setTimeout(() => fn.apply(this, args), delay)
  } as F
}

/**
 * Websocket handler class, manages connections and subscriptions.
 * Sends request messages to host, binding their response to async resolution.
 */
export class Socket {
  /** Config stores options merged with loaded settings. */
  config: IOptions
  /** Counter for sent messages (any request to socket). */
  sent = 0
  /** URL and port to connect to. */
  host: string
  /** Timestamp of last ping sent to host. */
  lastPing = Date.now()
  /** Collection of created subscriptions. */
  subscriptions: { [id: string]: ISubscription } = {}
  /** Handlers for incoming messages. */
  handlers: IHandler[] = []
  /** Timeout for waiting for socket to open. */
  openTimeout?: NodeJS.Timer
  /** Timeout for waiting for socket to re-open. */
  reopenInterval?: NodeJS.Timer
  /** Timeout between ping. */
  pingTimeout?: NodeJS.Timer
  /** Web Socket connection instance. */
  connection?: WebSocket
  /** Session ID from Realtime API. */
  session?: string
  /** Last used credentials, to avoid re-logging in with same account. */
  credentials?: Credentials
  /** Keep logged in user. */
  user?: { id: string, username?: string }

  constructor (
    options?: IOptions | any,
    public resume: ILoginResult | null = null
  ) {
    const host = instance.get('url')
    const ssl = host.toLowerCase().startsWith('https') || instance.get('ssl')
    const reopen = 20 * 1000 // 20 second connection attempts
    const ping = 2 * 1000 // 2 second keep-alive ping
    this.config = Object.assign({ host, ssl, reopen, ping }, options)
    this.host = `${hostToWS(this.config.host, this.config.useSsl)}/websocket`
  }

  /**
   * Open websocket connection, with optional retry interval.
   * Stores connection, setting up handlers for open/close/message events.
   * Resumes login if given token.
   */
  open (ms: number = this.config.reopen) {
    if (this.connected) return Promise.resolve()
    return new Promise(async (resolve, reject) => {
      let connection: WebSocket
      this.lastPing = Date.now()
      await this.close()
      if (this.reopenInterval) clearInterval(this.reopenInterval)
      this.reopenInterval = setInterval(() => {
        return !this.alive() && this.reopen()
      }, ms)
      try {
        connection = new WebSocket(this.host)
        connection.onerror = reject
      } catch (err) {
        return reject(err)
      }
      this.connection = connection
      this.connection.onmessage = this.onMessage.bind(this)
      this.connection.onopen = this.onOpen.bind(this, resolve)
    })
  }

  /** Send handshake message to confirm connection, start pinging. */
  async onOpen (callback: Function) {
    const connected = await this.send({
      msg: 'connect',
      version: '1',
      support: ['1', 'pre2', 'pre1']
    }, 'connected')
    this.session = connected.session
    this.ping().catch((err) => logger.error(`[socket] Unable to ping server: ${err.message}`))
    if (this.resume) await this.login(this.resume)
    return callback(this.connection)
  }

  /** Re-open if it wasn't closed purposely */
  onClose (e: any) {
    if (e.code !== 1000) return debounce(this.reopen.bind(this, e.reason), 100)
  }

  /**
   * Find and call matching handlers for incoming message data.
   * Handlers match on collection, id and/or msg attribute in that order.
   * Any matched handlers are removed once called.
   */
  onMessage (e: any) {
    const data = (e.data) ? JSON.parse(e.data) : undefined

    // 👇 toggle comment to enable logging data for debugging missing responses
    // console.log(require('util').inspect({ data }, { depth: 4 }))

    if (!data) return logger.error(`[socket] JSON parse error: ${e.message}`)
    const handlers = []
    const matcher = (handler: IHandler) => {
      return ((
        (data.collection && handler.collection === data.collection)
      ) || (
        (data.msg && handler.msg === data.msg) &&
        (!handler.id || !data.id || handler.id === data.id)
      ))
    }
    // tslint:disable-next-line
    for (let i = 0; i < this.handlers.length; i++) {
      if (matcher(this.handlers[i])) {
        handlers.push(this.handlers[i])
        if (!this.handlers[i].persist) {
          this.handlers.splice(i, 1)
          i--
        }
      }
    }
    for (let handler of handlers) handler.callback(data)
  }

  /** Disconnect the DDP from server and clear all subscriptions. */
  async close () {
    if (this.connected) {
      delete this.lastPing
      await this.unsubscribeAll()
      await new Promise((resolve) => {
        this.connection!.onclose = (e: any) => {
          delete this.connection
          this.onClose(e)
          resolve()
        }
        this.connection!.close(1000, 'disconnect')
      })
    }
  }

  /** Clear connection and try to connect again. */
  async reopen (reason?: string) {
    if (reason) logger.debug(`[socket] Reopen due to ${reason}`)
    if (this.openTimeout) return
    await this.close()
    this.openTimeout = setTimeout(async () => {
      delete this.openTimeout
      await this.open()
        .catch((err) => logger.error(`[socket] Reopen error: ${err.message}`))
    }, this.config.reopen)
  }

  /** Check if websocket connected and ready. */
  get connected () {
    return (
      this.connection &&
      this.connection.readyState === 1 &&
      this.alive()
    )
  }

  /** Check if connected and logged in */
  get loggedIn () {
    return (this.connected && !!this.resume)
  }

  /**
   * Send an object to the server via Socket. Adds handler to collection to
   * allow awaiting response matching an expected object. Most responses are
   * identified by their message event name and the ID they were sent with, but
   * some responses don't return the ID fallback to just matching on event name.
   * Data often includes an error attribute if something went wrong, but certain
   * types of calls send back a different `msg` value instead, e.g. `nosub`.
   * @param obj       Object to be sent
   * @param msg       The `data.msg` value to wait for in response
   * @param errorMsg  An alternate `data.msg` value indicating an error response
   */
  async send (
      obj: any,
      msg: boolean | string = 'result',
      errorMsg?: string
    ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.sent += 1
      const id = obj.id || `ddp-${ this.sent }`
      if (!this.connection) throw new Error('[socket] sending without open connection')
      this.connection.send(JSON.stringify({ ...obj, id }))
      if (typeof msg === 'string') {
        this.handlers.push({ id, msg, callback: (data) => (data.error)
          ? reject(data.error)
          : resolve(data)
        })
      }
      if (errorMsg) {
        this.handlers.push({ id, msg: errorMsg, callback: reject })
      }
    })
  }

  /** Send ping, record time, re-open if nothing comes back, repeat */
  async ping () {
    this.pingTimeout = setTimeout(() => {
      this.send({ msg: 'ping' }, 'pong')
        .then(() => {
          this.lastPing = Date.now()
          return this.ping()
        })
        .catch(() => this.reopen())
    }, this.config.ping)
  }

  /** Check if ping-pong to server is within tolerance of 1 missed ping */
  alive () {
    if (!this.lastPing) return false
    return (Date.now() - this.lastPing <= this.config.ping * 2)
  }

  /**
   * Calls a method on the server and returns a promise resolved with the result
   * if the method had or was meant to have a result (may be undefined).
   * @param method    The name of the method to be called
   * @param params    An array with the parameters to be sent
   */
  async call (method: string, ...params: any[]) {
    const response = await this.send({ msg: 'method', method, params })
      .catch((err) => {
        logger.error(`[socket] Call error: ${err.message}`)
        throw err
      })
    return (response.result || response.msg === 'result')
      ? response.result
      : response
  }

  /**
   * Login to server and resubscribe to all subs, resolve with user information.
   * @param credentials User credentials (username/password, oauth or token)
   */
  async login (credentials?: Credentials) {
    if (!this.connected) await this.open()
    credentials = this.loginParams(credentials)
    if (
      this.loggedIn
      && this.resume
      && JSON.stringify(credentials) === JSON.stringify(this.credentials)
    ) return this.resume
    const result = await this.call('login', credentials)
    this.credentials = credentials
    this.resume = (result as ILoginResult)
    this.user = { id: this.resume.id }
    if (isLoginBasic(credentials)) this.user.username = credentials.username
    else if (isLoginPass(credentials)) this.user.username = credentials.user.username
    await this.subscribeAll()
    return this.resume
  }

  /**
   * Take variety of login credentials object types for accepted params.
   * Uses loaded defaults if no credentials provided.
   */
  loginParams (credentials?: Credentials) {
    if (
      isLoginPass(credentials) ||
      isLoginOAuth(credentials) ||
      isLoginAuthenticated(credentials)
    ) {
      return credentials
    }
    if (isLoginResult(credentials)) {
      return { resume: credentials.token }
    }
    if (typeof credentials === 'undefined') {
      credentials = {
        username: user.get('username'),
        password: user.get('password')
      } // populate with defaults
    }
    if (isLoginBasic(credentials)) {
      return {
        user: { username: credentials.username },
        password: {
          digest: createHash('sha256').update(credentials.password).digest('hex'),
          algorithm: 'sha-256'
        }
      }
    }
  }

  /** Logout the current User from the server via Socket. */
  logout () {
    this.resume = null
    if (this.user) delete this.user
    return this.unsubscribeAll()
      .then(() => this.call('logout'))
  }

  /** Register a callback to trigger on message events in subscription */
  onEvent (id: string, collection: string, callback: ICallback) {
    this.handlers.push({ id, collection, persist: true, callback })
  }

  /**
   * Subscribe to a stream on server via socket and returns a promise resolved
   * with the subscription object when the subscription is ready.
   * @param name      Stream name to subscribe to
   * @param params    Params sent to the subscription request
   */
  subscribe (name: string, params: any[], callback?: ICallback) {
    logger.info(`[socket] Subscribe to ${name}, param: ${JSON.stringify(params)}`)
    return this.send({ msg: 'sub', name, params }, 'ready')
      .then((result) => {
        const id = (result.subs) ? result.subs[0] : undefined
        const unsubscribe = this.unsubscribe.bind(this, id)
        const onEvent = this.onEvent.bind(this, id, name)
        const subscription = { id, name, params, unsubscribe, onEvent }
        if (callback) subscription.onEvent(callback)
        this.subscriptions[id] = subscription
        return subscription
      })
      .catch((err) => {
        logger.error(`[socket] Subscribe error: ${err.message}`)
        throw err
      })
  }

  /** Subscribe to all pre-configured streams (e.g. on login resume) */
  subscribeAll () {
    const subscriptions = Object.keys(this.subscriptions || {}).map((key) => {
      const { name, params } = this.subscriptions[key]
      return this.subscribe(name, params)
    })
    return Promise.all(subscriptions)
  }

  /** Unsubscribe to server stream, resolve with unsubscribe request result */
  unsubscribe (id: any) {
    if (!this.subscriptions[id]) return Promise.resolve()
    delete this.subscriptions[id]
    return this.send({ msg: 'unsub', id }, 'result', 'nosub')
      .then((data: any) => data.result || data.subs)
      .catch((err) => {
        if (!err.msg && err.msg !== 'nosub') {
          logger.error(`[socket] Unsubscribe error: ${err.message}`)
          throw err
        }
      })
  }

  /** Unsubscribe from all active subscriptions and reset collection */
  unsubscribeAll () {
    const unsubAll = Object.keys(this.subscriptions).map((id) => {
      return this.subscriptions[id].unsubscribe()
    })
    return Promise.all(unsubAll)
      .then(() => this.subscriptions = {})
  }
}

/** Socket connection instance can be shared by multiple imports. */
export const socket = new Socket()

export default socket
