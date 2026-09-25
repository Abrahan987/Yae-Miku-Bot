import './config.ts';
import type { WASocket } from '@whiskeysockets/baileys';
import { serialize, UserJid } from '#simple';
import { getUser, getGroup, updateUser, incrementCommandCount } from '#db';
import { loadPlugins, watchPlugins, commandMap, pluginData } from '#loader';
import { LRUCache } from 'lru-cache';

loadPlugins().catch(() => {});
watchPlugins();

const DUP_LIMIT = 2000;
const metaTtlMs = 300000;

const processedIdsSet = new Set<string>();
const processedIdsQueue: string[] = [];

const groupMetaCache = new LRUCache<string, { metadata: any; ts: number }>({
    max: 500,
    ttl: metaTtlMs
});

export function invalidateGroupCache(chatId: string): void {
    if (chatId) groupMetaCache.delete(chatId);
}

function isDuplicate(msgId: string): boolean {
    if (processedIdsSet.has(msgId)) return true;

    processedIdsSet.add(msgId);
    processedIdsQueue.push(msgId);

    if (processedIdsQueue.length > DUP_LIMIT) {
        const oldest = processedIdsQueue.shift();
        if (oldest) processedIdsSet.delete(oldest);
    }
    return false;
}

const normalizeNumber = (x: string) => String(x || "").split("@")[0].split(":")[0].replace(/[^\d]/g, "").trim();

const stripMexOne = (num: string) => num.startsWith('521') ? '52' + num.slice(3) : num;

function getAdminSet(participants: any[]): Set<string> {
    const adminSet = new Set<string>();
    if (!participants || !participants.length) return adminSet;

    for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        if (p.admin === 'admin' || p.admin === 'superadmin') {
            if (p.id) {
                const clean = normalizeNumber(p.id);
                adminSet.add(clean);
                adminSet.add(stripMexOne(clean));
                adminSet.add(p.id);
            }
            if (p.lid) {
                const clean = normalizeNumber(p.lid);
                adminSet.add(clean);
                adminSet.add(stripMexOne(clean));
                adminSet.add(p.lid);
            }
            if (p.phoneNumber) {
                const clean = normalizeNumber(p.phoneNumber);
                adminSet.add(clean);
                adminSet.add(p.phoneNumber);
            }
        }
    }
    return adminSet;
}

async function getGroupMetadata(sock: any, chatId: string): Promise<any> {
    const cached = groupMetaCache.get(chatId);
    if (cached?.metadata) {
        return cached.metadata;
    }
    try {
        const freshMeta = await sock.groupMetadata(chatId);
        if (freshMeta) {
            groupMetaCache.set(chatId, { metadata: freshMeta, ts: Date.now() });
            return freshMeta;
        }
    } catch {}
    return null;
}

function extractCommandInfo(text: string): { cleanCmd: string; usedPrefix: string } | null {
    const prefixes = (global as any).prefix;
    let usedPrefix = '';

    if (Array.isArray(prefixes)) {
        for (let i = 0; i < prefixes.length; i++) {
            if (text.startsWith(prefixes[i])) {
                usedPrefix = prefixes[i];
                break;
            }
        }
    } else if (typeof prefixes === 'string' && text.startsWith(prefixes)) {
        usedPrefix = prefixes;
    }

    if (!usedPrefix) return null;

    let startPos = usedPrefix.length;
    while (startPos < text.length && text.charCodeAt(startPos) === 32) {
        startPos++;
    }

    let spacePos = text.indexOf(' ', startPos);
    if (spacePos === -1) spacePos = text.length;

    const cleanCmd = text.slice(startPos, spacePos).toLowerCase();
    if (!cleanCmd) return null;

    return { cleanCmd, usedPrefix };
}

