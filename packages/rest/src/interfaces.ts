/**
 * Common args for POST, GET, PUT, DELETE requests
 * @param endpoint The API endpoint (including version) e.g. `chat.update`
 * @param data     Payload for POST request to endpoint
 * @param auth     Require auth headers for endpoint, default true
 * @param ignore   Allows certain matching error messages to not count as errors
 */
export interface IRequest {
  (
    endpoint: string,
    data?: any,
    auth?: boolean,
    ignore?: RegExp
  ): Promise<any>
}

/** Credentials for logging into API */
export interface ICredentials {
  username: string
  password: string
}

/**
 * Result object from an API login
 * @param status      e.g. 'success'
 * @param data        Logged in user data
 * @param data.authToken Login renewal token
 * @param userId      ID of logged-in user
 */
export interface ILoginResult {
  status: string // e.g. 'success'
  data: {
    authToken: string
    userId: string
  }
}

/**
 * API result for channel.history request
 * @todo Incomplete
 */
export interface IHistory {
  messages: IMessageReceipt[]
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
  ts: string
  _updatedAt: string
  editedAt?: string
  u: IUser
  editedBy?: IUser
  attachments?: IAttachment[]
  reactions?: IMessageReaction
}

/**
 * Payload structure for `chat.postMessage` endpoint
 * @param roomId      The room id of where the message is to be sent
 * @param channel     The channel name with the prefix in front of it
 * @param text        The text of the message to send is optional because of attachments
 * @param alias       This will cause the messenger name to appear as the given alias but username will still display
 * @param emoji       If provided this will make the avatar on this message be an emoji
 * @param avatar      If provided this will make the avatar use the provided image url
 */
export interface IMessage {
  roomId: string
  channel?: string
  text?: string
  alias?: string
  emoji?: string
  avatar?: string
  attachments?: IAttachment[]
}

/**
 * Payload structure for `chat.update` endpoint
 * @param roomId      The room id of where the message is
 * @param msgId       The message id to update
 * @param text        Updated text for the message
 */
