import ws from 'ws'
import {
    ClientCtx,
    DbMessage,
    ReqCreateMessage,
    ReqListen,
    ReqListMessages,
    ReqUnlisten,
    ResListChats,
    ResListMessages
} from '../types'
import { Log } from './lib'
import { PubSub } from './pubsub'
import { Repo } from './repo'

export class ClientConnection {
    private readonly ctx: ClientCtx

    constructor(
        private readonly client: ws.WebSocket,
        private readonly pubSub: PubSub,
        private readonly repo: Repo,
        private readonly log: Log,
        private readonly userId: string
    ) {
        this.ctx = { userId: this.userId, listeners: new Map() }

        client.on('message', this.handleMessage.bind(this))

        client.on('close', () => log.info(`Client diconnected; userId: ${this.ctx.userId}`))

        client.on('error', err => log.error(err))
    }

    private handleMessage(data: ws.RawData) {
        const req = JSON.parse(data.toString())
        switch (req.type) {
            case 'listChats':
                this.listChats().catch(this.log.error)
                break
            case 'createMessage':
                this.createMessage(req).catch(this.log.error)
                break
            case 'listMessages':
                this.listMessages(req).catch(this.log.error)
                break
            case 'listen':
                this.listen(req).catch(this.log.error)
                break
            case 'unlisten':
                this.unlisten(req).catch(this.log.error)
                break
            default:
                this.log.info(`Unknown request type: ${req.type}; userId: ${this.ctx.userId}`)
        }
    }

    private async createMessage(req: ReqCreateMessage) {
        const createdAt = new Date()
        const chatId = req.message.chatId
        const message: DbMessage = {
            id: `Message_${this.userId}_${createdAt.toISOString()}`,
            text: req.message.text,
            chatId,
            userId: this.userId,
            createdAt
        }

        await this.repo.createMessage(message)

        const pubSubChannel = `chat_${message.chatId}`
        const pubSubMessage: ResListMessages = {
            type: 'listMessages',
            chatId,
            messages: await this.repo.getMessages(chatId)
        }

        this.pubSub.publish(pubSubChannel, JSON.stringify(pubSubMessage))
    }

    private async listChats() {
        const res: ResListChats = {
            type: 'listChats',
            chats: await this.repo.getChats()
        }

        this.client.send(JSON.stringify(res))
    }

    private async listMessages(req: ReqListMessages) {
        const res: ResListMessages = {
            type: 'listMessages',
            chatId: req.chatId,
            messages: await this.repo.getMessages(req.chatId)
        }

        this.client.send(JSON.stringify(res))
    }

    private async listen(req: ReqListen) {
        const channel = req.channel
        if (this.ctx.listeners.has(channel)) {
            this.pubSub.unsubscribe(channel, this.ctx.listeners.get(channel))
            this.ctx.listeners.delete(channel)
        }

        const listener = (message: string) => {
            this.client.send(message)
        }

        this.pubSub.subscribe(channel, listener)
        this.ctx.listeners.set(channel, listener)
    }

    private async unlisten(req: ReqUnlisten) {
        const channel = req.channel
        if (this.ctx.listeners.has(channel)) {
            this.pubSub.unsubscribe(channel, this.ctx.listeners.get(channel))
            this.ctx.listeners.delete(channel)
        }
    }
}
