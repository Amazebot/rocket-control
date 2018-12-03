import 'mocha'
import { expect } from 'chai'
import * as rc from '.'

describe('[socket]', () => {
  it('exports socket instance', () => {
    expect(rc.socket).to.be.instanceOf(rc.Socket)
  })
})
