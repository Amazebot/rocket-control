import * as LRU from 'lru-cache'
import { logger } from '@amazebot/logger'
import { Socket } from '@amazebot/rocket-socket'

/** Collection of result caches for socket method calls. */
export class Cache {
  socket?: Socket
  results: Map<string, LRU.Cache<string, any>> = new Map()
  defaults: LRU.Options = { max: 100, maxAge: 300 * 1000 }

  /** Create a cache collection and set up to use socket if given. */
  constructor (useSocket?: Socket) {
    if (useSocket) this.use(useSocket)
  }

  /** Set the socket to call methods on (via socket), with cached results. */
  use (useSocket: Socket) {
    this.socket = useSocket
    return this
  }

  /**
   * Proxy for checking if method has been cached.
   * Cache may exist from manual creation, or prior call.
   * @param method Method name for cache to get
   */
  has (method: string) {
    return this.results.has(method)
  }

  /**
   * Setup a cache for a method call.
   * @param method Method name, for index of cached results
   * @param options.max Maximum size of cache
   * @param options.maxAge Maximum age of cache
   */
  create (method: string, options: LRU.Options = {}) {
    options = Object.assign(this.defaults, options)
    this.results.set(method, new LRU(options))
    return this.results.get(method)
  }

  /**
   * Get results of a prior method call or call and cache.
   * @param method Method name, to call on instance in use
   * @param key Key to pass to method call and save results against
   */
  async call (method: string, key: string) {
    if (!this.socket) return logger.error('Cache called before used with socket.')
    if (!this.results.has(method)) this.create(method) // create as needed
    const methodCache = this.results.get(method)!
    if (methodCache.has(key)) {
      logger.debug(`[cache] Returning cached ${method}(${key})`)
      // return from cache if key has been used on method before
      return methodCache.get(key)
    }
    // call and cache for next time, returning results
    logger.debug(`[${method}] Caching new results of ${method}(${key})`)
    const result = await Promise.resolve(this.socket.call(method, key))
    methodCache.set(key, result)
    return result
  }

  /**
   * Get results of a prior method call.
   * @param method Method name for cache to get
   * @param key Key for method result set to return
   */
  get (method: string, key: string) {
    if (this.results.has(method)) return this.results.get(method)!.get(key)
  }

  /**
   * Reset a cached method call's results (all or only for given key).
   * @param method Method name for cache to clear
   * @param key Key for method result set to clear
   */
  reset (method: string, key?: string) {
    if (this.results.has(method)) {
      if (key) return this.results.get(method)!.del(key)
      else return this.results.get(method)!.reset()
    }
  }

  /** Reset cached results for all methods. */
  resetAll () {
    this.results.forEach((cache) => cache.reset())
  }
}

const cache = new Cache()

export default cache
