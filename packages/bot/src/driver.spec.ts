import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import { silence } from '@amazebot/logger'
<<<<<<< Updated upstream
import { Socket } from '@amazebot/rocket-socket'
import { user } from '@amazebot/rocket-sims'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const u1 = await user.create({ username: 'sim1' })

let clock
let tId
let pId
const tName = utils.testChannelName
const pName = utils.testPrivateName

silence() // suppress log during tests (disable this while developing tests)

describe('driver', () => {
  before(async () => {
    const testChannel = await utils.channelInfo({ roomName: tName })
    tId = testChannel.channel._id
    const testPrivate = await utils.privateInfo({ roomName: pName })
    pId = testPrivate.group._id
  })
  after(async () => {
    await api.logout()
    await driver.logout()
    await driver.disconnect()
  })
  describe('.connect', () => {
    context('with localhost connection', () => {
      it('without args, returns a promise', () => {
        const promise = driver.connect()
        expect(promise.then).to.be.a('function')
        promise.catch((err) => console.error(err))
        return promise
      })
      it('accepts an error-first callback, providing socket', (done) => {
        driver.connect({}, (err, socket) => {
          expect(err).to.equal(null)
          expect(socket).to.be.an('object')
          done()
        })
      })
      it('without url takes localhost as default', (done) => {
        driver.connect({}, (err, socket) => {
          expect(err).to.eql(null)
          expect(socket.host).to.contain('localhost:3000')
          done()
        })
      })
      it('promise resolves with socket in successful state', () => {
        return driver.connect().then((socket) => {
          const isActive = (socket.connection.readyState === 1)
          expect(isActive).to.equal(true)
        })
      })
      it('provides the socket instance to method cache', () => {
        return driver.connect().then((socket) => {
          expect(methodCache.instance).to.eql(socket)
        })
      })
    })
    context('with timeout, on expiry', () => {
      before(() => clock = sinon.useFakeTimers(0))
      after(() => clock.restore())
      it('with url, attempts connection at URL', (done) => {
        driver.connect({ host: 'localhost:9999', timeout: 100 }, (err, socket) => {
          expect(err).to.be.an('error')
          expect(socket.config.host).to.contain('localhost:9999')
          done()
        }).catch(() => null)
        clock.tick(200)
      })
      it('returns error', (done) => {
        let opts = { host: 'localhost:9999', timeout: 100 }
        driver.connect(opts, (err, socket: Socket) => {
          expect(err).to.be.an('error')
          expect(!!socket.connected).to.eql(false)
          done()
        }).catch(() => null)
        clock.tick(200)
      })
      it('without callback, triggers promise catch', () => {
        const promise = driver.connect({ host: 'localhost:9999', timeout: 100 })
        .catch((err) => expect(err).to.be.an('error'))
        clock.tick(200)
        return promise
      })
      it('with callback, provides error to callback', (done) => {
        driver.connect({ host: 'localhost:9999', timeout: 100 }, (err) => {
          expect(err).to.be.an('error')
          done()
        }).catch(() => null)
        clock.tick(200)
      })
    })
  })
  describe('.login', () => {
    afterEach(() => driver.logout())
    it('sets the bot user status to online', async () => {
      await driver.login()
      const result = await utils.userInfo(botUser.username)
      expect(result.user.status).to.equal('online')
    })
  })
  describe('.subscribeToMessages', () => {
    it('resolves with subscription object', async () => {
      await driver.login()
      const subscription = await driver.subscribeToMessages()
      expect(subscription).to.include.keys(['id', 'name', 'unsubscribe', 'onEvent'])
    })
    after(() => driver.unsubscribeAll())
  })
  describe('.reactToMessages', () => {
    before(() => driver.login())
    afterEach(() => driver.unsubscribeAll())
    it('calls callback on every subscription update', async () => {
      const callback = sinon.spy()
      driver.reactToMessages(callback)
      await utils.sendFromUser({ text: 'SDK test `reactToMessages` 1' })
      await utils.sendFromUser({ text: 'SDK test `reactToMessages` 2' })
=======
import { user, room } from '@amazebot/rocket-sims'
import { config } from './config'
import { driver, Message } from './driver'
import { IMessage } from './interfaces'

silence()

let simUser: user.Record
let simChannel: room.Record
// let simPrivate: room.INewRoom

async function lastMessage (rid: string, inclusive = true, count = 1) {
  const args = { rid, inclusive, count }
  const { messages } = await driver.socket.call('getChannelHistory', args)
  return messages as IMessage[]
}

describe('driver', () => {
  before(async () => {
    simUser = await user.create({ name: 'driver-test-user', password: 'pass' })
    simChannel = await room.create({ name: 'driver-test-public' }, false)
    // simPrivate = await room.create({ name: 'driver-test-private' }, true)
  })
  after(async () => {
    await user.deleteAll()
    await room.deleteAll()
    await driver.logout()
  })
  describe('.login', () => {
    afterEach(() => driver.logout())
    it('driver socket is logged in', async () => {
      await driver.login()
      expect(driver.socket.loggedIn).to.equal(true)
    })
    it('copies user ID from socket', async () => {
      await driver.login()
      expect(driver.uId).to.eql(driver.socket.user!.id)
    })
    it('copies username from socket', async () => {
      await driver.login()
      expect(driver.username).to.eql(driver.socket.user!.username)
    })
    it('calls join room with configured rooms', async () => {
      config.reset()
      const stub = sinon.stub(driver, 'joinRooms')
      config.set('join', 'foo,bar,baz')
      await driver.login()
      sinon.assert.calledWithExactly(stub, ['foo', 'bar', 'baz'])
      stub.restore()
      config.reset()
    })
  })
  describe('.logout', () => {
    it('driver socket is logged out', async () => {
      await driver.login()
      await driver.logout()
      expect(driver.socket.loggedIn).to.equal(false)
    })
  })
  describe('.setupCache', () => {
    beforeEach(() => driver.cache.resetAll())
    it('sets up caches for user and room lookups', () => {
      driver.setupCache()
      expect(Array.from(driver.cache.results.keys())).to.have.all.members([
        'getUserById',
        'getRoomIdByNameOrId',
        'getRoomNameById',
        'createDirectMessage'
      ])
    })
  })
  describe.only('.subscribe', () => {
    it('resolves with subscription object', async () => {
      await driver.login()
      const subscription = await driver.subscribe()
      expect(subscription).to.include.keys([
        'id',
        'name',
        'unsubscribe',
        'onEvent'
      ])
    })
    it('throws without first logging in', async () => {
      expect(() => driver.subscribe()).to.throw()
    })
  })
  describe('.onMessage', () => {
    before(() => driver.login())
    it('calls callback on every subscription update', async () => {
      const callback = sinon.spy()
      const rid = simChannel.id
      await driver.onMessage(callback)
      await simUser.send({ rid, msg: 'SDK test `reactToMessages` 1' })
      await simUser.send({ rid: simChannel.id, msg: 'SDK test `reactToMessages` 2' })
>>>>>>> Stashed changes
      expect(callback.callCount).to.equal(2)
    })
    it('calls callback with sent message object', async () => {
      const callback = sinon.spy()
<<<<<<< Updated upstream
      driver.reactToMessages(callback)
      await utils.sendFromUser({ text: 'SDK test `reactToMessages` 3' })
      const messageArgs = callback.getCall(0).args
      expect(messageArgs[1].msg).to.equal('SDK test `reactToMessages` 3')
    })
  })
  describe('.setupMethodCache', () => {
    beforeEach(() => methodCache.resetAll())
    // @todo needs better testing (maybe use `getServerInfo` as test call without requiring login/connect)
    // stub instance class to make sure it's only calling on instance first time, instead of hacky timers
    it('returns subsequent cached method results from cache', async () => {
      await driver.login() // calls setupMethodCache with DDP once connected
      const now = Date.now()
      const liveId = await driver.callMethod('getRoomNameById', 'GENERAL')
      const after = Date.now()
      const cacheId = await driver.callMethod('getRoomNameById', 'GENERAL')
      const final = Date.now()
      const firstCall = after - now
      const cacheCall = final - after
      expect(liveId).to.equal(cacheId)
      expect(firstCall).to.be.gt(cacheCall)
      expect(cacheCall).to.be.lte(10)
=======
      await driver.onMessage(callback)
      const msg = 'SDK test `reactToMessages` 3'
      await simUser.send({ rid: simChannel.id, msg })
      const messageArgs = callback.getCall(0).args
      expect(messageArgs[1].msg).to.equal(msg)
    })
  })
  describe('.prepareMessage', () => {
    it('returns a message object from a string', () => {
      const message = driver.prepareMessage('foo')
      expect(message).to.be.instanceOf(Message)
      expect(message.msg).to.equal('foo')
    })
    it('returns a message object from an object', () => {

>>>>>>> Stashed changes
    })
  })
  describe('.sendMessage', () => {
    before(() => driver.login())
    it('sends a custom message', async () => {
      const message = driver.prepareMessage({
<<<<<<< Updated upstream
        rid: tId,
        msg: ':point_down:',
        emoji: ':point_right:',
        reactions: { ':thumbsup:': { usernames: [botUser.username] } },
        groupable: false
      })
      await driver.sendMessage(message)
      const last = (await utils.lastMessages(tId))[0]
      expect(last).to.have.deep.property('reactions', message.reactions)
      expect(last).to.have.property('emoji', ':point_right:')
      expect(last).to.have.property('msg', ':point_down:')
=======
        rid: simChannel.id,
        msg: ':point_down:',
        emoji: ':point_right:',
        reactions: { ':thumbsup:': { usernames: [simUser.account.username] } },
        groupable: false
      })
      await driver.sendMessage(message)
      const last = await lastMessage(simChannel.id)
      expect(last[0]).to.have.deep.property('reactions', message.reactions)
      expect(last[0]).to.have.property('emoji', ':point_right:')
      expect(last[0]).to.have.property('msg', ':point_down:')
>>>>>>> Stashed changes
    })
    it('sends a message with actions', async () => {
      const attachments = [{
        actions: [
          { type: 'button', text: 'Action 1', msg: 'Testing Action 1', msg_in_chat_window: true },
          { type: 'button', text: 'Action 2', msg: 'Testing Action 2', msg_in_chat_window: true }
        ]
      }]
      await driver.sendMessage({
<<<<<<< Updated upstream
        rid: tId,
        msg: 'SDK test `prepareMessage` actions',
        attachments
      })
      const last = (await utils.lastMessages(tId))[0]
      expect(last.attachments[0].actions).to.eql(attachments[0].actions)
=======
        rid: simChannel.id,
        msg: 'SDK test `prepareMessage` actions',
        attachments
      })
      const last = await lastMessage(simChannel.id)
      expect(last[0].attachments![0].actions).to.eql(attachments[0].actions)
>>>>>>> Stashed changes
    })
  })
  describe('.editMessage', () => {
    before(() => driver.login())
    it('edits the last sent message', async () => {
      const original = driver.prepareMessage({
        msg: ':point_down:',
        emoji: ':point_right:',
        groupable: false,
<<<<<<< Updated upstream
        rid: tId
      })
      await driver.sendMessage(original)
      const sent = (await utils.lastMessages(tId))[0]
      const update = Object.assign({}, original, {
        _id: sent._id,
        msg: ':point_up:'
      })
      await driver.editMessage(update)
      const last = (await utils.lastMessages(tId))[0]
      expect(last).to.have.property('msg', ':point_up:')
      expect(last).to.have.deep.property('editedBy', {
        _id: driver.user.login.id, username: botUser.username
=======
        rid: simChannel.id
      })
      await driver.sendMessage(original)
      const sent = await lastMessage(simChannel.id)
      const update = Object.assign({}, original, {
        _id: sent[0]._id,
        msg: ':point_up:'
      })
      await driver.editMessage(update)
      const last = await lastMessage(simChannel.id)
      expect(last[0]).to.have.property('msg', ':point_up:')
      expect(last[0]).to.have.deep.property('editedBy', {
        _id: driver.uId, username: simUser.account.username
>>>>>>> Stashed changes
      })
    })
  })
  describe('.sendToRoomId', () => {
    before(() => driver.login())
    it('sends string to the given room id', async () => {
<<<<<<< Updated upstream
      const result = await driver.sendToRoomId('SDK test `sendToRoomId`', tId)
=======
      const result = await driver.sendToRoomId('SDK test `sendToRoomId`', simChannel.id)
>>>>>>> Stashed changes
      expect(result).to.include.all.keys(['msg', 'rid', '_id'])
    })
    it('sends array of strings to the given room id', async () => {
      const result = await driver.sendToRoomId([
        'SDK test `sendToRoomId` A',
        'SDK test `sendToRoomId` B'
<<<<<<< Updated upstream
      ], tId)
=======
      ], simChannel.id)
>>>>>>> Stashed changes
      expect(result).to.be.an('array')
      expect(result[0]).to.include.all.keys(['msg', 'rid', '_id'])
      expect(result[1]).to.include.all.keys(['msg', 'rid', '_id'])
    })
  })
  describe('.sendToRoom', () => {
    before(() => driver.login())
    it('sends string to the given room name', async () => {
<<<<<<< Updated upstream
      await driver.subscribeToMessages()
      const result = await driver.sendToRoom('SDK test `sendToRoom`', tName)
      expect(result).to.include.all.keys(['msg', 'rid', '_id'])
    })
    it('sends array of strings to the given room name', async () => {
      await driver.subscribeToMessages()
      const result = await driver.sendToRoom([
        'SDK test `sendToRoom` A',
        'SDK test `sendToRoom` B'
      ], tName)
      expect(result).to.be.an('array')
      expect(result[0]).to.include.all.keys(['msg', 'rid', '_id'])
      expect(result[1]).to.include.all.keys(['msg', 'rid', '_id'])
    })
  })
=======
      const msg = 'SDK test `sendToRoom`'
      const result = await driver.sendToRoom(msg, simChannel.name)
      const last = await lastMessage(simChannel.id)
      expect(result).to.include.all.keys(['msg', 'rid', '_id'])
      expect(last[0].msg).to.equal(msg)
    })
    it('sends array of strings to the given room name', async () => {
      const msgA = 'SDK test `sendToRoom` A'
      const msgB = 'SDK test `sendToRoom` B'
      const result = await driver.sendToRoom([msgA, msgB], simChannel.name)
      const last = await lastMessage(simChannel.id, true, 2)
      expect(result).to.be.an('array')
      expect(result[0]).to.include.all.keys(['msg', 'rid', '_id'])
      expect(result[1]).to.include.all.keys(['msg', 'rid', '_id'])
      expect([last[0].msg, last[1].msg]).to.eql([msgA, msgB])
    })
  })
  /** YOU ARE @HERE */
