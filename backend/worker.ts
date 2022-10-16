import webSocket from 'ws'
import { Log } from './lib'
import { Repo } from './repo'
import { PubSub } from './pubsub'
import {
    ClientCtx,
    DbMessage,
    ReqCreateMessage,
    ReqListen,
    ReqListMessages,
    ReqUnlisten,
    ResListChats,
    ResListMessages
} from './types'

async function run() {
    const port = parseInt(process.env.PORT || '')
    if (!port) {
        throw new Error('Invalid Port')
    }

    const log = new Log(`W-${port}`)
    log.info(`Worker is running; pid: ${process.pid}`)

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

        const ctx: ClientCtx = { userId, listeners: new Map() }

        client.on('message', data => {
            const req = JSON.parse(data.toString())
            switch (req.type) {
                case 'listChats':
                    listChats(repo, client).catch(log.error)
                    break
                case 'createMessage':
                    createMessage(repo, pubSub, ctx, req).catch(log.error)
                    break
                case 'listMessages':
                    listMessages(repo, client, req).catch(log.error)
                    break
                case 'listen':
                    listen(pubSub, client, ctx, req).catch(log.error)
                    break
                case 'unlisten':
                    unlisten(pubSub, client, ctx, req).catch(log.error)
                    break
                default:
                    log.info(`Unknown request type: ${req.type}; userId: ${ctx.userId}`)
            }
        })

        client.on('close', () => {
            log.info(`Client diconnected; userId: ${ctx.userId}`)
        })

        client.on('error', err => {
            log.error(err)
        })
    })

    pubSub.subscribe('main', message => {
        server.clients.forEach(client => {
            client.send(message)
        })
    })
}

async function createMessage(repo: Repo, pubSub: PubSub, { userId }: ClientCtx, req: ReqCreateMessage) {
    const createdAt = new Date()
    const chatId = req.message.chatId
    const message: DbMessage = {
        id: `Message_${userId}_${createdAt.toISOString()}`,
        text: req.message.text,
        chatId,
        userId,
        createdAt
    }

    await repo.createMessage(message)

    const pubSubChannel = `chat_${message.chatId}`
    const pubSubMessage: ResListMessages = {
        type: 'listMessages',
        chatId,
        messages: await repo.getMessages(chatId)
    }

    pubSub.publish(pubSubChannel, JSON.stringify(pubSubMessage))
}

async function listChats(repo: Repo, client: webSocket.WebSocket) {
    const res: ResListChats = {
        type: 'listChats',
        chats: await repo.getChats()
    }

    client.send(JSON.stringify(res))
}

async function listMessages(repo: Repo, client: webSocket.WebSocket, req: ReqListMessages) {
    const res: ResListMessages = {
        type: 'listMessages',
        chatId: req.chatId,
        messages: await repo.getMessages(req.chatId)
    }

    client.send(JSON.stringify(res))
}

async function listen(pubSub: PubSub, client: webSocket.WebSocket, ctx: ClientCtx, req: ReqListen) {
    const channel = req.channel
    if (ctx.listeners.has(channel)) {
        pubSub.unsubscribe(channel, ctx.listeners.get(channel))
        ctx.listeners.delete(channel)
    }

    const listener = (message: string) => {
        client.send(message)
    }

    pubSub.subscribe(channel, listener)
    ctx.listeners.set(channel, listener)
}

async function unlisten(pubSub: PubSub, client: webSocket.WebSocket, ctx: ClientCtx, req: ReqUnlisten) {
    const channel = req.channel
    if (ctx.listeners.has(channel)) {
        pubSub.unsubscribe(channel, ctx.listeners.get(channel))
        ctx.listeners.delete(channel)
    }
}

run()
