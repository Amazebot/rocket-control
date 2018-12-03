import 'mocha'
import { expect } from 'chai'
import { pilot } from './pilot'

describe('[pilot]', () => {
  describe('pilot', () => {
    it('loads default user values', () => {
      pilot.user.load()
      expect(pilot.user.get('username')).to.equal('admin')
      expect(pilot.user.get('password')).to.equal('pass')
    })
    it('loads default instance values', () => {
      pilot.instance.load()
      expect(pilot.instance.get('url')).to.equal('localhost:3000')
      expect(pilot.instance.get('ssl')).to.equal(false)
    })
    it('loads additional users by key', () => {
      process.env.RC_TEST_USERNAME = 'tester'
      pilot.user.key('test').load('test')
      expect(pilot.user.key('test').get('username')).to.equal('tester')
    })
    it('loads additional instances by key', () => {
      process.env.RC_TESTING_URL = 'testing.rc'
      pilot.instance.key('testing').load('testing')
      expect(pilot.instance.key('testing').get('url')).to.equal('testing.rc')
    })
  })
})
