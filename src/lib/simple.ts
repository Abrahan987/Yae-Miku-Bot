
import fs from 'fs';
import path from 'path';
import {
    proto,
    getContentType,
    jidDecode,
    downloadContentFromMessage
} from '@whiskeysockets/baileys';

const sessionDirs = (): string[] => {
    const dirs = [path.join(process.cwd(), 'sessions')];
    const subsDir = path.join(process.cwd(), 'subs');

    try {
        for (const d of fs.readdirSync(subsDir)) {
            dirs.push(path.join(subsDir, d));
        }
    } catch {}

    return dirs;
};

const maxLidCacheSize = 5000;

export const lidCache = new Map<string, string>();

function setLidCache(lid: string, jid: string): void {
    if (lidCache.size >= maxLidCacheSize) {
        const firstKey = lidCache.keys().next().value;

        if (firstKey) {
            lidCache.delete(firstKey);
        }
    }

    lidCache.set(lid, jid);
}

const messageCache = new WeakMap<object, any>();
const contentTypeCache = new WeakMap<object, string | undefined>();
const mediaMessageCache = new WeakMap<object, Map<string, { message: any; expiresAt: number }>>();
const MEDIA_MESSAGE_CACHE_LIMIT = 500;
const MEDIA_MESSAGE_CACHE_TTL = 60 * 60 * 1000;

export function rememberParticipants(participants: any[]): void {
    for (const p of participants || []) {
        const ids = [
            p?.id,
            p?.lid,
            p?.phoneNumber
        ].filter(
            (x) => typeof x === 'string'
        ) as string[];

        const pn = ids.find(
            (x) => x.endsWith('@s.whatsapp.net')
        );

        if (!pn) continue;

        for (const x of ids) {
            const m = x.match(/^([^@:]+)(?::\d+)?@lid$/);

            if (m) {
                setLidCache(m[1], decodeJid(pn));
            }
        }
    }
}

export function learnLid(a: any, b: any): void {
    const ids = [a, b].filter(
        (x) => typeof x === 'string'
    ) as string[];

    const pn = ids.find(
        (x) => x.endsWith('@s.whatsapp.net')
    );

    if (!pn) return;

    for (const x of ids) {
        const m = x.match(/^([^@:]+)(?::\d+)?@lid$/);

        if (m) {
            setLidCache(m[1], decodeJid(pn));
        }
    }
}

export const decodeJid = (jid: any): string => {
    if (!jid || typeof jid !== 'string') {
        return '';
    }

    if (jid.includes(':')) {
        const decoded = jidDecode(jid);

        return decoded?.user && decoded?.server
            ? `${decoded.user}@${decoded.server}`
            : jid.split(':')[0] + '@' +
              (jid.split('@')[1] || 's.whatsapp.net');
    }

    return jid;
};

function getCachedContentType(
    rawMsg: any
): string | undefined {
    if (!rawMsg || typeof rawMsg !== 'object') {
        return undefined;
    }

    if (contentTypeCache.has(rawMsg)) {
        return contentTypeCache.get(rawMsg);
    }

    const type = getContentType(rawMsg);

    contentTypeCache.set(rawMsg, type);

    return type;
}

function unwrapMessage(message: any): any {
    if (!message || typeof message !== 'object') {
        return message;
    }

    let raw = message;
    const wrappers = [
        'ephemeralMessage',
        'viewOnceMessage',
        'viewOnceMessageV2',
        'viewOnceMessageV2Extension',
        'documentWithCaptionMessage'
    ];
    let previous: any;
    do {
        previous = raw;
        for (const wrapper of wrappers) {
            if (raw?.[wrapper]?.message) {
                raw = raw[wrapper].message;
                break;
            }
        }
    } while (raw && raw !== previous);

    return raw;
}

function hasMediaDownloadReference(media: any): boolean {
    return Boolean(
        media?.mediaKey &&
        (typeof media.directPath === 'string' && media.directPath ||
            typeof media.url === 'string' && media.url)
    );
}

