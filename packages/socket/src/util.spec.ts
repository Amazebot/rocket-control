import 'mocha'
import { expect } from 'chai'
import { hostToWS } from './util'

describe('[socket]', () => {
  describe('util', () => {
    describe('.hostToWS', () => {
      it('converts hostname to ws url', () => {
        expect(hostToWS('localhost:3000')).to.equal('ws://localhost:3000')
      })
      it('converts http/s path to ws url', () => {
        expect(hostToWS('http://localhost:3000')).to.equal('ws://localhost:3000')
      })
      it('converts host to secure ws url', () => {
        expect(hostToWS('localhost:3000', true)).to.equal('wss://localhost:3000')
      })
    })
  })
})
