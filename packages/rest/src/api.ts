import axios, { AxiosResponse, AxiosInstance } from 'axios'
import { logger } from '@amazebot/logger'
import {
  ILoginResult,
  IRequest,
  ICredentials,
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

/** Axios client, populated as required */
let _client: AxiosInstance

/** Creates and/or returns Axios client, will be re-created if URL given. */
export function client (host?: string) {
  let url = (host) ? host : instance.get('url').toLowerCase()

  // Prepend protocol and hard code endpoint prefix
  const protocol = instance.get('ssl') ? 'https://' : 'http://'
  if (url.indexOf('http') === -1) url = url.replace(/^(\/\/)?/, protocol)
  url = url + '/api/v1/'

  // Return existing client if URL hasn't changed
  if (typeof _client !== 'undefined' && url === _client.defaults.baseURL) {
    return _client
  }

  // Create and return client
  _client = axios.create({
    baseURL: url,
    headers: { 'Content-Type': 'application/json' }
  })
  return _client
}

/** Check for existing login */
export const loggedIn = () => (currentLogin !== null)

/** Populate auth headers (from response data on login) */
export function setAuth (authData: {authToken: string, userId: string}) {
  client().defaults.headers.common['X-Auth-Token'] = authData.authToken
  client().defaults.headers.common['X-User-Id'] = authData.userId
}

/** Clear headers so they can't be used without logging in again */
export function clearHeaders () {
  delete client().defaults.headers.common['X-Auth-Token']
  delete client().defaults.headers.common['X-User-Id']
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
      case 'GET': result = await client().get(endpoint, { params: data }); break
      case 'PUT': result = await client().put(endpoint, data); break
      case 'DELETE': result = await client().delete(endpoint, { data }); break
      default:
      case 'POST': result = await client().post(endpoint, data); break
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

/** Do a GET request to an API endpoint. */
export const get: IRequest = (endpoint, data, auth, ignore) => {
  return request('GET', endpoint, data, auth, ignore)
}

/** Do a POST request to an API endpoint. */
export const post: IRequest = (endpoint, data, auth, ignore) => {
  return request('POST', endpoint, data, auth, ignore)
}

/** Do a PUT request to an API endpoint. */
export const put: IRequest = (endpoint, data, auth, ignore) => {
  return request('PUT', endpoint, data, auth, ignore)
}

/** Do a DELETE request to an API endpoint. */
export const del: IRequest = (endpoint, data, auth, ignore) => {
  return request('DELETE', endpoint, data, auth, ignore)
}

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
