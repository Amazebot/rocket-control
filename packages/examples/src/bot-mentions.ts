import { user } from '@amazebot/rocket-sims'

async function botMentions () {
  const bot = user.create({
    name: 'Sim Bot',
    username: 'simbot',
    roles: ['user', 'bot']
  })
}
