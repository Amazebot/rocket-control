import 'mocha'
import { expect } from 'chai'
import {
  isLoginPass,
  ICredentialsPass,
  isLoginOAuth,
  ICredentialsOAuth,
  isLoginResult,
  ILoginResult,
  isLoginAuthenticated,
  ICredentialsAuthenticated
} from './interfaces'

describe('[socket]', () => {
  describe('interfaces', () => {
    describe('.isLoginPass', () => {
      it('true for valid password credentials', () => {
        const credentials: ICredentialsPass = {
          user: { username: 'name' },
          password: { digest: 'hash', algorithm: 'algo' }
        }
        expect(isLoginPass(credentials)).to.equal(true)
      })
      it('false for undefined', () => {
        expect(isLoginPass(undefined)).to.equal(false)
      })
      it('false for invalid format', () => {
        const credentials: any = {
          user: 'username',
          password: 'password'
        }
        expect(isLoginPass(credentials)).to.equal(false)
      })
    })
    describe('.isLoginOAuth', () => {
      it('true for valid oauth credentials', () => {
        const credentials: ICredentialsOAuth = {
          oauth: { credentialToken: 'token', credentialSecret: 'secret' }
        }
        expect(isLoginOAuth(credentials)).to.equal(true)
      })
      it('false for undefined', () => {
        expect(isLoginOAuth(undefined)).to.equal(false)
      })
      it('false for invalid format', () => {
        const credentials: any = {
          credentialToken: 'token', credentialSecret: 'secret'
        }
        expect(isLoginOAuth(credentials)).to.equal(false)
      })
    })
    describe('.isLoginResult', () => {
      it('true for valid login token', () => {
        const credentials: ILoginResult = {
          id: 'user', token: 'token', type: 'test'
        }
        expect(isLoginResult(credentials)).to.equal(true)
      })
      it('false for undefined', () => {
        expect(isLoginResult(undefined)).to.equal(false)
      })
      it('false for invalid format', () => {
        const credentials: any = {
          credentialToken: 'token', credentialSecret: 'secret'
        }
        expect(isLoginResult(credentials)).to.equal(false)
      })
    })
    describe('.isLoginAuthenticated', () => {
      it('true for valid login resume token', () => {
        const credentials: ICredentialsAuthenticated = {
          resume: 'token'
        }
        expect(isLoginAuthenticated(credentials)).to.equal(true)
      })
      it('false for undefined', () => {
        expect(isLoginAuthenticated(undefined)).to.equal(false)
      })
      it('false for invalid format', () => {
        const credentials: any = 'resume'
        expect(isLoginAuthenticated(credentials)).to.equal(false)
      })
    })
  })
})
