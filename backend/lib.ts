export class Log {
    constructor(private readonly nodeId: string | number) {}

    info = (...args: unknown[]) => {
        this.log('info', args)
    }

    error = (...args: unknown[]) => {
        this.log('error', args)
    }

    private log(type: 'info' | 'error', args: unknown[]) {
        console.log(`> ${this.nodeId} [${type.toUpperCase()}]:`)
        console[type](...args)
    }
}