export interface IMessageUpdate {
  roomId: string
  msgId: string
  text: string
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
export interface IAttachment {
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
  title_link_download_true?: string
  image_url?: string
  audio_url?: string
  video_url?: string
  fields?: IAttachmentField[]
  actions?: IMessageAction[]
}

/**
 * Payload structure for attachment field object
 * The field property of the attachments allows for “tables” or “columns” to be displayed on messages
 * @param short       Whether this field should be a short field
 * @param title       The title of this field
 * @param value       The value of this field displayed underneath the title value
 */
export interface IAttachmentField {
  short?: boolean
  title: string
  value: string
}

/**
 * Result structure for message endpoints
 * @param ts          Seconds since unix epoch
 * @param channel     Name of channel without prefix
 * @param message     Sent message
 * @param success     Send status
 */
export interface IMessageResult {
  ts: number
  channel: string
  message: IMessageReceipt
  success: boolean
}

/**
 * User object structure for creation endpoints
 * @param email       Email address
 * @param name        Full name
 * @param password    User pass
 * @param username    Username
 * @param active      Subscription is active
 * @param roles       Role IDs
 * @param joinDefaultChannels Auto join channels marked as default
 * @param requirePasswordChange Direct to password form on next login
 * @param sendWelcomeEmail  Send new credentials in email
 * @param verified    Email address verification status
 */
export interface INewUser {
  email?: string
  name?: string
  password: string
  username: string
  active?: true
  roles?: string[]
  joinDefaultChannels?: boolean
  requirePasswordChange?: boolean
  sendWelcomeEmail?: boolean
  verified?: true
}

/**
 * User object structure for queries (not including admin access level)
 * @param _id         MongoDB user doc ID
 * @param type        user / bot ?
 * @param status      online | offline
 * @param active      Subscription is active
 * @param name        Full name
 * @param utcOffset   Hours off UTC/GMT
 * @param username    Username
 */
export interface IUser {
  _id: string
  type: string
  status: string
  active: boolean
  name: string
  utcOffset: number
  username: string
}

/**
 * Result structure for user data request (by non-admin)
 * @param user    The requested user
 * @param success Status of request
 */
export interface IUserResult {
  user: IUser
  success: boolean
}

/** Room type literal (channel private direct livechat) */
export type RoomType = 'c' | 'p' | 'd' | 'l'

/**
 * Room object structure from API
 * @param _id         Room ID
 * @param _updatedAt  ISO timestamp
 * @param ts          ISO timestamp (current time in room?)
 * @param msgs        Count of messages in room
 */
export interface IRoom {
  t: RoomType
  _id: string
  _updatedAt: string
  ts: string
  msgs: number
  meta: IRoomMeta
}

/** Room result meta from API */
export interface IRoomMeta {
  revision: number
  created: number
  version: number
}

/**
 * Channel result schema
 * @param _id         Channel ID
 * @param name        Channel name
 * @param default     Is default channel
 * @param ts          ISO timestamp (current time in room?)
 * @param msgs        Count of messages in room
 */
export interface IChannel {
  t: RoomType
  _id: string
  name: string
  default: boolean
  ts: string
  msgs: number
  u: IUser
}

/**
 * Group (private room) result schema
 * @param _id         Group ID
 * @param name        Group name
 * @param default     Is default channel (would be false)
 * @param usernames   Users in group
 * @param msgs        Count of messages in room
 * @param ts          ISO timestamp (current time in room?)
 */
export interface IGroup {
  t: RoomType
  _id: string
  name: string
  default: boolean
  usernames: string[]
  msgs: number
  ts: string
  u: IUser
}

/** Result structure for room creation (e.g. DM) */
export interface IRoomResult {
  room: IRoom
  success: boolean
}

/** Result structure for channel creation */
export interface IChannelResult {
  channel: IChannel
  success: boolean
}

/** Result structure for group creation */
export interface IGroupResult {
  group: IGroup
  success: boolean
}

/** Structure for livechat token field api */
export interface ILivechatToken {
  token: string
}

/** Structure for livechat room credential api */
export interface ILivechatRoomCredential {
  token: string
  rid?: string
  department?: string
}

/** Structure for livechat room messages api */
export interface ILivechatRoomMessages {
  token: string   // Visitor token
  ts?: string     // ISO timestamp
  end?: string    // ISO timestamp
  limit: number   // number of messages to load
}

/** Payload structure for livechat `room.transfer` endpoint */
export interface ILivechatRoomTransfer {
  token: string
  department: string
}

/** Payload structure for livechat survey values */
export interface ILivechatSurvey {
  name: 'satisfaction' | 'agentKnowledge' | 'agentResponsiveness' | 'agentFriendliness'
  value: '1' | '2' | '3' | '4' | '5'
}

/** Payload structure for livechat `room.transfer` endpoint */
export interface ILivechatRoomSurvey {
  token: string
  rid: string
  data?: ILivechatSurvey[] // See survey interface above
}

/** Livechat New Room object structure */
export interface ILivechatNewRoom {
  _id: string           // Room ID
  _updatedAt: string    // ISO timestamp
  t: 'r'                // Room type (channel, private, direct, livechat)
  msgs: number          // Count of messages in room
  ts: string            // ISO timestamp (current time in room?)
  lm?: string           // ISO timestamp (last message)
  open?: boolean        // Room status
  departmentId?: string // Livechat Department _id
  fname: string         // Room display name
  v: {
	  _id: number         // Visitor ID
	  token: string       // Visitor token
	  username: number    // Visitor username
  }
}

/** Result structure for room creation (e.g. DM) */
export interface ILivechatNewRoomResult {
  room: ILivechatNewRoom
  newRoom: boolean
  success: boolean
}

/** Custom Field object structure for livechat endpoints */
export interface ILivechatGuestCustomField {
  key: string
  value: string
  overwrite: boolean
}

/** Payload structure for new Livechat Visitors */
export interface ILivechatGuest {
  token: string
  name?: string
  email?: string
  department?: string
  phone?: string
  username?: string
  customFields?: ILivechatGuestCustomField[]
}

/** Visitor object structure for livechat endpoints */
export interface INewLivechatGuest {
  visitor: ILivechatGuest
}

/** Payload structure for new Livechat Message */
export interface INewLivechatMessage {
  _id?: string          // Message ID
  msg: string           // Message text
  token: string         // Livechat Token
  rid: string           // Room ID
  agent?: {
    agentId: string
    username: string
  }
}

/** Result structure for visitor emails */
export interface ILivechatEmail {
  address: string,
  verified?: boolean
}

/** Result structure for visitor phones */
export interface ILivechatVisitorPhone {
  phoneNumber: string
}

/** Result structure for visitor prop */
export interface ILivechatVisitor {
  token: string
  _updatedAt: string
  name?: string
  phone?: ILivechatVisitorPhone[]
  username: string
  visitorEmails?: ILivechatEmail[]
  livechatData?: object
}

/** Result structure for visitor creation */
export interface ILivechatVisitorResult {
  visitor: ILivechatVisitor
  success: boolean
}

/** Result structure for config survey */
export interface ILivechatConfigSurvey {
  items: ['satisfaction', 'agentKnowledge', 'agentResponsiveness', 'agentFriendliness']
  values: ['1', '2', '3', '4', '5']
}

/** Result structure for config prop */
export interface ILivechatConfig {
  enabled: boolean
  online?: boolean
  settings?: object
  theme?: object
  messages?: object
  survey?: ILivechatConfigSurvey,
  guest?: ILivechatGuest
}

/** Result structure for Livechat config */
export interface ILivechatConfigResult {
  config: ILivechatConfig
  success: boolean
}

/** Livechat Room object structure */
export interface ILivechatRoom {
  _id: string           // Room ID
  open?: boolean        // Room status
  departmentId?: string // Livechat Department _id
  servedBy: {
	  _id: number         // Agent ID
    username: number    // Agent username
  }
}

/** Result structure for room */
export interface ILivechatRoomResult {
  room: ILivechatRoom
  success: boolean
}

/** Livechat Agent object structure */
export interface ILivechatAgent {
  _id: string           // Agent ID
  name: string          // Agent name
  username: string      // Agent username
  emails: ILivechatEmail[]
}

/** Result structure for agent */
export interface ILivechatAgentResult {
  agent: ILivechatAgent
  success: boolean
}

/** Livechat Message object structure */
export interface ILivechatMessage {
  msg: string
  u: {
    _id: string
    username: string
    name: string
  }
  ts: string
}

/** Result structure for Livechat Message */
export interface ILivechatMessageResult {
  message: ILivechatMessage
  success: boolean
}

/** Payload structure for new Livechat Offline Message */
export interface INewLivechatOfflineMessage {
  name: string          // Message Name
  email: string         // Message email
  message: string       // Message text
}

/** Result structure for Livechat Offline Message */
export interface ILivechatOfflineMessageResult {
  message: string
  success: boolean
}

/** Navigation object structure for livechat endpoints */
export interface ILivechatNavigation {
  change: string      // Action (Url or Page Title)
  title: string       // Page Title
  location: {
    href: string
  }
  token?: string
}

/** Payload structure for new Livechat Visitor Navigation */
export interface INewLivechatNavigation {
  token: string         // Livechat Token
  rid: string           // Room ID
  pageInfo: ILivechatNavigation
}

/** Result structure for Livechat Navigation */
export interface ILivechatNavigationResult {
  page?: {
    msg: string
    navigation: ILivechatNavigation
  }
  success: boolean
}

/** Result structure for Livechat Transcript */
export interface ILivechatTranscriptResult {
  message: string
  success: boolean
}

/** Livechat VideoCall object structure */
export interface ILivechatVideoCall {
  rid: string           // Room ID
  domain: string        // Video Call provider domain
  provider: string      // Video Call provider name
  room: string          // Video Call room
}

/** Result structure for Livechat VideoCall */
export interface ILivechatVideoCallResult {
  videoCall: ILivechatVideoCall
  success: boolean
}

/** Payload structure for new Livechat CustomField */
export interface ILivechatCustomField {
  key: string
  value: string
  overwrite: boolean
}

/** Livechat CustomField object structure */
export interface INewLivechatCustomField {
  token: string        // Visitor token
  key: string          // CustomField key
  value: string        // CustomField value
  overwrite: boolean   // Overwrite CustomField value if exists
}

/** Result structure for Livechat CustomField */
export interface ILivechatCustomFieldResult {
  field: ILivechatCustomField
  success: boolean
}

/** Structure for Livechat CustomFields api */
export interface INewLivechatCustomFields {
  token: string   // Visitor token
  customFields: ILivechatCustomField[]
}

/** Result structure for Livechat CustomFields */
export interface ILivechatCustomFieldsResult {
  fields: ILivechatCustomField[]
  success: boolean
}
