export function getRedisCredentials() {
    return { password: 'eYVX7EwVmmxKPCDmwMtyKVge8oLd2t81', url: 'localhost' }
}

export class Log {
    constructor(private readonly nodeId: string | number) {}

    info = (...args: unknown[]) => {
        this.log('info', args)
    }

    error = (...args: unknown[]) => {
        this.log('error', args)
    }

    private log(type: 'info' | 'error', args: unknown[]) {
        console[type](`> ${this.nodeId} [${type.toUpperCase()}]:\n`, ...args)
    }
}
