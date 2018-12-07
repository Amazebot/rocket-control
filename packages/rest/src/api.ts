import axios, { AxiosResponse } from 'axios'
import { logger } from '@amazebot/logger'
import {
  ILoginResult,
  IRequest,
  IUser,
  ICredentials,
  ILivechatToken,
  ILivechatConfigResult,
  ILivechatRoomCredential,
  ILivechatRoomResult,
  ILivechatRoomSurvey,
  ILivechatVisitorResult,
  INewLivechatGuest,
  ILivechatMessageResult,
  ILivechatRoomMessages,
  ILivechatOfflineMessageResult,
  ILivechatNavigationResult,
  ILivechatTranscriptResult,
  ILivechatVideoCallResult,
  INewLivechatCustomField,
  ILivechatCustomFieldResult,
  INewLivechatCustomFields,
  ILivechatCustomFieldsResult,
  ILivechatAgentResult,
  INewLivechatMessage,
  INewLivechatOfflineMessage,
  INewLivechatNavigation,
  user,
  instance
} from '.'

/** Populated on login with result */
export let currentLogin: {
  username: string,
  userId: string,
  authToken: string,
  result: ILoginResult
} | null = null

/** Check for existing login */
export function loggedIn () {
  return (currentLogin !== null)
}

/**
 * Prepend protocol (or put back if removed from env settings for driver)
 * Hard code endpoint prefix, because all syntax depends on this version
 */
export const url = `${(instance.get('url').indexOf('http') === -1)
  ? instance.get('url').replace(/^(\/\/)?/, 'http://')
  : instance.get('url')}/api/v1/`

/** Initialize client */
const client = axios.create({
  baseURL: url,
  headers: { 'Content-Type': 'application/json' }
})

/** Populate auth headers (from response data on login) */
export function setAuth (authData: {authToken: string, userId: string}) {
  client.defaults.headers.common['X-Auth-Token'] = authData.authToken
  client.defaults.headers.common['X-User-Id'] = authData.userId
}

/** Clear headers so they can't be used without logging in again */
export function clearHeaders () {
  delete client.defaults.headers.common['X-Auth-Token']
  delete client.defaults.headers.common['X-User-Id']
}

/** Check result data for success, allowing override to ignore some errors */
export function success (result: any, ignore?: RegExp) {
  const regExpSuccess = /(?!([45][0-9][0-9]))\d{3}/
  return (
    typeof result.status === 'undefined' ||
    (result.status && regExpSuccess.test(result.status)) ||
    (result.status && ignore && ignore.test(result.status))
  ) ? true : false
}

/**
 * Do a request to an API endpoint.
 * If it needs a token, login first (with defaults) to set auth headers.
 * @param method   Request method GET | POST | PUT | DEL
 * @param endpoint The API endpoint (including version) e.g. `chat.update`
 * @param data     Payload for POST request to endpoint
 * @param auth     Require auth headers for endpoint, default true
 * @param ignore   Allows certain matching error messages to not count as errors
 */
export async function request (
  method: 'POST' | 'GET' | 'PUT' | 'DELETE',
  endpoint: string,
  data: any = {},
  auth: boolean = true,
  ignore?: RegExp
) {
  logger.debug(`[API] ${method} ${endpoint}: ${JSON.stringify(data)}`)
  try {
    if (auth && !loggedIn()) await login()
    let result: AxiosResponse
    switch (method) {
      case 'GET': result = await client.get(endpoint, { params: data }); break
      case 'PUT': result = await client.put(endpoint, data); break
      case 'DELETE': result = await client.delete(endpoint, { data }); break
      default:
      case 'POST': result = await client.post(endpoint, data); break
    }
    if (!result) throw new Error(`API ${method} ${endpoint} result undefined`)
    if (!success(result, ignore)) throw result
    logger.debug(`[API] ${method} ${endpoint} result ${result.status}`)
    return (method === 'DELETE') ? result : result.data
  } catch (err) {
    logger.error(`[API] POST error (${endpoint}): ${err.response.data.message}`)
    throw err.response.data
  }
}

/** Do a POST request to an API endpoint. */
export const post: IRequest = (endpoint, data, auth, ignore) => request('POST', endpoint, data, auth, ignore)

/** Do a GET request to an API endpoint. */
export const get: IRequest = (endpoint, data, auth, ignore) => request('GET', endpoint, data, auth, ignore)

/** Do a PUT request to an API endpoint. */
export const put: IRequest = (endpoint, data, auth, ignore) => request('PUT', endpoint, data, auth, ignore)

/** Do a DELETE request to an API endpoint. */
export const del: IRequest = (endpoint, data, auth, ignore) => request('DELETE', endpoint, data, auth, ignore)

/**
 * Login a user for further API calls
 * Result should come back with a token, to authorise following requests.
 * Use env default credentials, unless overridden by login arguments.
 */
