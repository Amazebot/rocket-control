// import {
//   IUser,
//   ILivechatToken,
//   ILivechatConfigResult,
//   ILivechatRoomCredential,
//   ILivechatRoomResult,
//   ILivechatRoomSurvey,
//   ILivechatVisitorResult,
//   INewLivechatGuest,
//   ILivechatMessageResult,
//   ILivechatRoomMessages,
//   ILivechatOfflineMessageResult,
//   ILivechatNavigationResult,
//   ILivechatTranscriptResult,
//   ILivechatVideoCallResult,
//   INewLivechatCustomField,
//   ILivechatCustomFieldResult,
//   INewLivechatCustomFields,
//   ILivechatCustomFieldsResult,
//   ILivechatAgentResult,
//   INewLivechatMessage,
//   INewLivechatOfflineMessage,
//   INewLivechatNavigation
// } from '.'

// Livechat data - populated in before hooks
// let token: string
// let department: string
// let room: any
// let rid: any
// let newMessage: any
// let editMessage: any
// let pageInfo: any
// let email = 'sample@rocket.chat'

// /** Defaults for user queries */
// export const userFields = { name: 1, username: 1, status: 1, type: 1 }

// /** Query helpers for user collection requests */
// export const users: any = {
//   all: (fields: any = userFields) => get('users.list', { fields }).then((r) => r.users),
//   allNames: () => get('users.list', { fields: { 'username': 1 } }).then((r) => r.users.map((u: IUser) => u.username)),
//   allIDs: () => get('users.list', { fields: { '_id': 1 } }).then((r) => r.users.map((u: IUser) => u._id)),
//   online: (fields: any = userFields) => get('users.list', { fields, query: { 'status': { $ne: 'offline' } } }).then((r) => r.users),
//   onlineNames: () => get('users.list', { fields: { 'username': 1 }, query: { 'status': { $ne: 'offline' } } }).then((r) => r.users.map((u: IUser) => u.username)),
//   onlineIds: () => get('users.list', { fields: { '_id': 1 }, query: { 'status': { $ne: 'offline' } } }).then((r) => r.users.map((u: IUser) => u._id))
// }

// /** Query helpers for livechat REST requests */
// export const livechat: any = {
//   config: (params: ILivechatToken) => get('livechat/config', params, false).then((r: ILivechatConfigResult) => r),
//   room: (credentials: ILivechatRoomCredential) => get('livechat/room', credentials, false).then((r: ILivechatRoomResult) => r),
//   closeChat: (credentials: ILivechatRoomCredential) => (post('livechat/room.close', { rid: credentials.rid, token: credentials.token }, false)).then((r) => r),
//   transferChat: (credentials: ILivechatRoomCredential) => (post('livechat/room.transfer', { rid: credentials.rid, token: credentials.token, department: credentials.department }, false)).then((r) => r),
//   chatSurvey: (survey: ILivechatRoomSurvey) => (post('livechat/room.survey', { rid: survey.rid, token: survey.token, data: survey.data }, false)).then((r) => r),
//   visitor: (params: ILivechatToken) => get(`livechat/visitor/${params.token}`).then((r: ILivechatVisitorResult) => r),
//   grantVisitor: (guest: INewLivechatGuest) => (post('livechat/visitor', guest, false)).then((r: ILivechatVisitorResult) => r),
//   agent: (credentials: ILivechatRoomCredential) => get(`livechat/agent.info/${credentials && credentials.rid}/${credentials && credentials.token}`).then((r: ILivechatAgentResult) => r),
//   nextAgent: (credentials: ILivechatRoomCredential) => get(`livechat/agent.next/${credentials && credentials.token}`, { department: credentials.department }).then((r: ILivechatAgentResult) => r),
//   sendMessage: (message: INewLivechatMessage) => (post('livechat/message', message, false)).then((r: ILivechatMessageResult) => r),
//   editMessage: (id: string, message: INewLivechatMessage) => (put(`livechat/message/${id}`, message, false)).then((r: ILivechatMessageResult) => r),
//   deleteMessage: (id: string, credentials: ILivechatRoomCredential) => (del(`livechat/message/${id}`, credentials, false)).then((r) => r),
//   loadMessages: (id: string, params: ILivechatRoomMessages) => get(`livechat/messages.history/${id}`, params, false).then((r) => r),
//   sendOfflineMessage: (message: INewLivechatOfflineMessage) => (post('livechat/offline.message', message, false)).then((r: ILivechatOfflineMessageResult) => r),
//   sendVisitorNavigation: (credentials: ILivechatRoomCredential, page: INewLivechatNavigation) => (post('livechat/page.visited', { token: credentials.token, rid: credentials.rid, ...page }, false)).then((r: ILivechatNavigationResult) => r),
//   requestTranscript: (email: string, credentials: ILivechatRoomCredential) => (post('livechat/transcript', { token: credentials.token, rid: credentials.rid, email }, false)).then((r: ILivechatTranscriptResult) => r),
//   videoCall: (credentials: ILivechatRoomCredential) => (get(`livechat/video.call/${credentials.token}`, { rid: credentials.rid }, false)).then((r: ILivechatVideoCallResult) => r),
//   sendCustomField: (field: INewLivechatCustomField) => (post('livechat/custom.field', field, false)).then((r: ILivechatCustomFieldResult) => r),
//   sendCustomFields: (fields: INewLivechatCustomFields) => (post('livechat/custom.fields', fields, false)).then((r: ILivechatCustomFieldsResult) => r)
// }
