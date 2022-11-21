import http from 'http'
import httpProxy from 'http-proxy'
import { fork } from 'child_process'
import { Log } from './lib'
import { Repo } from './repo'

const masterPort = '8090'
const ports = ['8091', '8092']

async function run() {
    const log = new Log(`P-${masterPort}`)
    log.info(`Proxy is running; pid: ${process.pid}`)

    // Run several instances on every port:
    ports.forEach(port => {
        fork('./dist/worker.js', [], { stdio: 'inherit', env: { PORT: port } })
    })

    const repo = await Repo.init(log)
    await repo.initData()

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
}

run()
