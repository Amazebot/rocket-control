import { Settings, IOptions } from './settings'

/** A series of settings items with shared option definition. */
export class Collection {
  /** Items in collection, share settings load/get/set. */
  items: { [key: string]: Settings }

  /** Create settings collection with initial options. */
  constructor (public options: IOptions) {
    this.items = { default: new Settings(this.options) }
  }

  /** Get an item in collection by key. */
  key = (key: string) => this.items[key]

  /** Load the default item. */
  load = () => this.key('default').load()

  /** Get setting for the default item. */
  get = (setting: string) => this.key('default').get(setting)

  /** Set value for the default item. */
  set = (setting: string, value: any) => this.key('default').set(setting, value)

  /** Add more options after load. */
  extend (newOptions: IOptions) {
    this.options = Object.assign({}, this.options, newOptions) // for new items
    for (let key in this.items) this.key(key).extend(newOptions) // for current
  }
}