function rememberMediaMessage(sock: any, message: any): void {
    const key = message?.key;
    const id = key?.id;
    const chatJid = decodeJid(key?.remoteJid || '');
    if (!sock || !id || !chatJid) return;

    const content = unwrapMessage(message.message);
    const type = getCachedContentType(content);
    if (!['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].includes(type || '')) return;
    if (!hasMediaDownloadReference(content[type as string])) return;

    let cache = mediaMessageCache.get(sock);
    if (!cache) {
        cache = new Map();
        mediaMessageCache.set(sock, cache);
    }

    const now = Date.now();
    for (const [cacheKey, entry] of cache) {
        if (entry.expiresAt <= now) cache.delete(cacheKey);
    }

    const cacheKey = `${chatJid}:${id}`;
    cache.delete(cacheKey);
    cache.set(cacheKey, { message: message.message, expiresAt: now + MEDIA_MESSAGE_CACHE_TTL });
    while (cache.size > MEDIA_MESSAGE_CACHE_LIMIT) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
        else break;
    }
}

function getCachedMediaMessage(sock: any, chatJid: string, messageId: string): any {
    const cache = sock && mediaMessageCache.get(sock);
    const cacheKey = `${decodeJid(chatJid)}:${messageId}`;
    const entry = cache?.get(cacheKey);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
        cache?.delete(cacheKey);
        return null;
    }
    cache!.delete(cacheKey);
    cache!.set(cacheKey, entry);
    return entry.message;
}

function extractMessageBody(
    rawMsg: any,
    msgContent: any
): string {
    if (!rawMsg) return '';

    let interactiveId = '';

    const paramsJson =
        msgContent?.nativeFlowResponseMessage?.paramsJson ||
        rawMsg?.interactiveResponseMessage
            ?.nativeFlowResponseMessage?.paramsJson;

    if (typeof paramsJson === 'string') {
        try {
            const parsed = JSON.parse(paramsJson);

            interactiveId =
                typeof parsed?.id === 'string'
                    ? parsed.id
                    : typeof parsed?.selectedId === 'string'
                        ? parsed.selectedId
                        : typeof parsed?.selectedRowId === 'string'
                            ? parsed.selectedRowId
                            : '';
        } catch {}
    }

    return (
        rawMsg.conversation ||
        msgContent?.text ||
        msgContent?.caption ||
        msgContent?.selectedButtonId ||
        msgContent?.singleSelectReply?.selectedRowId ||
        msgContent?.selectedId ||
        interactiveId ||
        ''
    );
}

export const UserJid = (
    sock: any,
    chat?: string,
    jid?: string
): string => {
    const targetJid = jid || chat;

    if (!targetJid || typeof targetJid !== 'string') {
        return '';
    }

    const cleanJid = decodeJid(targetJid);

    if (
        cleanJid.endsWith('@s.whatsapp.net') ||
        cleanJid.endsWith('@g.us')
    ) {
        return cleanJid;
    }

    const lidMatch = cleanJid.match(
        /^([^@:]+)(?::\d+)?@lid$/
    );

    if (!lidMatch) {
        return cleanJid;
    }

    const lidNumber = lidMatch[1];

    if (lidCache.has(lidNumber)) {
        return lidCache.get(lidNumber)!;
    }

    if (sock?.signalRepository?.lidMapping) {
        try {
            const cachedPn =
                sock.signalRepository.lidMapping
                    .mappingCache?.get(`lid:${lidNumber}`);

            if (cachedPn) {
                const resolvedJid =
                    `${cachedPn}@s.whatsapp.net`;

                setLidCache(lidNumber, resolvedJid);

                return resolvedJid;
            }
        } catch {}
    }

    for (const dir of sessionDirs()) {
        const mappingFile = path.join(
            dir,
            `lid-mapping-${lidNumber}_reverse.json`
        );

        try {
            if (fs.existsSync(mappingFile)) {
                const phoneStr = JSON.parse(
                    fs.readFileSync(mappingFile, 'utf-8')
                );

                if (phoneStr) {
                    const resolvedJid =
                        `${phoneStr}@s.whatsapp.net`;

                    setLidCache(lidNumber, resolvedJid);

                    return resolvedJid;
                }
            }
        } catch {}
    }

    return cleanJid;
};

async function downloadMedia(
    media: any,
    msgType: string
): Promise<Buffer | null> {
    if (!media || !msgType) {
        return null;
    }

    if (!hasMediaDownloadReference(media)) return null;

    try {
        const stream = await downloadContentFromMessage(
            media as any,
            msgType.replace('Message', '') as any
        );

        const chunks: Buffer[] = [];

        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        return Buffer.concat(chunks);
    } catch (downloadError) {
        console.error(
            '[SERIALIZE ERROR]:',
            downloadError
        );

        return null;
    }
}

