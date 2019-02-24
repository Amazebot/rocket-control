import { logger } from '@amazebot/logger'
import { socket as _socket, Socket } from '@amazebot/rocket-socket'
import * as faker from 'faker'

export namespace room {
  export let socket: Socket = _socket

  /** Use a given socket (to override default) */
  export function use (newSocket: Socket) {
    socket = newSocket
  }

  /** Expected params for creating channel or private room. */
  export interface INewRoom {
    name: string,
    members?: string[],
    readOnly?: boolean,
    customFields?: { [key: string]: any }
    extraData?: { [key: string]: any }
  }

  /** Result of creating new public or private room. */
  export interface INewRoomResult {
    rid: string,
    name: string
  }

  /** Room record allows managing created rooms. */
  export class Record {
    /** Proxy room delete method to self-delete. */
    delete = () => deleteRoom(this.id)

    /** Create new record of room attributes. */
    constructor (
      public name: string,
      public id: string
    ) {
      records[id] = this
    }
  }

  /** Keep known and/or created room records. */
  export const records: { [id: string]: Record } = {}

  /** Convert a full name to a safe username. */
  export function safeName (name: string) {
    return name.toLowerCase().replace(/[\s]/g, '-').replace(/[^\w-]/g, '')
  }

  /** Lookup room data. */
  export async function lookup (name: string) {
    await socket.login()
    try {
      const result = await socket.call('getRoomIdByNameOrId', name) as string
      return result
    } catch (err) {
      logger.debug(`[sims] Room lookup failed for ${name}`)
    }
  }

  /** Create (and/or remember) a room from name and type. */
  export async function create (room: INewRoom, isPrivate: boolean = false) {
    await socket.login()
    let rid: string
    room.name = safeName(room.name)
    const existing = await lookup(room.name)
    if (existing) {
      rid = existing
      logger.info(`[sims] Room ${room.name} with ID ${rid}`)
    } else {
      const created: INewRoomResult = (isPrivate)
        ? await socket.call('createPrivateGroup', room.name)
        : await socket.call('createChannel', room.name)
      rid = created.rid
      logger.info(`[sims] Created room ${room.name} with ID ${rid}`)
    }
    return new Record(room.name, rid)
  }

  /** Create a random public room. */
  export async function randomChannel (customData?: INewRoom) {
    const room = Object.assign({ name: faker.random.word() }, customData)
    return create(room)
  }

  /** Create a random private room. */
  export async function randomPrivate (customData?: INewRoom) {
    const room = Object.assign({ name: faker.random.word() }, customData)
    return create(room, true)
  }

  /** Proxy for random channel creation as default random room type. */
  export const random = (data?: INewRoom) => randomChannel(data)

  /** Delete a room by ID (to be called by proxy method on record). */
  export async function deleteRoom (id: string) {
    await socket.login()
    await socket.call('eraseRoom', id).catch()
    delete records[id]
  }

  /** Delete a room by name if it exists. */
  export async function deleteRoomByName (name: string) {
    await socket.login()
    const rid = await lookup(name)
    if (rid) await deleteRoom(rid)
  }

  /** Delete all users created in this session. */
  export async function deleteAll () {
    for (let id in records) await deleteRoom(id)
  }
}

export default room
