import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import { silence } from '@amazebot/logger'
import { Socket, isLoginResult } from '.'
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
let socket: Socket
const sim = {
  id: null,
  name: 'Socket Sim',
  username: 'socket-sim',
  password: 'password',
  roles: ['user'],
  email: 'bit-bucket+sim@test.smtp.org',
  joinDefaultChannels: false,
  requirePasswordChange: false,
  sendWelcomeEmail: false,
  verified: true
}
async function useSim () {
  await socket.login()
  const users = await socket.call('getFullUserData', {
    username: sim.username,
    limit: 1
  }).catch()
  if (users.length) sim.id = users[0]._id
  else sim.id = await socket.call('insertOrUpdateUser', sim)
}
async function removeSim () {
  if (!socket) return
  await socket.login()
  const users = await socket.call('getFullUserData', {
    username: sim.username,
    limit: 1
  }).catch()
  if (users.length) await socket.call('deleteUser', users[0]._id)
}

describe('[socket]', () => {
  describe('Socket', () => {
    before(() => silence())
    after(async () => {
      silence(false)
      await removeSim()
    })
    beforeEach(async () => {
      if (!socket || !socket.connected) return
      await socket.logout()
      await socket.close()
    })
    describe('constructor', () => {
      it('sets host to default websocket host', () => {
        const testSocket = new Socket()
        expect(testSocket.host).to.equal('ws://localhost:3000/websocket')
      })
      it('sets host to ws version of url if given', () => {
        const testSocket = new Socket({ host: 'http://my.server' })
        expect(testSocket.host).to.equal('ws://my.server/websocket')
      })
      it('sets ssl and uses wss if given https host', () => {
        const testSocket = new Socket({ host: 'https://my.server' })
        expect(testSocket.config.ssl).to.equal(true)
        expect(testSocket.host).to.equal('wss://my.server/websocket')
      })
    })
    describe('.open', () => {
      it('opens ws to host without error', async () => {
        socket = new Socket()
        await socket.open()
          .catch((err) => expect(typeof err).to.equal('undefined'))
        expect(socket.connected).to.equal(true)
      })
      it('establishes session with connection message', async () => {
        socket = new Socket()
        await socket.open()
          .catch((err) => expect(typeof err).to.equal('undefined'))
        expect(socket.session).to.have.lengthOf(17)
      })
      it('connects to open.rocket.chat over https', async () => {
        const openSocket = new Socket({ host: 'https://open.rocket.chat', ssl: false })
        await openSocket.open()
          .catch((err) => expect(typeof err).to.equal('undefined'))
        expect(openSocket.connected).to.equal(true)
      })
    })
    describe('.close', () => {
      it('closes connection', async () => {
        socket = new Socket()
        await socket.open()
        await socket.close()
        expect(typeof socket.connection).to.equal('undefined')
      })
    })
    describe('.send', () => {
      it('sends websocket message to host', async () => {
        socket = new Socket()
        await socket.open()
        const sent = await socket.send({ msg: 'ping' }, 'pong')
        expect(sent).to.have.keys(['msg', 'id'])
      })
      it('good async methods resolve with data', async () => {
        socket = new Socket()
        await socket.open()
        const data = await socket.send({
          msg: 'method',
          method: 'getServerInfo'
        })
        expect(data.result).to.have.property('version')
      })
      it('bad async methods reject with errors', async () => {
        socket = new Socket()
        await socket.open()
        return socket.send({
          msg: 'method', method: 'registerUser', params: [{
            email: 'not-an-email',
            pass: 'pass',
            name: 'ddp-test'
          }]
        })
          .then(() => expect(true).to.equal(false))
          .catch((err) => expect(err.message).to.match(/invalid email/i))
      })
    })
    describe('.login', () => {
      it('resolves with login result', async () => {
        socket = new Socket()
        await socket.open()
        const result = await socket.login()
          .catch((err) => expect(typeof err).to.equal('undefined'))
        expect(isLoginResult(result)).to.equal(true)
      })
      it('socket keeps username of user', async () => {
        socket = new Socket()
        await socket.open()
        await useSim()
        await socket.login({
          username: sim.username,
          password: sim.password
        })
          .catch((err) => expect(typeof err).to.equal('undefined'))
        expect(socket.user).to.have.property('username', sim.username)
      })
      it('rejects with unknown user', async () => {
        socket = new Socket()
        await socket.open()
        return socket.login({
          username: 'nobody',
          password: 'nothing'
        })
          .then(() => expect(true).to.equal(false))
          .catch((err) => expect(err.error).to.equal(403))
      })
      it('can call restricted methods for user', async () => {
        socket = new Socket()
        await socket.open()
        const subs = await socket.call('subscriptions/get')
        expect(subs).to.be.an('array')
      })
      it('can use resolved token to resume login', async () => {
        socket = new Socket()
        await socket.open()
        const resume = await socket.login()
        await socket.close()
        socket.resume = null
        await socket.open()
        await socket.login(resume)
        expect(socket.loggedIn).to.equal(true)
      })
      it('same user with consecutive logins does not re-login', async () => {
        socket = new Socket()
        const spy = sinon.spy(socket, 'call')
        await socket.login()
        sinon.assert.calledWithExactly(spy, 'login', socket.credentials)
        spy.resetHistory()
        await socket.login()
        sinon.assert.notCalled(spy)
      })
      it('login with consecutive users overrides session', async () => {
        socket = new Socket()
        await useSim()
        const resumeA = await socket.login()
        const resumeB = await socket.login({
          username: sim.username,
          password: sim.password
        })
        expect(resumeA.id).to.not.equal(resumeB.id)
        expect(resumeB.id).to.equal(sim.id)
        expect(socket.resume).to.have.property('id', sim.id)
        const resumeC = await socket.login()
        expect(resumeC.id).to.equal(resumeA.id)
        expect(socket.resume).to.have.property('id', resumeA.id)
      })
      it('.open resumes login with existing token', async () => {
        socket = new Socket()
        await socket.open()
        await socket.login()
        await socket.close()
        await socket.open()
        expect(socket.loggedIn).to.equal(true)
      })
    })
    describe('.logout', () => {
      it('removes all subscriptions', async () => {
        socket = new Socket()
        await socket.open()
        await socket.login()
        const stub = sinon.stub(socket, 'unsubscribeAll').resolves()
        await socket.logout()
        sinon.assert.calledOnce(stub)
      })
    })
    describe('.loggedIn', () => {
      it('true when logged in', async () => {
        socket = new Socket()
        await socket.open()
        await socket.login()
        expect(socket.loggedIn).to.equal(true)
      })
      it('false before logged in', async () => {
        socket = new Socket()
        await socket.open()
        expect(socket.loggedIn).to.equal(false)
      })
      it('false after logged out', async () => {
        socket = new Socket()
        await socket.open()
        await socket.login()
        await socket.logout()
        expect(socket.loggedIn).to.equal(false)
      })
    })
    describe('.subscribe', () => {
      it('resolves with subscription ID', async () => {
        socket = new Socket()
        await socket.open()
        await socket.login()
        const name = 'stream-room-messages'
        const room = '__my_messages__'
        const sub = await socket.subscribe(name, [room, true])
          .catch((err) => expect(typeof err).to.equal('undefined'))
        expect(sub).to.include.keys('id', 'name', 'unsubscribe')
      })
      it('handler fires callback with event data', () => {
        return new Promise(async (resolve) => {
          socket = new Socket()
          await socket.open()
          await socket.login()
          const name = 'stream-room-messages'
          const room = '__my_messages__'
          await socket.subscribe(name, [room, true], (data) => {
            expect(data.msg).to.equal('changed')
            resolve(data)
          })
          await socket.call('sendMessage', { rid: 'GENERAL', msg: 'sub test' })
        })
      })
      it('handler fires callback on every event', async function () {
        socket = new Socket()
        await socket.open()
        await socket.login()
        const name = 'stream-room-messages'
        const room = '__my_messages__'
        const spy = sinon.spy()
        await socket.subscribe(name, [room, true], spy)
        await socket.call('sendMessage', { rid: 'GENERAL', msg: 'sub test 1' })
        await socket.call('sendMessage', { rid: 'GENERAL', msg: 'sub test 2' })
        await socket.call('sendMessage', { rid: 'GENERAL', msg: 'sub test 3' })
        sinon.assert.callCount(spy, 3)
        expect(spy.args.map((c) => c[0].fields.args[0].msg)).to.eql([
          'sub test 1', 'sub test 2', 'sub test 3'
        ])
      })
    })
    describe('.unsubscribe', () => {
      it('accepts subscription id and removes it', async () => {
        socket = new Socket()
        await socket.open()
        await socket.login()
        const name = 'stream-room-messages'
        const room = '__my_messages__'
        const sub = await socket.subscribe(name, [room, true])
        await socket.unsubscribe(sub.id)
          .catch(() => expect(true).to.equal(false))
        expect(Object.keys(socket.subscriptions)).to.not.contain(sub.id)
      })
      it('called from sub is alias to socket', async () => {
        socket = new Socket()
        const spy = sinon.spy(socket, 'unsubscribe')
        await socket.open()
        await socket.login()
        const name = 'stream-room-messages'
        const room = '__my_messages__'
        const sub = await socket.subscribe(name, [room, true])
        await sub.unsubscribe()
        sinon.assert.calledWithExactly(spy, sub.id)
      })
      it('ignores unknown subscriptions', async () => {
        socket = new Socket()
        await socket.open()
        await socket.login()
        await socket.unsubscribe('non-id')
          .catch(() => expect(true).to.equal(false))
          .then((result) => expect(typeof result).to.equal('undefined'))
      })
    })
    describe('.ping', () => {
      beforeEach(() => socket.close())
      it('sends on open', async () => {
        socket = new Socket({ ping: 20 })
        const spy = sinon.spy(socket, 'ping')
        await socket.open()
        await delay(30)
        sinon.assert.calledTwice(spy)
      })
      it('sets last ping time', async () => {
        socket = new Socket({ ping: 20 })
        await socket.open()
        const before = Date.now()
        await delay(30)
        const after = Date.now()
        expect(socket.lastPing).to.be.gte(before)
        expect(socket.lastPing).to.be.lte(after)
      })
    })
  })
})
