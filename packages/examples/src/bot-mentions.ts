import { logger } from '@amazebot/logger'
import { user } from '@amazebot/rocket-sims'

async function botMentions () {
  const bot = await user.create({
    name: 'Sim Bot',
    username: 'simbot',
    password: 'pass',
    roles: ['user', 'bot']
  })
  logger.info(`[exampels] Bot ${bot.account.username}, ID: ${bot.id}`)
  const socket = await bot.login()
  await socket.call('joinRoom', 'GENERAL')
  await socket.subscribe('stream-room-messages', ['GENERAL', true], (e) => {
    try {
      const msg = e.fields.args[0].msg
      const usr = e.fields.args[0].u
      if (msg.indexOf(`@${bot.account.username}`) >= 0) {
        logger.info(`[examples] Bot mentioned by ${usr.username}: ${msg}`)
      }
    } catch (err) {
      logger.debug(`[examples] Unexpected event object in stream.`)
    }
  })
  logger.info(`[examples] Listening in #general`)
}

botMentions()
  .catch((err) => console.error(`[botMentions] Error: ${err.message}`))
