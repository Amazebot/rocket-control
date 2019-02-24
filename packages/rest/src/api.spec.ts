import 'mocha'
import { expect } from 'chai'
import { silence } from '@amazebot/logger'
import { Socket } from '@amazebot/rocket-socket'
import { user } from '@amazebot/rocket-sims'
import { IUser } from './interfaces'
import * as api from './api'
import { instance } from './config'

let sim: user.Record // Mock user
let simAccount: user.IUserAccount
let socket: Socket // Socket connection - populated in before hooks

describe('api', () => {
  before(async () => {
    silence()
    socket = new Socket()
    await socket.login()
    sim = await user.random()
    simAccount = sim.account!
  })
  after(async () => {
    await user.deleteAll()
    await socket.close()
    silence(false)
  })
  describe('.success', () => {
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
  describe('.login', () => {
    afterEach(() => api.logout())
    it('logs in with the default user without arguments', async () => {
      const login = await api.login()
      expect(login.data.userId).to.equal(socket.user!.id)
    })
    it('ignores consecutive login by same user', async () => {
      const loginA = await api.login()
      const loginB = await api.login()
      expect(loginA).to.eql(loginB)
    })
    it('logs in with another user if given credentials', async () => {
      const login = await api.login({
        username: simAccount.username,
        password: simAccount.password
      })
      expect(login.data.userId).to.equal(sim.id)
    })
    it('logs in with another user if already logged in', async () => {
      await api.login()
      const login = await api.login({
        username: simAccount.username,
        password: simAccount.password
      })
      expect(login.data.userId).to.equal(sim.id)
    })
    it('stores logged in user result', async () => {
      await api.login()
      expect(api.currentLogin!.userId).to.equal(socket.user!.id)
    })
  })
  describe('.logout', () => {
    it('resets auth headers and clears user ID', async () => {
      await api.login().catch(e => console.log('login error', e))
      await api.logout().catch(e => console.log('logout error', e))
      expect(api.currentLogin).to.eql(null)
    })
    it('ignores if already logged out', async () => {
      await api.logout()
      expect(async function () {
        await api.logout()
      }).to.not.throw()
    })
  })
  describe('.get', () => {
    it('returns data from basic call without auth', async () => {
      const server = await socket.call('getServerInfo')
      const result = await api.get('info', {}, false)
      expect(result.success).to.equal(true)
      expect(result.info).to.have.property('version', server.version)
    })
    it('returns data from complex calls with auth and parameters', async () => {
      await api.login()
      const result = await api.get('users.list', {
        fields: { 'username': 1 },
        query: { type: { $in: ['user', 'bot'] } }
      }, true)
      const usernames = result.users.map((user: IUser) => user.username)
      expect(usernames).to.include(simAccount.username)
    })
  })
  describe('.client', () => {
    it('returns with different server after config update', async () => {
      const defaultURL = api.client().defaults.baseURL
      instance.set('url', 'https://open.rocket.chat')
      const updatedURL = api.client().defaults.baseURL
      expect(defaultURL).to.not.equal(updatedURL)
      api.client().defaults.baseURL = defaultURL
      instance.reset()
    })
    it('accepts a new host and assigns URL for API', () => {
      const url = api.client('https://open.rocket.chat').defaults.baseURL
      expect(url).to.equal('https://open.rocket.chat/api/v1/')
    })
  })
})
