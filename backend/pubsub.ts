import { createClient, RedisClientType } from 'redis'
import { Log } from './lib'

export class PubSub {
    private static readonly redisPass = 'eYVX7EwVmmxKPCDmwMtyKVge8oLd2t81'

    static async init(log: Log): Promise<PubSub> {
        const redisPub: RedisClientType = createClient({ password: PubSub.redisPass })
        redisPub.on('error', err => {
            log.error('RedisError:', err)
        })

        const redisSub: RedisClientType = createClient({ password: PubSub.redisPass })
        redisSub.on('error', err => {
            log.error('RedisError:', err)
        })

        await Promise.all([redisPub.connect(), redisSub.connect()])

        return new PubSub(log, redisPub, redisSub)
    }

    private constructor(
        private readonly log: Log,
        private readonly redisPub: RedisClientType,
        private readonly redisSub: RedisClientType
    ) {}

    readonly subscribe = this.redisSub.subscribe.bind(this.redisSub)
    readonly unsubscribe = this.redisSub.unsubscribe.bind(this.redisSub)
    readonly publish = this.redisPub.publish.bind(this.redisPub)
}
