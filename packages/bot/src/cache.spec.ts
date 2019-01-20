import 'mocha'
import { expect } from 'chai'
import * as sinon from 'sinon'
import { silence } from '@amazebot/logger'
import { Cache } from './cache'
import { Socket } from '@amazebot/rocket-socket'

// Instance method variance for testing cache
const mockSocket = sinon.createStubInstance(Socket)
mockSocket.call.withArgs('methodOne').onCall(0).resolves({ result: 'foo' })
mockSocket.call.withArgs('methodOne').onCall(1).resolves({ result: 'bar' })
mockSocket.call.withArgs('methodTwo', 'key1').resolves({ result: 'value1' })
mockSocket.call.withArgs('methodTwo', 'key2').resolves({ result: 'value2' })

silence() // suppress log during tests (disable this while developing tests)

describe('cache', () => {
  describe('.use', () => {
    it('calls apply to instance', async () => {
      const cache = new Cache()
      cache.use(mockSocket)
      await cache.call('methodOne', 'key1')
      expect(mockSocket.call.callCount).to.equal(1)
    })
  })
  describe('.create', () => {
    it('accepts options overriding defaults', () => {
      const cache = new Cache()
      const methodCache = cache.create('methodOne', { maxAge: 3000 })!
      expect(methodCache.max).to.equal(cache.defaults.max)
      expect(methodCache.maxAge).to.equal(3000)
    })
  })
  describe('.call', () => {
    it('throws if instance not in use', () => {
      const cache = new Cache()
      cache.call('methodOne', 'key1')
        .then(() => { throw new Error('was not supposed to succeed') })
        .catch((e) => { expect(e).to.be.instanceof(Error) })
    })
    it('throws if method does not exist', () => {
      const cache = new Cache()
      cache.use(mockSocket)
      cache.call('bad', 'key1')
        .then(() => { throw new Error('was not supposed to succeed') })
        .catch((e) => { expect(e).to.be.instanceof(Error) })
    })
    it('returns a promise', () => {
      const cache = new Cache()
      cache.use(mockSocket)
      expect(cache.call('methodOne', 'key1').then).to.be.a('function')
    })
    it('calls the method with the key', () => {
      const cache = new Cache()
      cache.use(mockSocket)
      return cache.call('methodTwo', 'key1').then((result) => {
        expect(result).to.equal('value1')
      })
    })
    it('only calls the method once', async () => {
      const cache = new Cache()
      cache.use(mockSocket)
      await cache.call('methodOne', 'key1')
      await cache.call('methodOne', 'key1')
      expect(mockSocket.call.callCount).to.equal(1)
    })
    it('returns cached result on subsequent calls', async () => {
      const cache = new Cache()
      cache.use(mockSocket)
      const result1 = await cache.call('methodOne', 'key1')
      const result2 = await cache.call('methodOne', 'key1')
      expect(result1).to.equal(result2)
    })
    it('calls again if cache expired', () => {
      const cache = new Cache()
      const clock = sinon.useFakeTimers()
      cache.use(mockSocket)
      cache.create('methodOne', { maxAge: 10 })
      const result1 = cache.call('methodOne', 'key1')
      clock.tick(20)
      const result2 = cache.call('methodOne', 'key1')
      clock.restore()
      return Promise.all([result1, result2]).then((results) => {
        expect(mockSocket.call.callCount).to.equal(2)
        expect(results[0]).to.not.equal(results[1])
      })
    })
  })
  describe('.has', () => {
    it('returns true if the method cache was created', () => {
      const cache = new Cache()
      cache.use(mockSocket)
      cache.create('methodOne')
      expect(cache.has('methodOne')).to.equal(true)
    })
    it('returns true if the method was called with cache', () => {
      const cache = new Cache()
      cache.use(mockSocket)
      cache.call('methodOne', 'key')
      expect(cache.has('methodOne')).to.equal(true)
    })
    it('returns false if the method is not cached', () => {
      const cache = new Cache()
      cache.use(mockSocket)
      expect(cache.has('methodThree')).to.equal(false)
    })
  })
  describe('.get', () => {
    it('returns cached result from last call with key', () => {
      const cache = new Cache()
      cache.use(mockSocket)
      return cache.call('methodOne', 'key1').then((result) => {
        expect(cache.get('methodOne', 'key1')).to.equal(result)
      })
    })
  })
  describe('.reset', () => {
    it('removes cached results for a method and key', async () => {
      const cache = new Cache()
      cache.use(mockSocket)
      const result1 = await cache.call('methodOne', 'key1')
      cache.reset('methodOne', 'key1')
      const result2 = await cache.call('methodOne', 'key1')
      expect(result1).not.to.equal(result2)
    })
    it('does not remove cache of calls with different key', async () => {
      const cache = new Cache()
      cache.use(mockSocket)
      await cache.call('methodTwo', 'key1')
      await cache.call('methodTwo', 'key2')
      cache.reset('methodTwo', 'key1')
      const result = cache.get('methodTwo', 'key2')
      expect(result).to.equal('value2')
    })
    it('without key, removes all results for method', async () => {
      const cache = new Cache()
      cache.use(mockSocket)
      await cache.call('methodTwo', 'key1')
      await cache.call('methodTwo', 'key2')
      cache.reset('methodTwo')
      const result1 = cache.get('methodTwo', 'key1')
      const result2 = cache.get('methodTwo', 'key2')
      expect(result1).to.equal(undefined)
      expect(result2).to.equal(undefined)
    })
  })
  describe('.resetAll', () => {
    it('resets all cached methods', async () => {
      const cache = new Cache()
      cache.use(mockSocket)
      await cache.call('methodOne', 'key1')
      await cache.call('methodTwo', 'key1')
      cache.resetAll()
      await cache.call('methodOne', 'key1')
      await cache.call('methodTwo', 'key1')
      expect(mockSocket.call.callCount).to.equal(4)
    })
  })
})