export async function login (usr: ICredentials = {
  username: user.get('username'),
  password: user.get('password')
}) {
  logger.info(`[API] Logging in ${usr.username}`)
  if (currentLogin !== null) {
    logger.debug(`[API] Already logged in`)
    if (currentLogin.username === usr.username) return currentLogin.result
    else await logout()
  }
  const result = (await post('login', usr, false) as ILoginResult)
  if (result && result.data && result.data.authToken) {
    currentLogin = {
      result: result, // keep to return if login requested again for same user
      username: usr.username, // keep to compare with following login attempt
      authToken: result.data.authToken,
      userId: result.data.userId
    }
    setAuth(currentLogin)
    logger.info(`[API] Logged in ID ${currentLogin.userId}`)
    return result
  } else {
    throw new Error(`[API] Login failed for ${usr.username}`)
  }
}

/** Logout a user at end of API calls */
export function logout () {
  if (currentLogin === null) {
    logger.debug(`[API] Already logged out`)
    return Promise.resolve()
  }
  logger.info(`[API] Logging out ${ currentLogin.username }`)
  return get('logout', null, true).then(() => {
    clearHeaders()
    currentLogin = null
  })
}

/** Defaults for user queries */
export const userFields = { name: 1, username: 1, status: 1, type: 1 }

/** Query helpers for user collection requests */
export const users: any = {
  all: (fields: any = userFields) => get('users.list', { fields }).then((r) => r.users),
  allNames: () => get('users.list', { fields: { 'username': 1 } }).then((r) => r.users.map((u: IUser) => u.username)),
  allIDs: () => get('users.list', { fields: { '_id': 1 } }).then((r) => r.users.map((u: IUser) => u._id)),
  online: (fields: any = userFields) => get('users.list', { fields, query: { 'status': { $ne: 'offline' } } }).then((r) => r.users),
  onlineNames: () => get('users.list', { fields: { 'username': 1 }, query: { 'status': { $ne: 'offline' } } }).then((r) => r.users.map((u: IUser) => u.username)),
  onlineIds: () => get('users.list', { fields: { '_id': 1 }, query: { 'status': { $ne: 'offline' } } }).then((r) => r.users.map((u: IUser) => u._id))
}

/** Query helpers for livechat REST requests */
export const livechat: any = {
  config: (params: ILivechatToken) => get('livechat/config', params, false).then((r: ILivechatConfigResult) => r),
  room: (credentials: ILivechatRoomCredential) => get('livechat/room', credentials, false).then((r: ILivechatRoomResult) => r),
  closeChat: (credentials: ILivechatRoomCredential) => (post('livechat/room.close', { rid: credentials.rid, token: credentials.token }, false)).then((r) => r),
  transferChat: (credentials: ILivechatRoomCredential) => (post('livechat/room.transfer', { rid: credentials.rid, token: credentials.token, department: credentials.department }, false)).then((r) => r),
  chatSurvey: (survey: ILivechatRoomSurvey) => (post('livechat/room.survey', { rid: survey.rid, token: survey.token, data: survey.data }, false)).then((r) => r),
  visitor: (params: ILivechatToken) => get(`livechat/visitor/${params.token}`).then((r: ILivechatVisitorResult) => r),
  grantVisitor: (guest: INewLivechatGuest) => (post('livechat/visitor', guest, false)).then((r: ILivechatVisitorResult) => r),
  agent: (credentials: ILivechatRoomCredential) => get(`livechat/agent.info/${credentials && credentials.rid}/${credentials && credentials.token}`).then((r: ILivechatAgentResult) => r),
  nextAgent: (credentials: ILivechatRoomCredential) => get(`livechat/agent.next/${credentials && credentials.token}`, { department: credentials.department }).then((r: ILivechatAgentResult) => r),
  sendMessage: (message: INewLivechatMessage) => (post('livechat/message', message, false)).then((r: ILivechatMessageResult) => r),
  editMessage: (id: string, message: INewLivechatMessage) => (put(`livechat/message/${id}`, message, false)).then((r: ILivechatMessageResult) => r),
  deleteMessage: (id: string, credentials: ILivechatRoomCredential) => (del(`livechat/message/${id}`, credentials, false)).then((r) => r),
  loadMessages: (id: string, params: ILivechatRoomMessages) => get(`livechat/messages.history/${id}`, params, false).then((r) => r),
  sendOfflineMessage: (message: INewLivechatOfflineMessage) => (post('livechat/offline.message', message, false)).then((r: ILivechatOfflineMessageResult) => r),
  sendVisitorNavigation: (credentials: ILivechatRoomCredential, page: INewLivechatNavigation) => (post('livechat/page.visited', { token: credentials.token, rid: credentials.rid, ...page }, false)).then((r: ILivechatNavigationResult) => r),
  requestTranscript: (email: string, credentials: ILivechatRoomCredential) => (post('livechat/transcript', { token: credentials.token, rid: credentials.rid, email }, false)).then((r: ILivechatTranscriptResult) => r),
  videoCall: (credentials: ILivechatRoomCredential) => (get(`livechat/video.call/${credentials.token}`, { rid: credentials.rid }, false)).then((r: ILivechatVideoCallResult) => r),
  sendCustomField: (field: INewLivechatCustomField) => (post('livechat/custom.field', field, false)).then((r: ILivechatCustomFieldResult) => r),
  sendCustomFields: (fields: INewLivechatCustomFields) => (post('livechat/custom.fields', fields, false)).then((r: ILivechatCustomFieldsResult) => r)
}