>>>>>>> Stashed changes
  describe('.sendDirectToUser', () => {
    before(() => driver.login())
    it('sends string to the given room name', async () => {
      await driver.connect()
      await driver.login()
      const result = await driver.sendDirectToUser('SDK test `sendDirectToUser`', mockUser.username)
      expect(result).to.include.all.keys(['msg', 'rid', '_id'])
    })
    it('sends array of strings to the given room name', async () => {
      const result = await driver.sendDirectToUser([
        'SDK test `sendDirectToUser` A',
        'SDK test `sendDirectToUser` B'
      ], mockUser.username)
      expect(result).to.be.an('array')
      expect(result[0]).to.include.all.keys(['msg', 'rid', '_id'])
      expect(result[1]).to.include.all.keys(['msg', 'rid', '_id'])
    })
  })
  describe('.setReaction', () => {
    before(() => driver.login())
    it('adds emoji reaction to message', async () => {
<<<<<<< Updated upstream
      let sent = await driver.sendToRoomId('test reactions', tId)
      if (Array.isArray(sent)) sent = sent[0] // see todo on `sendToRoomId`
      await driver.setReaction(':thumbsup:', sent._id)
      const last = (await utils.lastMessages(tId))[0]
      expect(last.reactions).to.have.deep.property(':thumbsup:', {
        usernames: [ botUser.username ]
=======
      let sent = await driver.sendToRoomId('test reactions', simChannel.id)
      if (Array.isArray(sent)) sent = sent[0] // see todo on `sendToRoomId`
      await driver.setReaction(':thumbsup:', sent._id)
      const last = await lastMessage(simChannel.id)
      expect(last.reactions).to.have.deep.property(':thumbsup:', {
        usernames: [ simUser.account.username ]
>>>>>>> Stashed changes
      })
    })
    it('removes if used when emoji reaction exists', async () => {
      const sent = await driver.sendMessage(driver.prepareMessage({
        msg: 'test reactions -',
<<<<<<< Updated upstream
        reactions: { ':thumbsup:': { usernames: [botUser.username] } },
        rid: tId
      }))
      await driver.setReaction(':thumbsup:', sent._id)
      const last = (await utils.lastMessages(tId))[0]
=======
        reactions: { ':thumbsup:': { usernames: [simUser.account.username] } },
        rid: simChannel.id
      }))
      await driver.setReaction(':thumbsup:', sent._id)
      const last = await lastMessage(simChannel.id)
>>>>>>> Stashed changes
      expect(last).to.not.have.property('reactions')
    })
  })
  describe('.respondToMessages', () => {
    before(() => driver.login())
<<<<<<< Updated upstream
    beforeEach(() => driver.leaveRooms(['general', tName]))
    it('joins rooms if not already joined', async () => {
      expect(driver.joinedIds).to.have.lengthOf(0)
      await driver.respondToMessages(() => null, { rooms: ['general', tName] })
=======
    beforeEach(() => driver.leaveRooms(['general', simChannel.name]))
    it('joins rooms if not already joined', async () => {
      expect(driver.joinedIds).to.have.lengthOf(0)
      await driver.respondToMessages(() => null, { rooms: ['general', simChannel.name] })
>>>>>>> Stashed changes
      expect(driver.joinedIds).to.have.lengthOf(2)
    })
    it('ignores messages sent from bot', async () => {
      const callback = sinon.spy()
      await driver.respondToMessages(callback)
<<<<<<< Updated upstream
      await driver.sendToRoomId('SDK test `respondToMessages`', tId)
=======
      await driver.sendToRoomId('SDK test `respondToMessages`', simChannel.id)
>>>>>>> Stashed changes
      sinon.assert.notCalled(callback)
    })
    it('ignores messages in un-joined rooms', async () => {
      const callback = sinon.spy()
      await driver.respondToMessages(callback, { rooms: ['general'] })
      await utils.sendFromUser({ text: 'SDK test `respondToMessages` 1' })
      sinon.assert.notCalled(callback)
    })
    it('fires callback on messages in joined rooms', async () => {
      const callback = sinon.spy()
<<<<<<< Updated upstream
      await driver.respondToMessages(callback, { rooms: [tName] })
=======
      await driver.respondToMessages(callback, { rooms: [simChannel.name] })
>>>>>>> Stashed changes
      await utils.sendFromUser({ text: 'SDK test `respondToMessages` 1' })
      sinon.assert.calledOnce(callback)
    })
    it('by default ignores edited messages', async () => {
      const callback = sinon.spy()
      const sentMessage = await utils.sendFromUser({
        text: 'SDK test `respondToMessages` sent'
      })
<<<<<<< Updated upstream
      driver.respondToMessages(callback, { rooms: [tName] })
      await utils.updateFromUser({
        roomId: tId,
=======
      driver.respondToMessages(callback, { rooms: [simChannel.name] })
      await utils.updateFromUser({
        roomId: simChannel.id,
>>>>>>> Stashed changes
        msgId: sentMessage.message._id,
        text: 'SDK test `respondToMessages` edited'
      })
      sinon.assert.notCalled(callback)
    })
    it('ignores edited messages, after receiving original', async () => {
      const callback = sinon.spy()
<<<<<<< Updated upstream
      await driver.respondToMessages(callback, { rooms: [tName] })
=======
      await driver.respondToMessages(callback, { rooms: [simChannel.name] })
>>>>>>> Stashed changes
      const sentMessage = await utils.sendFromUser({
        text: 'SDK test `respondToMessages` sent'
      })
      await utils.updateFromUser({
<<<<<<< Updated upstream
        roomId: tId,
=======
        roomId: simChannel.id,
>>>>>>> Stashed changes
        msgId: sentMessage.message._id,
        text: 'SDK test `respondToMessages` edited'
      })
      sinon.assert.calledOnce(callback)
    })
    it('fires callback on edited message if configured', async () => {
      const callback = sinon.spy()
      const sentMessage = await utils.sendFromUser({
        text: 'SDK test `respondToMessages` sent'
      })
<<<<<<< Updated upstream
      await driver.respondToMessages(callback, { edited: true, rooms: [tName] })
      await utils.updateFromUser({
        roomId: tId,
=======
      await driver.respondToMessages(callback, { edited: true, rooms: [simChannel.name] })
      await utils.updateFromUser({
        roomId: simChannel.id,
>>>>>>> Stashed changes
        msgId: sentMessage.message._id,
        text: 'SDK test `respondToMessages` edited'
      })
      sinon.assert.calledOnce(callback)
    })
    it('by default ignores DMs', async () => {
      const dmResult = await utils.setupDirectFromUser()
      const callback = sinon.spy()
<<<<<<< Updated upstream
      await driver.respondToMessages(callback, { rooms: [tName] })
=======
      await driver.respondToMessages(callback, { rooms: [simChannel.name] })
>>>>>>> Stashed changes
      await utils.sendFromUser({
        text: 'SDK test `respondToMessages` DM',
        roomId: dmResult.room._id
      })
      sinon.assert.notCalled(callback)
    })
    it('fires callback on DMs if configured', async () => {
      const dmResult = await utils.setupDirectFromUser()
      const callback = sinon.spy()
<<<<<<< Updated upstream
      await driver.respondToMessages(callback, { dm: true, rooms: [tName] })
=======
      await driver.respondToMessages(callback, { dm: true, rooms: [simChannel.name] })
>>>>>>> Stashed changes
      await utils.sendFromUser({
        text: 'SDK test `respondToMessages` DM',
        roomId: dmResult.room._id
      })
      sinon.assert.calledOnce(callback)
    })
    it('fires callback on ul (user leave) message types', async () => {
      const callback = sinon.spy()
<<<<<<< Updated upstream
      await driver.respondToMessages(callback, { rooms: [tName] })
=======
      await driver.respondToMessages(callback, { rooms: [simChannel.name] })
>>>>>>> Stashed changes
      await utils.leaveUser()
      sinon.assert.calledWithMatch(callback, null, sinon.match({ t: 'ul' }))
      await utils.inviteUser()
    })
    it('fires callback on au (user added) message types', async () => {
      await utils.leaveUser()
      const callback = sinon.spy()
<<<<<<< Updated upstream
      await driver.respondToMessages(callback, { rooms: [tName] })
=======
      await driver.respondToMessages(callback, { rooms: [simChannel.name] })
>>>>>>> Stashed changes
      await utils.inviteUser()
      sinon.assert.calledWithMatch(callback, null, sinon.match({ t: 'au' }))
    })
    it('appends room name to event meta in channels', async () => {
      const callback = sinon.spy()
<<<<<<< Updated upstream
      await driver.respondToMessages(callback, { dm: true, rooms: [tName] })
      await utils.sendFromUser({ text: 'SDK test `respondToMessages` DM' })
      expect(callback.firstCall.args[2].roomName).to.equal(tName)
=======
      await driver.respondToMessages(callback, { dm: true, rooms: [simChannel.name] })
      await utils.sendFromUser({ text: 'SDK test `respondToMessages` DM' })
      expect(callback.firstCall.args[2].roomName).to.equal(simChannel.name)
>>>>>>> Stashed changes
    })
    it('room name is undefined in direct messages', async () => {
      const dmResult = await utils.setupDirectFromUser()
      const callback = sinon.spy()
<<<<<<< Updated upstream
      await driver.respondToMessages(callback, { dm: true, rooms: [tName] })
=======
      await driver.respondToMessages(callback, { dm: true, rooms: [simChannel.name] })
>>>>>>> Stashed changes
      await utils.sendFromUser({
        text: 'SDK test `respondToMessages` DM',
        roomId: dmResult.room._id
      })
      expect(callback.firstCall.args[2].roomName).to.equal(undefined)
    })
  })
  describe('.getRoomId', () => {
    before(() => driver.login())
    it('returns the ID for a channel by ID', async () => {
<<<<<<< Updated upstream
      const room = await driver.getRoomId(tName)
      expect(room).to.equal(tId)
=======
      const room = await driver.getRoomId(simChannel.name)
      expect(room).to.equal(simChannel.id)
>>>>>>> Stashed changes
    })
    it('returns the ID for a private room name', async () => {
      const room = await driver.getRoomId(pName)
      expect(room).to.equal(pId)
    })
  })
  describe('.getRoomName', () => {
    before(() => driver.login())
    it('returns the name for a channel by ID', async () => {
<<<<<<< Updated upstream
      const room = await driver.getRoomName(tId)
      expect(room).to.equal(tName)
=======
      const room = await driver.getRoomName(simChannel.id)
      expect(room).to.equal(simChannel.name)
>>>>>>> Stashed changes
    })
    it('returns the name for a private group by ID', async () => {
      const room = await driver.getRoomName(pId)
      expect(room).to.equal(pName)
    })
    it('returns undefined for a DM room', async () => {
      const dmResult = await utils.setupDirectFromUser()
      const room = await driver.getRoomName(dmResult.room._id)
      expect(room).to.equal(undefined)
    })
  })
  describe('.joinRooms', () => {
    before(() => driver.login())
    it('joins all the rooms in array, keeping IDs', async () => {
      driver.joinedIds.splice(0, driver.joinedIds.length) // clear const array
<<<<<<< Updated upstream
      await driver.joinRooms(['general', tName])
      expect(driver.joinedIds).to.have.members(['GENERAL', tId])
=======
      await driver.joinRooms(['general', simChannel.name])
      expect(driver.joinedIds).to.have.members(['GENERAL', simChannel.id])
>>>>>>> Stashed changes
    })
  })
})
