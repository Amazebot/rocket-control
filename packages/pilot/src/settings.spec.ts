import 'mocha'
import { expect } from 'chai'
import { Settings, IOptions, hyphenate, camelCase, envFormat } from './settings'
let initOpts: IOptions = { 'test-setting': { type: 'boolean', default: false } }

describe('[pilot]', () => {
  beforeEach(() => process.env.RC_TEST_SETTING = undefined)
  describe('.envFormat', () => {
    it('converts hyphenated value to env format', () => {
      expect(envFormat('my-var')).to.equal('MY_VAR')
    })
    it('converts camel case to env format', () => {
      expect(envFormat('myVar')).to.equal('MY_VAR')
    })
    it('leaves env format value unchanged', () => {
      expect(envFormat('MY_VAR')).to.equal('MY_VAR')
    })
  })
  describe('.hyphenate', () => {
    it('converts env format to hyphenated value', () => {
      expect(hyphenate('MY_VAR')).to.equal('my-var')
    })
    it('converts camel case to hyphenated value', () => {
      expect(hyphenate('myVar')).to.equal('my-var')
    })
    it('leaves hyphenated value unchanged', () => {
      expect(hyphenate('my-var')).to.equal('my-var')
    })
  })
  describe('.camelCase', () => {
    it('converts env format to camel case value', () => {
      expect(camelCase('MY_VAR')).to.equal('myVar')
    })
    it('converts hyphenated to camel case value', () => {
      expect(camelCase('my-var')).to.equal('myVar')
    })
    it('leaves camel case value unchanged', () => {
      expect(camelCase('myVar')).to.equal('myVar')
    })
  })
  describe('Settings', () => {
    describe('Constructor', () => {
      it('saves defined options', () => {
        const settings = new Settings(initOpts)
        expect(settings.options).to.have.property('test-setting')
      })
    })
    describe('.load', () => {
      it('loads option defaults', () => {
        const settings = new Settings(initOpts)
        settings.load()
        expect(settings.config).to.have.property('testSetting', false)
      })
      it('loads defined options from env with global prefix', () => {
        const settings = new Settings(initOpts)
        process.env.RC_TEST_SETTING = 'true'
        settings.load()
        expect(settings.config).to.have.property('testSetting', true)
      })
      it('loads options defined after init', () => {
        const settings = new Settings(initOpts)
        settings.options['test-custom'] = { type: 'boolean', default: true }
        settings.load()
        expect(settings.config).to.have.property('testCustom', true)
      })
      it('retains set values after load (instead of defaults)', () => {
        const settings = new Settings(initOpts)
        settings.load()
        settings.set('testSetting', true)
        settings.load()
        expect(settings.config).to.have.property('testSetting', true)
      })
      it('loads settings with key prefix', () => {
        const settings = new Settings(initOpts)
        process.env.RC_PREFIX_TEST_SETTING = 'true'
        settings.load('prefix')
        expect(settings.config).to.have.property('testSetting', true)
      })
    })
    describe('.reset', () => {
      it('returns assigned config to defaults', () => {
        const settings = new Settings(initOpts)
        settings.load()
        settings.config.testSetting = true
        settings.reset()
        expect(settings.config).to.have.property('testSetting', false)
      })
      it('returns set values to defaults', () => {
        const settings = new Settings(initOpts)
        settings.load()
        settings.set('testSetting', true)
        settings.reset()
        expect(settings.config).to.have.property('testSetting', false)
      })
      it('re-assigns environment vars overriding defaults', () => {
        const settings = new Settings(initOpts)
        process.env.RC_TEST_SETTING = 'true'
        settings.reset()
        expect(settings.config).to.have.property('testSetting', true)
      })
      it('nothing inherited after reload', () => {
        const settings = new Settings(initOpts)
        settings.load()
        settings.config.testCustom = true
        settings.reset()
        expect(settings.config).to.not.have.property('testCustom')
      })
    })
    describe('.set', () => {
      it('throws if called before load', () => {
        const settings = new Settings(initOpts)
        expect(() => settings.set('testSetting', true)).to.throw()
      })
      it('assigns given setting', () => {
        const settings = new Settings(initOpts)
        settings.load()
        settings.set('testSetting', true)
        expect(settings.config).to.have.property('testSetting', true)
      })
      it('retains settings after extending changes default', () => {
        const settings = new Settings(initOpts)
        settings.load()
        settings.set('testSetting', false)
        settings.extend({ 'testSetting': { type: 'boolean', default: true } })
        settings.load()
        expect(settings.config).to.have.property('testSetting', false)
      })
    })
    describe('.unset', () => {
      it('throws if called before load', () => {
        const settings = new Settings(initOpts)
        expect(() => settings.unset('testSetting')).to.throw()
      })
      it('restores defaults for options', () => {
        const settings = new Settings(initOpts)
        settings.load()
        settings.set('testSetting', true)
        settings.unset('testSetting')
        expect(settings.config).to.have.property('testSetting', false)
      })
      it('subsequent loads get defaults', () => {
        const settings = new Settings(initOpts)
        settings.load()
        settings.set('testSetting', true)
        settings.unset('testSetting')
        settings.load()
        expect(settings.config).to.have.property('testSetting', false)
      })
    })
    describe('.extend', () => {
      it('allows defining new options after load', () => {
        const settings = new Settings(initOpts)
        process.env.RC_TEST_EXTEND = 'true'
        settings.load()
        expect(typeof settings.config.testExtend).to.equal('undefined')
        settings.extend({ 'test-extend': { type: 'boolean' } })
        settings.load()
        expect(settings.config.testExtend).to.equal(true)
      })
    })
  })
})
