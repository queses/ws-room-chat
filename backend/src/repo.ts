import { createClient, RedisClientType } from 'redis'
import { Log } from './lib'
import { DbChat, DbMessage } from '../types'

export class Repo {
    private static readonly redisPass = 'eYVX7EwVmmxKPCDmwMtyKVge8oLd2t81'

    static async init(log: Log): Promise<Repo> {
        const redis: RedisClientType = createClient({ password: Repo.redisPass })
        redis.on('error', err => {
            log.error('RedisError:', err)
        })

        await redis.connect()

        return new Repo(log, redis)
    }

    private constructor(private readonly log: Log, private readonly redis: RedisClientType) {}

    async initData() {
        const chats: DbChat[] = [{ id: 'Chat1' }, { id: 'Chat2' }, { id: 'Chat3' }]
        const promises = chats.map(chat => {
            return this.redis.hSet('chats', chat.id, JSON.stringify(chat))
        })

        await Promise.all(promises)
    }

    async getChats(): Promise<DbChat[]> {
        const records = await this.redis.hScan('chats', 0)
        const values: DbChat[] = records.tuples.map(item => JSON.parse(item.value))
        return values.sort((prev, next) => {
            if (next.id > prev.id) {
                return -1
            } else if (next.id < prev.id) {
                return 1
            }

            return 0
        })
    }

    async createMessage(message: DbMessage): Promise<void> {
        await this.redis.rPush(`messages_${message.chatId}`, JSON.stringify(message))
    }

    async getMessages(chatId: string): Promise<DbMessage[]> {
        const records = await this.redis.lRange(`messages_${chatId}`, 0, -1)
        return records.map(item => JSON.parse(item))
    }
}
