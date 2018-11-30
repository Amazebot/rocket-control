import 'dotenv/config'
import * as yargs from 'yargs'

/** Utility for converting option keys, from fooBar to foo-bar. */
export function hyphenate (str: string) {
  return str.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`)
}

/** Utility for converting option keys, from foo-bar to fooBar */
export function camelCase (str: string) {
  return str.replace(/-([a-z])/gi, (g) => g[1].toUpperCase())
}

/** Interface for collection of Yargs options. */
export interface IOptions { [key: string]: yargs.Options }

/** Alias for Yargs loaded settings interface. */
export interface IConfig { [key: string]: any }

/** Load/reload/get/set config from command line args, files and in code. */
export class Settings {
  /** Collection of yargs options, can be extended at runtime. */
  options: IOptions
  /** Access all settings from argv, env, package and custom config files. */
  config: IConfig = {}
  /** Keep all manually assigned configs, to be retained on reload. */
  updates: { [key: string]: any } = {}

  /** Create settings instance with initial options. */
  constructor (public initOptions: IOptions) {
    this.options = Object.assign({}, initOptions)
  }

  /**
   * Combine and load config from command line, env and JSON if provided.
   * The loaded argv object will have known settings copied to the config
   * object against the camel case variant of the option name.
   * @param key
   */
  load (prefix?: string) {
    const opts: { [key: string]: yargs.Options } = {}
    for (let key in this.options) {
      const opt = Object.assign({}, this.options[key])
      if (typeof opt.global === 'undefined') opt.global = false
      if (prefix) key = `${prefix}-${key}`
      opts[key] = opt
    }
    const args = yargs
      .options(opts)
      .usage('\nUsage: $0 [args]')
      .env('RC')
      .pkgConf('rcConfig')
      .config()
      .alias('config', 'c')
      .example('config', '-c rc-config.json')
      .alias('version', 'v')
      .strict()
      .argv
    const loaded: { [key: string]: any } = {}
    for (let key in this.options) {
      loaded[camelCase(key)] = prefix ? args[`${prefix}-${key}`] : args[key]
    }
    this.config = Object.assign({}, loaded, this.updates)
    return this.config
  }

  /** Generic config getter */
  get (key: string) {
    if (this.config) return this.config[key]
  }

  /** Generic config setter */
  set (key: string, value: any) {
    if (!this.config) throw new Error('Cannot set settings before `.load()`.')
    this.config[key] = value
    this.updates[key] = value
  }

  /** Generic config clear */
  unset (key: string) {
    if (!this.config) throw new Error('Cannot unset settings before `.load()`.')
    delete this.config[key]
    delete this.updates[key]
    const opt = this.options[hyphenate(key)]
    if (opt) this.config[key] = opt.default
  }

  /** Reload config without taking on post load settings. */
  reset () {
    this.options = Object.assign({}, this.initOptions)
    this.updates = {}
    this.load()
  }

  /** Add more options after load */
  extend (newOptions: IOptions) {
    this.options = Object.assign({}, this.options, newOptions)
  }
}

if (process.platform !== 'win32') process.on('SIGTERM', () => process.exit(0))
