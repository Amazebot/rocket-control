/**
 * Connection options type
 * @param host        Host URL:PORT, converted to websocket protocol
 * @param ssl         Use SSL (https/wss) to connect
 * @param timeout     How long to wait (ms) before abandoning connection
 * @param reopen      ms interval before attempting reopens on disconnect
 * @param ping        ms interval between each ping
 * @param close       ms interval to wait for socket close to succeed
 * @param integration Name added to message `bot` attribute to identify SDK use
 */
export interface IOptions {
  host: string
  ssl: boolean
  timeout: number
  reopen: number
  ping: number
  close: number
  integration: string
}

/**
 * Websocket stream subscription
 * @param id          Subscription ID
 * @param name        Stream/collection name
 * @param unsubscribe Method for unsubscribing
 */
export interface ISubscription {
  id?: string
  name?: any
  unsubscribe: () => Promise<any>
  onEvent: (callback: ICallback) => void
  [key: string]: any
}

/** Function interface for DDP message handler callback */
export interface ICallback {
  (data: any): void
}

/**
 * DDP Message Handler defines attributes to match on incoming messages and
 * fire a callback. There may be multiple handlers for any given message.
 * @param callback    Function to call when matching message received
 * @param persist     Optionally (true) to continue using handler after matching
 * @param msg         The `data.msg` value to match in message
 * @param id          The `data.id` value to match in message
 * @param collection  The `data.collection` value to match in message
 */
export interface IHandler {
  callback: ICallback
  persist?: boolean
  msg?: string
  id?: string
  collection?: string
}

/** Alias for variety of credentials interfaces */
export type Credentials =
  ICredentialsPass |
  ICredentialsOAuth |
  ICredentialsAuthenticated |
  ILoginResult |
  ICredentials

/** User credentials generic interface */
export interface ICredentials {
  password: string
  username: string
  email?: string
  ldap?: boolean
  ldapOptions?: object
}

/** Basic username/password credential type guard */
export function isLoginBasic (params: any): params is ICredentials {
  return (
    typeof params !== 'undefined' &&
    typeof params.username !== 'undefined' &&
    typeof params.password !== 'undefined'
  )
}

/** User credentials for password login method */
export interface ICredentialsPass {
  user: { username: string }
  password: { digest: string, algorithm: string }
}

/** Password login credential type guard */
export function isLoginPass (params: any): params is ICredentialsPass {
  return (
    typeof params !== 'undefined' &&
    typeof params.user !== 'undefined' &&
    typeof params.password !== 'undefined' &&
    typeof params.user.username === 'string' &&
    typeof params.password.digest === 'string' &&
    typeof params.password.algorithm === 'string'
  )
}

/** User credentials for oath login method  */
export interface ICredentialsOAuth {
  oauth: {
    credentialToken: string
    credentialSecret: string
  }
}

/** Password login credential type guard */
export function isLoginOAuth (params: any): params is ICredentialsOAuth {
  return (
    typeof params !== 'undefined' &&
    typeof params.oauth !== 'undefined' &&
    typeof params.oauth.credentialToken === 'string' &&
    typeof params.oauth.credentialSecret === 'string'
  )
}

/** Response from login method (called by websocket) */
export interface ILoginResult {
  id: string, // userId
  token: string,
  tokenExpires?: { '$date': number },
  type: string,
  username?: string // added manually from credentials
}

/** Password login credential type guard */
export function isLoginResult (params: any): params is ILoginResult {
  return (
    typeof params !== 'undefined' &&
    typeof params.id === 'string' &&
    typeof params.token === 'string'
  )
}

/** User credentials for authenticated login method */
export interface ICredentialsAuthenticated {
  resume: string
}

/** Password login credential type guard */
export function isLoginAuthenticated (params: any): params is ICredentialsAuthenticated {
  return (
    typeof params !== 'undefined' &&
    typeof params.resume === 'string'
  )
}
