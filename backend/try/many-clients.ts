import WebSocket from 'ws'

async function run() {
    const connectionPageSize = 500
    const connectionPages = 30
    const chatCount = 3
    const port = '8091'

    console.log(`Starting ${connectionPageSize * connectionPages} connections`)

    let connectionsCount = 0
    for (let j = 0; j < connectionPages; j++) {
        for (let i = 1; i <= connectionPageSize; i++) {
            const userId = `User${connectionsCount}`
            connectionsCount++

            const url = 'ws://localhost:' + port + '/?userId=' + userId
            // const listenChatId = `Chat${(i % chatCount) + 1}`

            const client = new WebSocket(url)
            client.onopen = () => {
                // const listChatsReq = { type: 'listen', channel: `chat_${listenChatId}` }
                // client.send(JSON.stringify(listChatsReq))

                for (let c = 1; c <= chatCount; c++) {    
                    const listChatsReq = { type: 'listen', channel: `chat_Chat${c}` }
                    client.send(JSON.stringify(listChatsReq))
                }
            }

            client.onmessage = () => {
                console.log(`Message received; userId: ${userId}`)
            }
        }

        // Wait a second to not overload:
        await new Promise(r => setTimeout(r, 1000))
    }
}

run()
