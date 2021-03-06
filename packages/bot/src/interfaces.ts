
/** Error-first callback param type */
export interface ICallback {
  (error: Error | null, ...args: any[]): void
}

/** Error-first callback for message stream events */
export interface IMessageCallback {
  (error: Error | null, message?: IMessage, meta?: IMessageMeta): void
}

/**
 * Enable/disable message stream callbacks for some sources.
 * @param dm          Respond to messages in direct message rooms
 * @param livechat    Respond to messages in livechat rooms
 * @param edited      Respond to edited messages
 */
export interface IMessageSources {
  direct?: boolean
  livechat?: boolean
  edited?: boolean
  [key: string]: boolean | undefined
}

/**
 * User (as attribute) schema
 * @param _id         Mongo collection ID generated by Random.id()
 * @param username    Username
 * @param name        Display name
 */
export interface IUser {
  _id: string
  username: string
  name?: string
}

/** Room type literal (channel private direct livechat) */
export type RoomType = 'c' | 'p' | 'd' | 'l'

/**
 * Message schema
 * @param rid         Room ID
 * @param _id         Mongo collection ID generated by Random.id()
 * @param t           Room type e.g. "c" for channel
 * @param msg         Text content
 * @param alias       ?
 * @param emoji       Emoji to use as avatar
 * @param avatar      URL of avatar image
 * @param groupable   Group with consecutive messages
 * @param bot         Integration details
 * @param urls        ?
 * @param mentions    ?
 * @param u           User who sent the message
 * @param ts          Message created timestamp
 * @param editedBy    User who edited the message
 * @param editedAt    When the message was edited
 */
export interface IMessage {
  rid: string | null
  _id?: string
  t?: string
  msg?: string
  alias?: string
  emoji?: string
  avatar?: string
  groupable?: boolean
  bot?: any
  urls?: string[]
  mentions?: string[]
  attachments?: IMessageAttachment[]
  reactions?: IMessageReaction
  location ?: IMessageLocation
  u?: IUser
  ts?: IMessageDate
  editedBy?: IUser
  editedAt?: IMessageDate
}

/** Format of Rocket.Chat internal time attributes. */
export interface IMessageDate { '$date': Date }

/**
 * Extra details emitted about message in stream events.
 * @param roomParticipant If the logged in user was joined to the room
 * @param roomType    Type of room (public, private, DM, livechat)
 * @param roomName    The room name if public or named private group
 */
export interface IMessageMeta {
  roomParticipant: boolean
  roomType: RoomType
  roomName?: 'general'
}

/**
 * Message receipt returned after send (not the same as sent object).
 * @todo Confirm why/if this is actually different to IMessage, e.g. msg vs text
 * @param _id         ID of sent message
 * @param rid         Room ID of sent message
 * @param alias       ?
 * @param msg         Content of message
 * @param parseUrls   URL parsing enabled on message hooks
 * @param groupable   Grouping message enabled
 * @param ts          Timestamp of message creation
 * @param _updatedAt  Time message last updated
 * @param editedAt    Time updated by edit
 */
export interface IMessageReceipt {
  _id: string
  rid: string
  alias: string
  msg: string
  parseUrls: boolean
  groupable: boolean
  u: IUser
  ts: IMessageDate
  _updatedAt: IMessageDate
  editedAt?: IMessageDate
  editedBy?: IUser
  attachments?: IMessageAttachment[]
  reactions?: IMessageReaction
}

/**
 * Payload structure for message attachments
 * @param color       The color you want the order on the left side to be any value background-css supports
 * @param text        The text to display for this attachment it is different than the message text
 * @param ts          ISO timestamp displays the time next to the text portion
 * @param thumb_url   An image that displays to the left of the text looks better when this is relatively small
 * @param message_link Only applicable if the ts is provided as it makes the time clickable to this link
 * @param collapsed   Causes the image audio and video sections to be hiding when collapsed is true
 * @param author_name Name of the author
 * @param author_link Providing this makes the author name clickable and points to this link
 * @param author_icon Displays a tiny icon to the left of the author's name
 * @param title       Title to display for this attachment displays under the author
 * @param title_link  Providing this makes the title clickable pointing to this link
 * @param title_link_download_true When this is true a download icon appears and clicking this saves the link to file
 * @param image_url   The image to display will be “big” and easy to see
 * @param audio_url   Audio file to play only supports what html audio does
 * @param video_url   Video file to play only supports what html video does
 */
export interface IMessageAttachment {
  color?: string
  text?: string
  ts?: string
  thumb_url?: string
  message_link?: string
  collapsed?: boolean
  author_name?: string
  author_link?: string
  author_icon?: string
  title?: string
  title_link?: string
  title_link_download?: string
  image_url?: string
  audio_url?: string
  video_url?: string
  fields?: IAttachmentField[]
  actions?: IMessageAction[]
}

/** Attachment field schema */
export interface IAttachmentField {
  short?: boolean
  title?: string
  value?: string
}

/** Message emoji reaction attribute schema (emoji: [usernames that reacted]) */
export interface IMessageReaction {
  [emoji: string]: { usernames: string[] }
}

/** Rich message action schema */
export interface IMessageAction {
  type?: string
  text?: string
  url?: string
  image_url?: string
  is_webview?: boolean
  webview_height_ratio?: 'compact' | 'tall' | 'full'
  msg?: string
  msg_in_chat_window?: boolean
  button_alignment?: 'vertical' | 'horizontal'
  temporary_buttons?: boolean
}

/** Geo-location attribute schema */
export interface IMessageLocation {
  type: string                // e.g. Point
  coordinates: string[]       // longitude latitude
}
