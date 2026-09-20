import { WASocket, proto, jidNormalizedUser } from '@whiskeysockets/baileys';

export interface SerializedMessage {
    id: string;
    key: proto.IMessageKey;
    from: string;
    sender: string;
    isGroup: boolean;
    fromMe: boolean;
    pushName: string;
    body: string;
    message: proto.IMessage;
    type: string;
    mentionedJid: string[];
    isQuoted: boolean;
    quoted: SerializedQuoted | null;
    reply: (text: string) => Promise<proto.IWebMessageInfo | undefined>;
}

export interface SerializedQuoted {
    id: string;
    sender: string;
    message: proto.IMessage;
    type: string;
    body: string;
    mentionedJid: string[];
}

export function serialize(sock: WASocket, rawMsg: proto.IWebMessageInfo): SerializedMessage | null {
    if (!rawMsg || !rawMsg.key) return null;

    const key = rawMsg.key;
    const from = key.remoteJid || '';
    const isGroup = from.endsWith('@g.us');
    const fromMe = key.fromMe || false;

    let sender = fromMe
        ? sock.user?.id || ''
        : isGroup
        ? key.participant || ''
        : from;

    sender = jidNormalizedUser(sender);

    const message = rawMsg.message?.ephemeralMessage?.message || rawMsg.message || {};
    const type = Object.keys(message)[0] || '';

    let body = '';
    if (type === 'conversation') {
        body = message.conversation || '';
    } else if (type === 'extendedTextMessage') {
        body = message.extendedTextMessage?.text || '';
    } else if (type === 'imageMessage') {
        body = message.imageMessage?.caption || '';
    } else if (type === 'videoMessage') {
        body = message.videoMessage?.caption || '';
    } else if (type === 'buttonsResponseMessage') {
        body = message.buttonsResponseMessage?.selectedButtonId || '';
    } else if (type === 'listResponseMessage') {
        body = message.listResponseMessage?.singleSelectReply?.selectedRowId || '';
    } else if (type === 'templateButtonReplyMessage') {
        body = message.templateButtonReplyMessage?.selectedId || '';
    }

    const contextInfo = message[type as keyof proto.IMessage]?.contextInfo;
    const mentionedJid = contextInfo?.mentionedJid || [];

    let quoted: SerializedQuoted | null = null;
    if (contextInfo?.quotedMessage) {
        const qMsg = contextInfo.quotedMessage;
        const qType = Object.keys(qMsg)[0] || '';
        let qBody = '';

        if (qType === 'conversation') qBody = qMsg.conversation || '';
        else if (qType === 'extendedTextMessage') qBody = qMsg.extendedTextMessage?.text || '';
        else if (qType === 'imageMessage') qBody = qMsg.imageMessage?.caption || '';
        else if (qType === 'videoMessage') qBody = qMsg.videoMessage?.caption || '';

        quoted = {
            id: contextInfo.stanzaId || '',
            sender: jidNormalizedUser(contextInfo.participant || ''),
            message: qMsg,
            type: qType,
            body: qBody,
            mentionedJid: qMsg[qType as keyof proto.IMessage]?.contextInfo?.mentionedJid || []
        };
    }

    const reply = async (text: string) => {
        return sock.sendMessage(from, { text }, { quoted: rawMsg });
    };

    return {
        id: key.id || '',
        key,
        from,
        sender,
        isGroup,
        fromMe,
        pushName: rawMsg.pushName || 'Usuario',
        body,
        message,
        type,
        mentionedJid,
        isQuoted: !!quoted,
        quoted,
        reply
    };
}