function processQuotedMessage(
    sock: any,
    chatJid: string,
    contextInfo: any
): any {
    if (!contextInfo?.quotedMessage) {
        return null;
    }

    try {
        const quotedRaw = unwrapMessage(
            contextInfo.quotedMessage
        );

        const quotedType = getCachedContentType(
            quotedRaw
        );

        let quotedMsg = quotedType
            ? quotedRaw[quotedType]
            : null;
        if (!hasMediaDownloadReference(quotedMsg) && contextInfo.stanzaId) {
            const cachedMessage = getCachedMediaMessage(
                sock,
                chatJid,
                String(contextInfo.stanzaId)
            );
            if (cachedMessage) {
                const cachedRaw = unwrapMessage(cachedMessage);
                const cachedType = getCachedContentType(cachedRaw);
                const cachedMedia = cachedType ? cachedRaw[cachedType] : null;
                if (cachedType === quotedType && hasMediaDownloadReference(cachedMedia)) {
                    quotedMsg = cachedMedia;
                }
            }
        }

        const quotedBody =
            quotedRaw?.conversation ||
            quotedMsg?.text ||
            quotedMsg?.caption ||
            '';

        const quotedParticipant = decodeJid(
            contextInfo.participant || ''
        );

        const resolvedParticipant = UserJid(
            sock,
            chatJid,
            quotedParticipant
        );

        const botJids = [
            sock.user?.id,
            sock.user?.lid
        ].map(decodeJid).filter(Boolean);

        const botSet = new Set([
            ...botJids,
            ...botJids.map(
                (j) => UserJid(sock, chatJid, j)
            )
        ]);

        return {
            type: quotedType,
            msg: quotedMsg,
            key: {
                remoteJid: chatJid,
                fromMe: [
                    quotedParticipant,
                    resolvedParticipant
                ].some(
                    (j) => botSet.has(j)
                ),
                id: contextInfo.stanzaId,
                participant: resolvedParticipant
            },
            sender: resolvedParticipant,
            body: quotedBody,
            mentionedJid: (
                (contextInfo.mentionedJid || []) as string[]
            ).map(
                (j) => UserJid(sock, chatJid, j) || j
            ),
            download: (): Promise<Buffer | null> =>
                downloadMedia(
                    quotedMsg,
                    quotedType || ''
                )
        };
    } catch (error) {
        console.error(
            '[SERIALIZE ERROR]:',
            error
        );

        return null;
    }
}

export function serialize(
    sock: any,
    m: proto.IWebMessageInfo
): any {
    if (
        !m ||
        typeof m !== 'object' ||
        !m.message
    ) {
        return null;
    }

    if (messageCache.has(m)) {
        return messageCache.get(m);
    }

    try {
        rememberMediaMessage(sock, m);
        const rawMsg = unwrapMessage(m.message);

        const msgType = getCachedContentType(
            rawMsg
        );

        if (!msgType) {
            return null;
        }

        const msg = rawMsg[msgType];

        const body = extractMessageBody(
            rawMsg,
            msg
        );

        const key = m.key || {};

        const remoteJid = decodeJid(
            key.remoteJid || ''
        );

        const chat = UserJid(
            sock,
            remoteJid
        );

        const rawSender = decodeJid(
            key.participant || remoteJid
        );

        const sender = UserJid(
            sock,
            chat,
            rawSender
        );

        const isGroup = chat.endsWith('@g.us');
        const isBot = !!key.fromMe;

        const contextInfo =
            msg?.contextInfo ||
            rawMsg?.contextInfo;

        const quoted = processQuotedMessage(
            sock,
            chat,
            contextInfo
        );

        const mentionedJid = (
            (contextInfo?.mentionedJid || []) as string[]
        ).map(
            (j) => UserJid(sock, chat, j) || j
        );

        const result = {
            ...m,
            type: msgType,
            body,
            chat,
            sender,
            from: chat,
            isGroup,
            isBot,
            quoted,
            mentionedJid,
            pushName: m.pushName || 'Usuario',
            reply: (text: string) => {
                if (!chat) {
                    console.error(
                        '[SERIALIZE ERROR]: Chat JID missing'
                    );

                    return Promise.reject(
                        new Error('Chat JID missing')
                    );
                }

                return sock.sendMessage(
                    chat,
                    { text },
                    { quoted: m }
                );
            },
            download: (): Promise<Buffer | null> =>
                downloadMedia(
                    msg,
                    msgType
                )
        };

        messageCache.set(m, result);

        return result;
    } catch (error) {
        console.error(
            '[SERIALIZE ERROR]:',
            error
        );

        return null;
    }
}
