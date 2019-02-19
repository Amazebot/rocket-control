import 'mocha'
import { expect } from 'chai'
import { silence } from '@amazebot/logger'
import { socket, user as admin } from '@amazebot/rocket-socket'
import { user } from './user'
const testy = {
  name: 'Testy Mc-Test',
  username: 'testy',
  password: 'pass',
  email: 'bit-bucket+testy@test.smtp.org',
  roles: ['user'],
  joinDefaultChannels: false,
  requirePasswordChange: false,
  sendWelcomeEmail: false,
  verified: true
}

describe('[sims]', () => {
  before(async () => {
    await socket.login()
    silence()
  })
  after(async () => {
    await socket.logout()
    await user.deleteAll()
    await socket.close()
    silence(false)
  })
  describe('user', () => {
    describe('.nullAddress', () => {
      it('creates a null email using key', () => {
        expect(user.nullAddress('testing')).to.match(/\+testing@/)
      })
    })
    describe('.safeName', () => {
      it('returns string as username safe format', () => {
        expect(user.safeName('Testing One-Two')).to.equal('testingonetwo')
      })
    })
    describe('.lookup', () => {
      it('logs in via websocket', async () => {
        await socket.close()
        await user.lookup('anyone')
        expect(socket.loggedIn).to.equal(true)
      })
      it('can return user data for default (admin) user', async () => {
        const data = await user.lookup(admin.get('username'))
        expect(data).to.have.property('username', admin.get('username'))
      })
    })
    describe('.create', () => {
      beforeEach(async () => {
        await user.deleteUsername(testy.username)
        await user.deleteUsername(user.safeName(testy.name))
      })
      it('creates user from full attributes', async () => {
        const record = await user.create(testy)
        expect(record.account).to.eql(testy)
      })
      it('populates random password', async () => {
        const newAccount = Object.assign({}, testy)
        delete newAccount['password']
        const record = await user.create(newAccount)
        expect(record).to.have.property('account')
        expect(record.account.password).to.have.length.gte(12)
      })
      it('populates username from name', async () => {
        const newAccount = Object.assign({}, testy)
        delete newAccount['username']
        const record = await user.create(newAccount)
        expect(record).to.have.property('account')
        expect(record.account.username).to.equal(user.safeName(testy.name))
      })
      it('populates name from username', async () => {
        const newAccount = Object.assign({}, testy)
        delete newAccount['name']
        const record = await user.create(newAccount)
        expect(record).to.have.property('account')
        expect(record.account.name).to.equal(testy.username)
      })
      it('populates email with username address', async () => {
        const newAccount = Object.assign({}, testy)
        delete newAccount['email']
        const record = await user.create(newAccount)
        expect(record).to.have.property('account')
        expect(record.account.email).to.equal(user.nullAddress(testy.username))
      })
      it('can populate from just a name', async () => {
        const record = await user.create({ name: testy.name })
        expect(record.account).to.have.all.keys(...Object.keys(testy))
      })
      it('returns existing user if username exists', async () => {
        const recordA = await user.create({ username: 'original-user' })
        const recordB = await user.create({ username: 'original-user' })
        expect(recordA.id).to.equal(recordB.id)
      })
    })
    describe('.sendFromUser', () => {
      it('sends a message from the created user', async () => {
        const record = await user.random()
        const rid = 'GENERAL'
        const msg = 'sim-send-test'
        await user.sendFromUser(record.id, { rid, msg })
        const { messages } = await socket.call('getChannelHistory', {
          rid, inclusive: true, count: 1
        })
        expect(messages[0]).to.have.property('msg', msg)
        expect(messages[0].u).to.have.property('_id', record.id)
      })
    })
    describe('.joinRoomWithUser', () => {
      it('joins the created user to a room', async () => {
        const record = await user.random()
        const rid = 'GENERAL'
        await user.joinRoomWithUser(record.id, rid)
        const { messages } = await socket.call('getChannelHistory', {
          rid, inclusive: true, count: 1
        })
        expect(messages[0]).to.have.property('t', 'uj')
        expect(messages[0].u).to.have.property('_id', record.id)
      })
    })
    describe('.leaveRoomWithUser', () => {
      it('leaves the created user from a room', async () => {
        const record = await user.random()
        const rid = 'GENERAL'
        await user.joinRoomWithUser(record.id, rid)
        await user.leaveRoomWithUser(record.id, rid)
        await socket.login()
        const { messages } = await socket.call('getChannelHistory', {
          rid, inclusive: true, count: 1
        })
        expect(messages[0]).to.have.property('t', 'ul')
        expect(messages[0].u).to.have.property('_id', record.id)
      })
    })
    describe('.random', () => {
      it('creates a user with random name', async () => {
        const record = await user.random()
        expect(record.account).to.have.all.keys(...Object.keys(testy))
      })
      it('accepts attributes to override defaults', async () => {
        const record = await user.random({ roles: ['bot', 'user'] })
        const data = await user.lookup(record.account.username)
        expect(data!.roles).to.eql(['bot', 'user'])
      })
    })
    describe('deleteUser', () => {
      it('deletes user by ID', async () => {
        const record = await user.random()
        await user.deleteUser(record.id)
        const result = await user.lookup(record.account.username)
        expect(typeof user.records[record.id]).to.equal('undefined')
        expect(typeof result).to.equal('undefined')
      })
    })
    describe('.deleteAll', () => {
      it('deletes all created users', async () => {
        const recordA = await user.random()
        const recordB = await user.random()
        await user.deleteAll()
        const resultA = await user.lookup(recordA.account.username)
        const resultB = await user.lookup(recordB.account.username)
        expect(typeof resultA).to.equal('undefined')
        expect(typeof resultB).to.equal('undefined')
      })
    })
    describe('Record', () => {
      describe('.delete', () => {
        it('deletes own user account', async () => {
          const record = await user.random()
          await record.delete()
          const result = await user.lookup(record.id)
          expect(typeof user.records[record.id]).to.equal('undefined')
          expect(typeof result).to.equal('undefined')
        })
      })
      describe('.login', () => {
        it('logs in user via own socket', async () => {
          const record = await user.random()
          await record.login()
          expect(socket.resume).to.not.have.property('id', record.id)
          expect(record.socket!.resume).to.have.property('id', record.id)
        })
        it('users can call from parallel sockets', async () => {
          const recordA = await user.random()
          const recordB = await user.random()
          const socketA = await recordA.login()
          const socketB = await recordB.login()
          const nameA = await socketA.call('getUsernameSuggestion')
          const nameB = await socketB.call('getUsernameSuggestion')
          expect(recordA.socket!.resume).to.have.property('id', recordA.id)
          expect(recordB.socket!.resume).to.have.property('id', recordB.id)
          expect(nameA).to.include(recordA.account.username)
          expect(nameB).to.include(recordB.account.username)
          expect(nameA).to.not.equal(nameB)
        })
      })
    })
  })
})
