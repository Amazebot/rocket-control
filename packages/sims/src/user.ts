import { logger } from '@amazebot/logger'
import { socket as _socket, Socket, ILoginResult } from '@amazebot/rocket-socket'
import * as faker from 'faker'

/** Cut-down interface for basic message sends. */
interface IMessage { rid: string, msg: string, [key: string]: any }

export namespace user {
  export let socket: Socket = _socket

  /** Use a given socket (to override default) */
  export function use (newSocket: Socket) {
    socket = newSocket
  }

  /** Returned from getFullUserData */
  export interface IUserData {
    _id: string
    createdAt: { '$date': number }
    name: string
    username: string
    status: string
    utcOffset: number
    active: boolean
    type: string
    services: { password: any, resume: any }
    roles: string[]
    lastLogin: { '$date': number }
    statusConnection: string
  }

  /** Required attributes for user creation. */
  export interface INewUser {
    name?: string
    username?: string
    password?: string
    email?: string
    roles?: string[]
    joinDefaultChannels?: boolean
    requirePasswordChange?: boolean
    sendWelcomeEmail?: boolean
    verified?: boolean
    [custom: string]: any
  }

  /** Require at least a name for new user. */
  export interface INewUserByName extends INewUser {
    name: string
  }

  /** Require at least a username for new user. */
  export interface INewUserByUsername extends INewUser {
    username: string
  }

  /** User type requires at least name or username. */
  export type NewUser = INewUserByName | INewUserByUsername

  /** Once created, users have all properties assigned. */
  export interface IUserAccount {
    name: string
    username: string
    password: string
    email: string
    roles: string[]
    joinDefaultChannels: boolean
    requirePasswordChange: boolean
    sendWelcomeEmail: boolean
    verified: boolean
    [custom: string]: any
  }

  /** Defaults merged with new user attributes. */
  export const accountDefaults = {
    roles: ['user'],
    joinDefaultChannels: false,
    requirePasswordChange: false,
    sendWelcomeEmail: false,
    verified: true
  }

  /** User record allows sending from user and self deletion. */
  export class Record {
    resume?: ILoginResult
    socket?: Socket

    /** Create new record of account attributes. */
    constructor (public id: string, public account: IUserAccount) {
      records[id] = this
    }

    /** Login using known credentials if they exist. */
    async login () {
      this.socket = new Socket()
      await socket.open()
      const credentials = (this.resume)
        ? this.resume
        : { username: this.account.username, password: this.account.password }
      this.resume = await this.socket.login(credentials)
      return this.socket
    }

    /** Proxy self-deletion via collection method. */
    delete = () => deleteUser(this.id)

    /** Proxy self-send via collection method. */
    send = (message: IMessage) => sendFromUser(this.id, message)

    /** Proxy self-join a room by ID. */
    join = (rid: string) => joinRoomWithUser(this.id, rid)

    /** Proxy self-leave a room by ID. */
    leave = (rid: string) => leaveRoomWithUser(this.id, rid)
  }

  /** Keep known and/or created user records. */
  export const records: { [id: string]: Record } = {}

  /** Pass a unique name to assign to null email address. */
  export function nullAddress (key: string) {
    return `bit-bucket+${key.replace(/[-_.@\s]/g, '')}@test.smtp.org`
  }

  /** Convert a full name to a safe username. */
  export function safeName (name: string) {
    return name.toLowerCase().replace(/[-_.@\s]/g, '')
  }

  /** Lookup user data. */
  export async function lookup (username: string) {
    await socket.login()
    const result = await socket.call('getFullUserData', { username, limit: 1 })
    if (!Array.isArray(result) || result.length === 0) return
    const data: IUserData = result[0]
    return data
  }

  /** Create (and/or remember) a user account from credentials. */
  export async function create (user: NewUser) {
    await socket.login()
    const account = Object.assign({}, accountDefaults, user)
    if (!account.password) account.password = faker.internet.password()
    if (!account.name) account.name = account.username
    if (!account.username) account.username = safeName(account.name!)
    if (!account.email) account.email = nullAddress(account.username)
    const existing = await lookup(account.username).catch()
    const _id = (existing)
      ? existing._id
      : await socket.call('insertOrUpdateUser', account)
    if (existing && typeof user.password === 'undefined') {
      logger.warning('[sims] Using existing user without setting password, login will fail.')
    }
    return new Record(_id, account as IUserAccount)
  }

  /** Delete a user by ID (to be called by proxy method on record). */
  export async function deleteUser (id: string) {
    await socket.login()
    const user = records[id]
    if (user.socket && user.socket!.loggedIn) {
      await user.socket.logout()
      await user.socket.close()
    }
    socket.call('deleteUser', id).catch()
    delete records[id]
  }

  /** Delete a user by username if they exist. */
  export async function deleteUsername (username: string) {
    await socket.login()
    const user = await lookup(username)
    if (user) await deleteUser(user._id)
  }

  /** Send a message from a user to a room. */
  export async function sendFromUser (id: string, message: IMessage) {
    const record = records[id]
    const userSocket = await record.login()
    return userSocket.call('sendMessage', message)
  }

  /** Join a user to a room by ID. */
  export async function joinRoomWithUser (id: string, rid: string) {
    const record = records[id]
    const userSocket = await record.login()
    return userSocket.call('joinRoom', rid)
  }

  /** Leave a user from a room by ID. */
  export async function leaveRoomWithUser (id: string, rid: string) {
    const record = records[id]
    const userSocket = await record.login()
    return userSocket.call('leaveRoom', rid)
  }

  /** Create a random user. */
  export async function random (customData?: INewUser) {
    const account = Object.assign({}, {
      name: faker.name.firstName().toString()
    }, customData)
    return create(account)
  }

  /** Delete all users created in this session. */
  export async function deleteAll () {
    for (let id in records) await deleteUser(id)
  }
}

export default user