async function executeCommand(
    sock: WASocket,
    rawMsg: any,
    msg: any
) {
    if (!msg || !msg.body) return;
    const text = msg.body.trim();
    if (!text) return;

    const parsed = extractCommandInfo(text);
    if (!parsed) return;

    const { cleanCmd, usedPrefix } = parsed;

    const runFn = commandMap.get(cleanCmd) || commandMap.get(`${usedPrefix}${cleanCmd}`);
    if (!runFn) return;

    let startPos = usedPrefix.length;
    while (startPos < text.length && text.charCodeAt(startPos) === 32) {
        startPos++;
    }
    
    const firstSpaceIndex = text.indexOf(' ', startPos);
    const args = firstSpaceIndex === -1 
        ? [] 
        : text.slice(firstSpaceIndex + 1).trim().split(/\s+/).filter(Boolean);

    let groupMetadata: any = null;
    let participants: any[] = [];
    let groupAdmins: string[] = [];
    let isAdmin = false;
    let isBotAdmin = false;

    if (msg.isGroup) {
        try {
            groupMetadata = await getGroupMetadata(sock, msg.from);
            participants = groupMetadata?.participants || [];
            
            const adminSet = getAdminSet(participants);
            
            groupAdmins = participants
                .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                .map(p => p.id);

            const rawParticipant = rawMsg?.key?.participant || rawMsg?.participant || (rawMsg?.key?.fromMe ? sock.user?.id : msg.from) || '';
            const msgSender = rawMsg?.sender || msg.sender || '';

            let realJidResult = rawParticipant;
            try {
                realJidResult = UserJid(sock, msg.from, realJidResult) || realJidResult;
            } catch {}

            const normalizedSender = normalizeNumber(realJidResult);
            const normalizedMsgSender = normalizeNumber(msgSender);

            const altSender = normalizedSender.startsWith('521') 
                ? normalizedSender.replace(/^521/, '52') 
                : (normalizedSender.startsWith('52') ? normalizedSender.replace(/^52/, '521') : normalizedSender);

            const baseSender = stripMexOne(normalizedSender);

            isAdmin = adminSet.has(normalizedSender) || 
                      adminSet.has(normalizedMsgSender) || 
                      adminSet.has(altSender) || 
                      adminSet.has(baseSender) || 
                      adminSet.has(rawParticipant) || 
                      adminSet.has(msgSender);

            const rawBotJid = sock.user?.id || (sock.user as any)?.jid || '';
            const botBase = normalizeNumber(rawBotJid);
            const altBot = botBase.startsWith('521') 
                ? botBase.replace(/^521/, '52') 
                : (botBase.startsWith('52') ? botBase.replace(/^52/, '521') : botBase);

            isBotAdmin = adminSet.has(botBase) || adminSet.has(altBot) || adminSet.has(stripMexOne(botBase)) || adminSet.has(rawBotJid);
        } catch {}
    }

    const pluginObj = (runFn as any)?.plugin || runFn;
    if (pluginObj?.admin && !isAdmin) {
        return msg.reply('ׅ  ׄ  ✿ Necesitas ser administrador del grupo para usar este comando.');
    }
    if (pluginObj?.botAdmin && !isBotAdmin) {
        return msg.reply('ׅ  ׄ  ✿ El bot necesita ser administrador del grupo para ejecutar este comando.');
    }

    const dbHelpers = {
        getUser: async () => {
            try { return await getUser(msg.sender); } catch { return null; }
        },
        getGroup: async () => {
            try { return await getGroup(msg.from); } catch { return null; }
        },
        updateUser: async (data: any) => {
            try { return await updateUser(msg.sender, data); } catch { return null; }
        },
        incrementCommandCount
    };

    const extra = {
        text,
        args,
        command: cleanCmd,
        pluginData,
        groupMetadata,
        participants,
        groupAdmins,
        isAdmin,
        isBotAdmin
    };

    try {
        await runFn(sock, msg, extra, dbHelpers, rawMsg);
    } catch (error) {
        console.error(`[COMMAND ERROR] .${cleanCmd}:`, error);
        
        void sock.sendMessage(
            msg.from,
            { text: `Ocurrió un error al ejecutar el comando *${cleanCmd}*.` },
            { quoted: msg }
        ).catch(() => {});
    }
}

export function handler(sock: WASocket) {
    sock.ev.on(
        'messages.upsert',
        async ({ messages, type }) => {
            if (type !== 'notify' || !Array.isArray(messages)) return;

            const len = messages.length;
            for (let i = 0; i < len; i++) {
                try {
                    const rawMsg = messages[i];
                    const msgId = rawMsg?.key?.id;
                    if (!msgId || !rawMsg.message) continue;

                    if (isDuplicate(msgId)) continue;

                    const jid = rawMsg.key.remoteJid || '';
                    if (!jid || jid === 'status@broadcast' || jid.endsWith('@broadcast')) continue;

                    const msg = serialize(sock, rawMsg);
                    if (!msg) continue;

                    await executeCommand(sock, rawMsg, msg);
                } catch (err) {
                    console.error('[HANDLER ERROR]:', err);
                }
            }
        }
    );
}
