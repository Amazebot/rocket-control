import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import { silence } from '@amazebot/logger'
import { user, room } from '@amazebot/rocket-sims'
import { config } from './config'
import { driver, Message } from './driver'
import { IMessage } from './interfaces'

/** Instead of using delay, tests that hit rate limit have been skipped. */
// const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

silence()

let simUser: user.Record
let simName: string
let simChannel: room.Record
let simPrivate: room.Record

async function lastMessages (rid: string, inclusive = true, count = 1) {
  const args = { rid, inclusive, count }
  const { messages } = await driver.socket.call('getChannelHistory', args)
  return messages as IMessage[]
}

describe('driver', () => {
  before(async () => {
    simUser = await user.create({ name: 'driver-test-user', password: 'pass' })
    simName = simUser.account.username
    simChannel = await room.create({ name: 'driver-test-public' }, false).catch()
    simPrivate = await room.create({ name: 'driver-test-private' }, true).catch()
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
      expect(driver.uId).to.eql(driver.uId)
    })
    it('copies username from socket', async () => {
      await driver.login()
      expect(driver.username).to.eql(driver.username)
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
  describe.skip('.logout', () => {
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
  describe('.subscribe', () => {
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
    it.skip('throws without first logging in', async () => {
      await driver.logout()
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
      await simUser.send({ rid, msg: 'SDK test `reactToMessages` 2' })
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
      const message = driver.prepareMessage({
        msg: 'foo',
        rid: simChannel.id
      })
      expect(message).to.be.instanceOf(Message)
      expect(message.msg).to.equal('foo')
    })
  })
  describe('.sendMessage', () => {
    before(() => driver.login())
    it('sends a custom message', async () => {
      const message = driver.prepareMessage({
        rid: simChannel.id,
        msg: ':point_down:',
        emoji: ':point_right:',
        reactions: { ':thumbsup:': { usernames: [simName] } },
        groupable: false
      })
      await driver.sendMessage(message)
      const last = await lastMessages(simChannel.id)
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
      const last = await lastMessages(simChannel.id)
      expect(last[0].attachments![0].actions).to.eql(attachments[0].actions)
    })
  })
  describe('.editMessage', () => {
    before(() => driver.login())
    it('edits the last sent message', async () => {
      const sent = await simUser.send({
        msg: ':point_down:',
        rid: simChannel.id
      })
      sent.msg = ':point_up:' // update message receipt to use as new message
      await driver.editMessage(sent)
      const last = await lastMessages(simChannel.id)
      expect(last[0]).to.have.property('msg', ':point_up:')
      expect(last[0]).to.have.deep.property('editedBy', {
        _id: driver.uId, username: driver.username
      })
      expect(last[0].u).to.have.property('username', simName)
    })
  })
  describe('.sendToRoomId', () => {
    before(() => driver.login())
    it('sends string to the given room id', async () => {
      const sent = await driver.sendToRoomId('SDK test `sendToRoomId`', simChannel.id)
      expect(sent[0]).to.include.all.keys(['msg', 'rid', '_id'])
    })
    it('sends array of strings to the given room id', async () => {
      const sent = await driver.sendToRoomId([
        'SDK test `sendToRoomId` A',
        'SDK test `sendToRoomId` B'
      ], simChannel.id)
      expect(sent[0]).to.include.all.keys(['msg', 'rid', '_id'])
      expect(sent[1]).to.include.all.keys(['msg', 'rid', '_id'])
    })
  })
  describe('.sendToRoom', () => {
    before(() => driver.login())
    it('sends string to the given room name', async () => {
      const msg = 'SDK test `sendToRoom`'
      await driver.sendToRoom(msg, simChannel.name)
      const last = await lastMessages(simChannel.id)
      expect(last[0].msg).to.equal(msg)
    })
    it('sends array of strings to the given room name', async () => {
      const msgA = 'SDK test `sendToRoom` A'
      const msgB = 'SDK test `sendToRoom` B'
      await driver.sendToRoom([msgA, msgB], simChannel.name)
      const last = await lastMessages(simChannel.id, true, 2)
      expect([last[1].msg, last[0].msg]).to.eql([msgA, msgB])
    })
  })
  describe('.sendDirectToUser', () => {
    before(() => driver.login())
    it('sends string to the given room name', async () => {
      const msg = 'SDK test `sendDirectToUser`'
      const directId = driver.uId + simUser.id
      await driver.sendDirectToUser(msg, simName)
      const last = await lastMessages(directId)
      expect(last[0].msg).to.equal(msg)
    })
    it('sends array of strings to the given room name', async () => {
      const msgA = 'SDK test `sendDirectToUser` A'
      const msgB = 'SDK test `sendDirectToUser` B'
      const directId = driver.uId + simUser.id
      await driver.sendDirectToUser([msgA, msgB], simName)
      const last = await lastMessages(directId, true, 2)
      expect([last[1].msg, last[0].msg]).to.eql([msgA, msgB])
    })
  })
  describe('.setReaction', () => {
    before(() => driver.login())
    it('adds emoji reaction to message', async () => {
      const sent = await simUser.send({
        msg: 'test reactions',
        rid: simChannel.id
      })
      await driver.setReaction(':thumbsup:', sent._id)
      const last = await lastMessages(simChannel.id)
      expect(last[0].reactions).to.have.deep.property(':thumbsup:', {
        usernames: [ driver.username ]
      })
    })
    it('removes if used when emoji reaction exists', async () => {
      const sent = await simUser.send({
        msg: 'test reactions -',
        reactions: { ':thumbsup:': { usernames: [driver.username] } },
        rid: simChannel.id
      })
      await driver.setReaction(':thumbsup:', sent._id)
      const last = await lastMessages(simChannel.id)
      expect(last[0]).to.not.have.property('reactions')
    })
  })
  describe('.onMessage', () => {
    before(async () => {
      await driver.login()
      await driver.joinRoom(simChannel.id)
    })
    it('fires callback on messages in joined rooms', async () => {
      const callback = sinon.spy()
      await driver.onMessage(callback)
      await simUser.send({
        msg: 'SDK test `onMessage` 1',
        rid: simChannel.id
      })
      sinon.assert.calledOnce(callback)
    })
    it('ignores messages sent from bot', async () => {
      const callback = sinon.spy()
      await driver.onMessage(callback)
      await driver.sendToRoomId('SDK test `onMessage`', simChannel.id)
      sinon.assert.notCalled(callback)
    })
    it('by default fires callback on edited messages', async () => {
      const sent = await simUser.send({
        msg: 'SDK test `onMessage` sent',
        rid: simChannel.id
      })
      const callback = sinon.spy()
      await driver.onMessage(callback)
      sent.msg = 'SDK test `onMessage` edited'
      await driver.socket.call('updateMessage', sent)
      sinon.assert.calledOnce(callback)
    })
    it('ignores edited messages if configured', async () => {
      const sent = await simUser.send({
        msg: 'SDK test `onMessage` sent',
        rid: simChannel.id
      })
      const callback = sinon.spy()
      await driver.onMessage(callback, { edited: true })
      sent.msg = 'SDK test `onMessage` ignore edited'
      await driver.socket.call('updateMessage', sent)
      sinon.assert.notCalled(callback)
    })
    it('ignores edited messages, after receiving original if configured', async () => {
      const callback = sinon.spy()
      await driver.onMessage(callback, { edited: true })
      const sent = await simUser.send({
        msg: 'SDK test `onMessage` sent',
        rid: simChannel.id
      })
      sent.msg = 'SDK test `onMessage` ignore edited'
      await driver.socket.call('updateMessage', sent)
      sinon.assert.calledOnce(callback)
    })
    it('ignores DMs if configured', async () => {
      const { rid } = await driver.socket.call('createDirectMessage', simName)
      const callback = sinon.spy()
      await driver.onMessage(callback, { direct: true })
      await simUser.send({ msg: 'SDK test `onMessage` DM', rid })
      sinon.assert.notCalled(callback)
    })
    it('by default fires callback on DMs', async () => {
      const { rid } = await driver.socket.call('createDirectMessage', simName)
      const callback = sinon.spy()
      await driver.onMessage(callback)
      await simUser.send({ msg: 'SDK test `onMessage` DM', rid })
      sinon.assert.calledOnce(callback)
    })
    it('fires callback on ul (user leave) message types', async () => {
      await simUser.join(simChannel.id)
      const callback = sinon.spy()
      await driver.onMessage(callback)
      await simUser.leave(simChannel.id)
      sinon.assert.calledWithMatch(callback, null, sinon.match({ t: 'ul' }))
    })
    it('fires callback on uj (user join) message types', async () => {
      await simUser.leave(simChannel.id).catch((_) => null) // ignore not in room
      const callback = sinon.spy()
      await driver.onMessage(callback)
      await simUser.join(simChannel.id)
      sinon.assert.calledWithMatch(callback, null, sinon.match({ t: 'uj' }))
    })
    it('fires callback on au (user added) message types', async () => {
      await simUser.leave(simChannel.id).catch((_) => null) // ignore not in room
      const callback = sinon.spy()
      await driver.onMessage(callback)
      await driver.socket.call('addUsersToRoom', {
        rid: simChannel.id,
        users: [simName]
      })
      sinon.assert.calledWithMatch(callback, null, sinon.match({ t: 'au' }))
    })
    it('appends room name to event meta in channels', async () => {
      const callback = sinon.spy()
      await driver.onMessage(callback)
      await simUser.send({ msg: 'SDK test `onMessage`', rid: simChannel.id })
      expect(callback.firstCall.args[2].roomName).to.equal(simChannel.name)
    })
    it('room name is undefined in direct messages', async () => {
      const { rid } = await driver.socket.call('createDirectMessage', simName)
      const callback = sinon.spy()
      await driver.onMessage(callback)
      await simUser.send({ msg: 'SDK test `onMessage` DM', rid })
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
      const room = await driver.getRoomId(simPrivate.name)
      expect(room).to.equal(simPrivate.id)
    })
  })
  describe('.getRoomName', () => {
    before(() => driver.login())
    it('returns the name for a channel by ID', async () => {
      const room = await driver.getRoomName(simChannel.id)
      expect(room).to.equal(simChannel.name)
    })
    it('returns the name for a private group by ID', async () => {
      const room = await driver.getRoomName(simPrivate.id)
      expect(room).to.equal(simPrivate.name)
    })
    it('returns undefined for a DM room', async () => {
      const { rid } = await driver.socket.call('createDirectMessage', simName)
      const room = await driver.getRoomName(rid)
      expect(room).to.equal(undefined)
    })
  })
  describe('.joinRooms', () => {
    before(() => driver.login())
    it('joins all the rooms in array, keeping IDs', async () => {
      driver.joined.splice(0, driver.joined.length) // clear const array
      await driver.joinRooms(['general', simChannel.name])
      expect(driver.joined).to.have.members(['GENERAL', simChannel.id])
    })
  })
})
