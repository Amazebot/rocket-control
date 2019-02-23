import { inspect } from 'util'
import { Config } from '@amazebot/config'
import socket from './socket'

const cliCommands = new Config({
  'method': {
    'type': 'string',
    'description': 'A method to call via socket, prints result in CLI',
    'alias': 'm'
  },
  'params': {
    'type': 'string',
    'description': 'Used with method call, may contain JSON or array',
    'alias': 'p'
  }
})
cliCommands.load()

export async function execute (method: string, params?: string) {
  let parsed: any = []
  if (params) {
    if (isJson(params)) parsed = JSON.parse(params)
    else if (params.split(',').length) parsed = params.split(',')
  }
  await socket.login()
  const result = await socket.call(method, ...parsed)
  console.log(inspect({ result }, { depth: 4 }))
  return result
}

function isJson (json: string) {
  try {
    JSON.parse(json)
  } catch (e) {
    return false
  }
  return true
}

if (cliCommands.get('method')) {
  execute(cliCommands.get('method'), cliCommands.get('params'))
    .then(() => process.exit(1))
}
