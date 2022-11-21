class Api {
    _port = '8090'
    _webSocket = null
    _listenChatId = null

    constructor(render) {
        this._render = render
    }

    connect(userId) {
        if (!userId) {
            alert('Please enter username')
            return
        }

        this.disconnect()

        const url = 'ws://localhost:' + this._port + '/?userId=' + userId
        this._webSocket = new WebSocket(url)

        this._webSocket.onmessage = event => {
            const res = JSON.parse(event.data)
            console.debug('Incomming message', res)

            switch (res.type) {
                case 'listChats':
                    this._render.chats(res, userId)
                    break
                case 'listMessages':
                    this._render.messages(res, userId)
                    break
            }
        }

        this._webSocket.onopen = () => {
            this._send({ type: 'listChats' })
        }
    }

    disconnect() {
        if (!this._webSocket) {
            return
        }

        this._webSocket.close()

        this._render.reset()
    }

    openChat(chatId) {
        if (this._listenChatId) {
            this._send({ type: 'unlisten', channel: `chat_${this._listenChatId}` })
            this._listenChatId = undefined
        }

        this._send({ type: 'listMessages', chatId })
        this._send({ type: 'listen', channel: `chat_${chatId}` })

        this._listenChatId = chatId
    }

    createMessage(chatId, text) {
        if (!text) {
            alert('Please enter message text')
            return
        }

        this._send({
            type: 'createMessage',
            message: { chatId, text }
        })
    }

    _send(message) {
        if (!this._webSocket || this._webSocket.readyState !== 1) {
            throw new Error('Trying to send messages to closed connection')
        }

        this._webSocket.send(JSON.stringify(message))
    }
}
