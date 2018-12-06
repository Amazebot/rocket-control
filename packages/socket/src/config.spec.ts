import 'mocha'
import { expect } from 'chai'
import { user, instance } from './config'

describe('[socket]', () => {
  describe('config', () => {
    describe('.user', () => {
      it('loads default user values', () => {
        expect(user.get('username')).to.equal('admin')
        expect(user.get('password')).to.equal('pass')
      })
    })
    describe('.instance', () => {
      it('loads default instance values', () => {
        expect(instance.get('url')).to.equal('localhost:3000')
        expect(instance.get('ssl')).to.equal(false)
      })
    })
  })
})
