import http from 'http'
import httpProxy from 'http-proxy'
import { fork } from 'child_process'
import { Log } from './lib'
import { DbChat } from './types'
import { Repo } from './repo'
import { PubSub } from './pubsub'

const masterPort = '8090'
// const ports = ['8091', '8092']
const ports = ['8091']

async function run() {
    const log = new Log(`M-${masterPort}`)
    log.info(`Master is running; pid: ${process.pid}`)

    ports.forEach(port => {
        fork('./dist/worker.js', [], { stdio: 'inherit', env: { PORT: port } })
    })

    const repo = await Repo.init(log)
    await repo.migrate()

    const proxies = ports.map(port => httpProxy.createProxyServer({ target: `ws://localhost:${port}`, ws: true }))

    const proxyServer = http.createServer(function (req, res) {
        const randomIx = Math.floor(Math.random() * proxies.length)
        const proxy = proxies[randomIx]
        proxy.web(req, res)
    })

    // Listen to the `upgrade` event and proxy WS requests as well:
    proxyServer.on('upgrade', function (req, socket, head) {
        const randomIx = Math.floor(Math.random() * proxies.length)
        const proxy = proxies[randomIx]
        proxy.ws(req, socket, head)
    })

    await new Promise<void>(resolve => {
        proxyServer.listen(masterPort, resolve)
    })

    log.info('Listening for requests')

    // setInterval(() => {
    //     const message = JSON.stringify({ type: 'time', time: new Date().toISOString() })
    //     redis.publish('main', message)
    // }, 2500)
}

run()
