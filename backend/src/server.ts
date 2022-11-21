import webSocket from 'ws'
import { Log } from './lib'
import { Repo } from './repo'
import { PubSub } from './pubsub'
import { ClientConnection } from './client-connection'

async function run() {
    const port = parseInt(process.env.PORT || '')
    if (!port) {
        throw new Error('Invalid Port')
    }

    const log = new Log(`Server-${port}`)

    log.info(`Server is running; port: ${port}; pid: ${process.pid}`)

    const [repo, pubSub] = await Promise.all([Repo.init(log), PubSub.init(log)])

    const server = new webSocket.Server({ port })
    server.on('connection', (client, incoming) => {
        log.info(`New client connected; url: ${incoming.url}`)
        const userIdMatch = incoming.url?.match(/\?.*userId=([^&]+)/i)
        const userId = userIdMatch && userIdMatch[1]
        if (!userId) {
            const error = new Error('UserId is not in query params')
            log.error(error)
            client.close()
            return
        }

        new ClientConnection(client, pubSub, repo, log, userId)
    })

    pubSub.subscribe('main', message => {
        server.clients.forEach(client => {
            client.send(message)
        })
    })
}

run()
