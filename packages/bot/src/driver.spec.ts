import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import { silence } from '@amazebot/logger'
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
      expect(callback.callCount).to.equal(2)
    })
    it('calls callback with sent message object', async () => {
      const callback = sinon.spy()
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

    })
  })
  describe('.sendMessage', () => {
    before(() => driver.login())
    it('sends a custom message', async () => {
      const message = driver.prepareMessage({
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
    })
    it('sends a message with actions', async () => {
      const attachments = [{
        actions: [
          { type: 'button', text: 'Action 1', msg: 'Testing Action 1', msg_in_chat_window: true },
          { type: 'button', text: 'Action 2', msg: 'Testing Action 2', msg_in_chat_window: true }
        ]
      }]
      await driver.sendMessage({
        rid: simChannel.id,
        msg: 'SDK test `prepareMessage` actions',
        attachments
      })
      const last = await lastMessage(simChannel.id)
      expect(last[0].attachments![0].actions).to.eql(attachments[0].actions)
    })
  })
  describe('.editMessage', () => {
    before(() => driver.login())
    it('edits the last sent message', async () => {
      const original = driver.prepareMessage({
        msg: ':point_down:',
        emoji: ':point_right:',
        groupable: false,
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
      })
    })
  })
  describe('.sendToRoomId', () => {
    before(() => driver.login())
    it('sends string to the given room id', async () => {
      const result = await driver.sendToRoomId('SDK test `sendToRoomId`', simChannel.id)
      expect(result).to.include.all.keys(['msg', 'rid', '_id'])
    })
    it('sends array of strings to the given room id', async () => {
      const result = await driver.sendToRoomId([
        'SDK test `sendToRoomId` A',
        'SDK test `sendToRoomId` B'
      ], simChannel.id)
      expect(result).to.be.an('array')
      expect(result[0]).to.include.all.keys(['msg', 'rid', '_id'])
      expect(result[1]).to.include.all.keys(['msg', 'rid', '_id'])
    })
  })
  describe('.sendToRoom', () => {
    before(() => driver.login())
    it('sends string to the given room name', async () => {
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
      let sent = await driver.sendToRoomId('test reactions', simChannel.id)
      if (Array.isArray(sent)) sent = sent[0] // see todo on `sendToRoomId`
      await driver.setReaction(':thumbsup:', sent._id)
      const last = await lastMessage(simChannel.id)
      expect(last.reactions).to.have.deep.property(':thumbsup:', {
        usernames: [ simUser.account.username ]
      })
    })
    it('removes if used when emoji reaction exists', async () => {
      const sent = await driver.sendMessage(driver.prepareMessage({
        msg: 'test reactions -',
        reactions: { ':thumbsup:': { usernames: [simUser.account.username] } },
        rid: simChannel.id
      }))
      await driver.setReaction(':thumbsup:', sent._id)
      const last = await lastMessage(simChannel.id)
      expect(last).to.not.have.property('reactions')
    })
  })
  describe('.respondToMessages', () => {
    before(() => driver.login())
    beforeEach(() => driver.leaveRooms(['general', simChannel.name]))
    it('joins rooms if not already joined', async () => {
      expect(driver.joinedIds).to.have.lengthOf(0)
      await driver.respondToMessages(() => null, { rooms: ['general', simChannel.name] })
      expect(driver.joinedIds).to.have.lengthOf(2)
    })
    it('ignores messages sent from bot', async () => {
      const callback = sinon.spy()
      await driver.respondToMessages(callback)
      await driver.sendToRoomId('SDK test `respondToMessages`', simChannel.id)
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
      await driver.respondToMessages(callback, { rooms: [simChannel.name] })
      await utils.sendFromUser({ text: 'SDK test `respondToMessages` 1' })
      sinon.assert.calledOnce(callback)
    })
    it('by default ignores edited messages', async () => {
      const callback = sinon.spy()
      const sentMessage = await utils.sendFromUser({
        text: 'SDK test `respondToMessages` sent'
      })
      driver.respondToMessages(callback, { rooms: [simChannel.name] })
      await utils.updateFromUser({
        roomId: simChannel.id,
        msgId: sentMessage.message._id,
        text: 'SDK test `respondToMessages` edited'
      })
      sinon.assert.notCalled(callback)
    })
    it('ignores edited messages, after receiving original', async () => {
      const callback = sinon.spy()
      await driver.respondToMessages(callback, { rooms: [simChannel.name] })
      const sentMessage = await utils.sendFromUser({
        text: 'SDK test `respondToMessages` sent'
      })
      await utils.updateFromUser({
        roomId: simChannel.id,
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
      await driver.respondToMessages(callback, { edited: true, rooms: [simChannel.name] })
      await utils.updateFromUser({
        roomId: simChannel.id,
        msgId: sentMessage.message._id,
        text: 'SDK test `respondToMessages` edited'
      })
      sinon.assert.calledOnce(callback)
    })
    it('by default ignores DMs', async () => {
      const dmResult = await utils.setupDirectFromUser()
      const callback = sinon.spy()
      await driver.respondToMessages(callback, { rooms: [simChannel.name] })
      await utils.sendFromUser({
        text: 'SDK test `respondToMessages` DM',
        roomId: dmResult.room._id
      })
      sinon.assert.notCalled(callback)
    })
    it('fires callback on DMs if configured', async () => {
      const dmResult = await utils.setupDirectFromUser()
      const callback = sinon.spy()
      await driver.respondToMessages(callback, { dm: true, rooms: [simChannel.name] })
      await utils.sendFromUser({
        text: 'SDK test `respondToMessages` DM',
        roomId: dmResult.room._id
      })
      sinon.assert.calledOnce(callback)
    })
    it('fires callback on ul (user leave) message types', async () => {
      const callback = sinon.spy()
      await driver.respondToMessages(callback, { rooms: [simChannel.name] })
      await utils.leaveUser()
      sinon.assert.calledWithMatch(callback, null, sinon.match({ t: 'ul' }))
      await utils.inviteUser()
    })
    it('fires callback on au (user added) message types', async () => {
      await utils.leaveUser()
      const callback = sinon.spy()
      await driver.respondToMessages(callback, { rooms: [simChannel.name] })
      await utils.inviteUser()
      sinon.assert.calledWithMatch(callback, null, sinon.match({ t: 'au' }))
    })
    it('appends room name to event meta in channels', async () => {
      const callback = sinon.spy()
      await driver.respondToMessages(callback, { dm: true, rooms: [simChannel.name] })
      await utils.sendFromUser({ text: 'SDK test `respondToMessages` DM' })
      expect(callback.firstCall.args[2].roomName).to.equal(simChannel.name)
    })
    it('room name is undefined in direct messages', async () => {
      const dmResult = await utils.setupDirectFromUser()
      const callback = sinon.spy()
      await driver.respondToMessages(callback, { dm: true, rooms: [simChannel.name] })
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
      const room = await driver.getRoomId(simChannel.name)
      expect(room).to.equal(simChannel.id)
    })
    it('returns the ID for a private room name', async () => {
      const room = await driver.getRoomId(pName)
      expect(room).to.equal(pId)
    })
  })
  describe('.getRoomName', () => {
    before(() => driver.login())
    it('returns the name for a channel by ID', async () => {
      const room = await driver.getRoomName(simChannel.id)
      expect(room).to.equal(simChannel.name)
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
      await driver.joinRooms(['general', simChannel.name])
      expect(driver.joinedIds).to.have.members(['GENERAL', simChannel.id])
    })
  })
})
