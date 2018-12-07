import 'mocha'
import { expect } from 'chai'
import { silence } from '@amazebot/logger'
import { Socket } from '@amazebot/rocket-socket'
import { INewUser, IUser } from './interfaces'
import * as api from './api'

// The Mock user, will send messages via API for the bot to respond to
export const mockUser: INewUser = {
  email: 'bit-bucket+user@test.smtp.org',
  name: 'Mock User',
  password: 'mock',
  username: 'mock',
  active: true,
  roles: ['user'],
  joinDefaultChannels: false,
  requirePasswordChange: false,
  sendWelcomeEmail: false,
  verified: true
}

silence() // suppress log during tests (disable this while developing tests)

// Connect to Rocket.Chat via DDP and provision for tests
export const setup = async () => {
  socket = new Socket()
  await socket.open()
  await socket.login()
}

// Remove mock user and disconnect
export const teardown = async () => {
  await socket.close()
}

// Socket connection - populated in before hooks
let socket: Socket

// Connect to localhost via DDP for test setup (uses default or env user/pass)
const connect = async () => {
  socket = new Socket()
  await socket.open()
  await socket.login()
}
const disconnect = async () => {
  await socket.close()
}

// Livechat data - populated in before hooks
let token: string
let department: string
let room: any
let rid: any
let newMessage: any
let editMessage: any
let pageInfo: any
let email = 'sample@rocket.chat'

