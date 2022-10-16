export type DbUser = { id: string; messageCount: number }
export type DbChat = { id: string }
export type DbMessage = { id: string; chatId: string; userId: string; text: string; createdAt: Date }

export type ResListChats = { type: 'listChats'; chats: DbChat[] }
export type ReqCreateMessage = { type: 'createMessage'; message: Pick<DbMessage, 'chatId' | 'text'> }
export type ReqListMessages = { type: 'listMessages'; chatId: string }
export type ResListMessages = { type: 'listMessages'; chatId: string; messages: DbMessage[] }
export type ReqListen = { type: 'listen'; channel: string }
export type ReqUnlisten = { type: 'unlisten'; channel: string }

export type ClientCtx = {
    userId: string
    listeners: Map<string, (message: string, chanell: string) => void>
}
