import 'mocha'
import { expect } from 'chai'
import * as rc from '.'

describe('pilot', () => {
  it('exports pilot instance', () => {
    expect(rc.pilot).to.be.instanceOf(rc.Pilot)
  })
})
