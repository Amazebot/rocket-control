import 'mocha'
import { expect } from 'chai'
import * as sinon from 'sinon'
import { Collection } from './collection'
const initOpts: any = { 'test-setting': { type: 'boolean', default: false } }

describe('[pilot]', () => {
  describe('Collection', () => {
    describe('constructor', () => {
      it('inits with default settings item', () => {
        const collection = new Collection(initOpts)
        expect(collection.items.default.constructor.name).to.equal('Settings')
      })
    })
    describe('.key', () => {
      it('returns settings item by key', () => {
        const collection = new Collection(initOpts)
        expect(collection.key('default')).to.eql(collection.items.default)
      })
      it('creates item if key not found', () => {
        const collection = new Collection(initOpts)
        expect(collection.key('extra')).to.eql(collection.items.extra)
        expect(collection.items.extra.constructor.name).to.equal('Settings')
      })
    })
    describe('.load', () => {
      it('calls .load on the default settings item', () => {
        const collection = new Collection(initOpts)
        const stub = sinon.stub(collection.items.default, 'load')
        collection.load()
        sinon.assert.calledOnce(stub)
      })
    })
    describe('.get', () => {
      it('calls .get on the default settings item', () => {
        const collection = new Collection(initOpts)
        const stub = sinon.stub(collection.items.default, 'get')
        collection.get('test')
        sinon.assert.calledWithExactly(stub, 'test')
      })
    })
    describe('.set', () => {
      it('calls .set on the default settings item', () => {
        const collection = new Collection(initOpts)
        const stub = sinon.stub(collection.items.default, 'set')
        collection.set('test', 'testing')
        sinon.assert.calledWithExactly(stub, 'test', 'testing')
      })
    })
    describe('.extend', () => {
      it('extends existing settings item', () => {
        const collection = new Collection(initOpts)
        const stub = sinon.stub(collection.items.default, 'extend')
        const newOpts: any = { 'new': { type: 'boolean', default: false } }
        collection.extend(newOpts)
        sinon.assert.calledWithExactly(stub, newOpts)
      })
      it('new settings items created with extended options', () => {
        const collection = new Collection(initOpts)
        const newOpts: any = { 'new': { type: 'boolean', default: false } }
        collection.extend(newOpts)
        const newItem = collection.key('new')
        expect(newItem.options).to.eql(Object.assign({}, initOpts, newOpts))
      })
    })
  })
})
