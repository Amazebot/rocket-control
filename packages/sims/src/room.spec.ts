import 'mocha'
import { expect } from 'chai'
import { silence } from '@amazebot/logger'
import { Socket, socket } from '@amazebot/rocket-socket'
import { room } from './room'
const testName = 'rocket-sim-room-test'
const testNameP = 'rocket-sim-room-test-private'
let testId: string

// Note tests require assuming `robot` role to perform restricted model queries.
// This may also prompt creating the `robot` role on the instance for testing.

// Tests setup creates test channel for querying and deletes private room to
// ensure it can be created fresh.

describe('[sims]', () => {
  before(async () => {
    const { username } = await socket.login()
    await socket.call('authorization:saveRole', { name: 'robot' })
    await socket.call('authorization:addUserToRole', 'robot', username)
    await socket.call('createChannel', testName)
      .catch(() => socket.call('getRoomIdByNameOrId', testName))
      .then((result) => testId = (result.rid) ? result.rid : result)
    silence()
  })
  after(async () => {
    await socket.login()
    await room.deleteAll()
    await socket.logout()
    await socket.close()
    silence(false)
  })
  describe('room', () => {
    describe('.use', () => {
      it('replaces inherited socket with one given', () => {
        const newSocket = new Socket()
        newSocket.host = 'foo.bar'
        room.use(newSocket)
        expect(room.socket).to.eql(newSocket)
        expect(room.socket).to.not.eql(socket)
        room.use(socket)
      })
    })
    describe('.safeName', () => {
      it('makes name safe', () => {
        expect(room.safeName('Room! Uns$afe')).to.equal('room-unsafe')
      })
    })
    describe('.lookup', () => {
      it('finds existing room ID', async () => {
        const rid = await room.lookup(testName)
        expect(rid).to.equal(testId)
      })
    })
    describe('.create', () => {
      it('returns existing ID if room exists', async () => {
        const created = await room.create({ name: testName })
        expect(created).to.contain({ name: testName, id: testId })
      })
      it('creates public room with given name', async () => {
        const random = Math.random().toString(36).substring(7)
        const created = await room.create({ name: random })
        const rid = await socket.call('getRoomIdByNameOrId', random)
        expect(typeof rid).to.equal('string')
        expect(created.id).to.equal(rid)
      })
      it('can create private room with second argument', async () => {
        const created = await room.create({ name: testNameP }, true)
        const result = await socket.call('robot.modelCall', 'Rooms', 'findOneByIdOrName', [created.id])
        expect(result).to.have.property('t', 'p')
        await created.delete()
      })
    })
  })
})