describe('api', () => {
  afterEach(() => api.logout())
  describe.only('.success', () => {
    it('returns true when result status is 200', () => {
      expect(api.success({ status: 200 })).to.equal(true)
    })
    it('returns true when success is 300', () => {
      expect(api.success({ status: 300 })).to.equal(true)
    })
    it('returns false when result status is 400', () => {
      expect(api.success({ status: 401 })).to.equal(false)
    })
    it('returns false when success is 500', () => {
      expect(api.success({ status: 500 })).to.equal(false)
    })
    it('returns true if status is not given', () => {
      expect(api.success({})).to.equal(true)
    })
  })
  describe.only('.get', () => {
    before(() => connect())
    it('returns data from basic call without auth', async () => {
      const server = await socket.call('getServerInfo')
      const result = await api.get('info', {}, false)
      expect(result).to.eql({
        info: { version: server.version },
        success: true
      })
    })
    it('returns data from complex calls with auth and parameters', async () => {
      await api.login()
      const result = await api.get('users.list', {
        fields: { 'username': 1 },
        query: { username: 'rocket.cat', type: { $in: ['user', 'bot'] } }
      }, true)
      const users = result.users.map((user: IUser) => user.username)
      expect(users).to.include('rocket.cat', mockUser.username)
    })
    after(() => disconnect())
  })
  describe('.login', () => {
    before(() => connect())
    it('logs in with the default user without arguments', async () => {
      const login = await api.login()
      expect(login.data.userId).to.equal(socket.resume!.id)
    })
    it('logs in with another user if given credentials', async () => {
      await api.login({
        username: mockUser.username,
        password: mockUser.password
      })
      const mockInfo = await api.get('users.info', { username: mockUser.username })
      expect(api.currentLogin.userId).to.equal(mockInfo.user._id)
    })
    it('stores logged in user result', async () => {
      await api.login()
      expect(api.currentLogin.userId).to.equal(driver.userId)
    })
    after(() => disconnect())
  })
  describe('.logout', () => {
    it('resets auth headers and clears user ID', async () => {
      await api.login().catch(e => console.log('login error', e))
      await api.logout().catch(e => console.log('logout error', e))
      expect(api.currentLogin).to.eql(null)
    })
  })
  describe('.livechat', () => {
    before(async () => {
      await connect() // make bot available as livechat agent
      try {
        if (token === '') {
          const { visitor } = await api.livechat.grantVisitor(mockVisitor)
          token = visitor && visitor.token
        }
        const result = await api.livechat.room({ token })
        room = result.room
        rid = room && room._id
        newMessage = { token, rid, msg: 'sending livechat message...' }
        editMessage = { token, rid, msg: 'editing livechat message...' }
        pageInfo = Object.assign({}, mockVisitorNavigation, { rid })
      } catch (err) {
        console.error(err)
        throw err
      }
    })
    after(() => disconnect())
    describe('.config', () => {
      it('returns data from basic Livechat initial config', async () => {
        const result = await api.livechat.config()
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('config')
        expect(result.config).to.include.all.keys([
          'enabled', 'settings', 'theme', 'messages', 'survey'
        ])
      })
      it('returns data from Livechat config with a valid token', async () => {
        const { token } = mockVisitor.visitor
        const result = await api.livechat.config({ token })
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('config')
        expect(result.config).to.include.all.keys([
          'enabled', 'settings', 'theme', 'messages', 'survey', 'guest', 'room', 'agent'
        ])
      })
    })
    describe('.rooms', () => {
      it('requests a Livechat transfer', async () => {
        const result = await api.livechat.transferChat({ rid, token, department })
        expect('Content-Type', 'application/json')
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('room')
        expect(result.room).to.have.property('servedBy')
        expect(result.room).to.have.property('open')
        expect(result.room).to.have.property('departmentId')
      })
      it('sends a Livechat survey', async () => {
        const result = await api.livechat.chatSurvey({ rid, token, data: mockSurvey })
        expect('Content-Type', 'application/json')
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('rid')
        expect(result).to.have.property('data')
      })
      it('requests a Livechat video call', async () => {
        const result = await api.livechat.videoCall({ rid, token })
        expect('Content-Type', 'application/json')
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('videoCall')
      })
      it('close a Livechat room', async () => {
        const result = await api.livechat.closeChat({ rid, token })
        expect('Content-Type', 'application/json')
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('rid')
        expect(result).to.have.property('comment')
      })
      it('requests a Livechat transcript', async () => {
        const result = await api.livechat.requestTranscript(email, { rid, token })
        expect('Content-Type', 'application/json')
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('message')
      })
    })
    describe('.agents', () => {
      it('returns data of a given Livechat room', async () => {
        const result = await api.livechat.agent({ rid, token })
        expect('Content-Type', 'application/json')
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('agent')
        expect(result.agent).to.have.property('emails')
        expect(result.agent).to.have.property('name')
        expect(result.agent).to.have.property('username')
      })
      it('returns the data of the next Livechat agent available', async () => {
        const result = await api.livechat.nextAgent({ token, department })
        expect('Content-Type', 'application/json')
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('agent')
        expect(result.agent).to.have.property('emails')
        expect(result.agent).to.have.property('name')
        expect(result.agent).to.have.property('username')
      })
    })
    describe('.messages', () => {
      it('sends a new Livechat message', async () => {
        const result = await api.livechat.sendMessage(newMessage)
        expect('Content-Type', 'application/json')
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('message')
        expect(result.message).to.have.property('_id')
        expect(result.message).to.have.property('msg')
        expect(result.message).to.have.property('u')
      })
      it('edit a Livechat Message', async () => {
        const msg = await api.livechat.sendMessage(newMessage)
        const _id = msg && msg.message && msg.message._id
        const result = await api.livechat.editMessage(_id, editMessage)
        expect('Content-Type', 'application/json')
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('message')
        expect(result.message).to.have.property('_id')
        expect(result.message).to.have.property('msg')
        expect(result.message).to.have.property('u')
      })
      it('retrieves a list of Livechat messages', async () => {
        const result = await api.livechat.loadMessages(rid, { token })
        expect('Content-Type', 'application/json')
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('messages')
        const messages = result.messages.map((msg) => msg.rid)
        expect(messages).to.include(rid)
      })
      it('deletes a Livechat message', async () => {
        const msg = await api.livechat.sendMessage(newMessage)
        const _id = msg && msg.message && msg.message._id
        const result = await api.livechat.deleteMessage(_id, { token, rid })
        expect('Content-Type', 'application/json')
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('message')
        expect(result.message).to.have.property('_id')
        expect(result.message._id).to.equal(_id)
      })
      it('sends a Livechat offline message', async () => {
        const result = await api.livechat.sendOfflineMessage(mockOfflineMessage)
        expect('Content-Type', 'application/json')
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('message')
      })
      it('sends a Livechat visitor navigation history', async () => {
        const result = await api.livechat.sendVisitorNavigation({ token, rid }, pageInfo)
        expect('Content-Type', 'application/json')
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('page')
        expect(result.page).to.have.property('msg')
        expect(result.page).to.have.property('navigation')
        expect(result.page.navigation).to.have.property('token')
        expect(result.page.navigation.token).to.equal(token)
      })
    })
    describe('.visitors', () => {
      it('registers and grants access to a Livechat visitor', async () => {
        const result = await api.livechat.grantVisitor(mockVisitor)
        expect('Content-Type', 'application/json')
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('visitor')
        expect(result.visitor).to.have.property('token')
        expect(result.visitor.token).to.equal(token)
      })
      it('assigns a customField to a Livechat visitor', async () => {
        const result = await api.livechat.sendCustomField(mockCustomField)
        expect('Content-Type', 'application/json')
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('field')
        expect(result.field).to.have.property('key')
        expect(result.field.key).to.equal(mockCustomField.key)
        expect(result.field).to.have.property('value')
        expect(result.field.value).to.equal(mockCustomField.value)
      })
      it('assigns an array of customFields to a Livechat visitor', async () => {
        const result = await api.livechat.sendCustomFields(mockCustomFields)
        expect('Content-Type', 'application/json')
        expect(200)
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('fields')
      })
    })
  })
})
