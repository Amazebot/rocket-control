import 'mocha'
import { expect } from 'chai'
import { Collection } from './collection'
const initOpts: any = { 'test-setting': { type: 'boolean', default: false } }

describe('[collection]', () => {
  describe('Collection', () => {
    describe('constructor', () => {
      it('inits with default settings item', () => {
        const collection = new Collection(initOpts)
        expect(collection.items.default.constructor.name).to.equal('Settings')
      })
    })
  })
})
