import './config.ts';
import type { WASocket } from '@whiskeysockets/baileys';
import { serialize } from '#simple';
import { getUser, getGroup, updateUser, incrementCommandCount } from '#db';
import { loadPlugins, watchPlugins, commandMap, pluginData } from '#loader';

loadPlugins().catch(() => {});
watchPlugins();

const DUP_CACHE_SIZE = 1000;
const processedIds = new Array<string>(DUP_CACHE_SIZE);
let cacheIndex = 0;

function isDuplicate(msgId: string): boolean {
    for (let i = 0; i < DUP_CACHE_SIZE; i++) {
        if (processedIds[i] === msgId) return true;
    }
    processedIds[cacheIndex] = msgId;
    cacheIndex = (cacheIndex + 1) % DUP_CACHE_SIZE;
    return false;
}

const DEFAULT_PREFIXES = ['.', '#', '/', '!'];

function extractCommandInfo(text: string): { cleanCmd: string; usedPrefix: string } | null {
    const prefixes = global.prefix || DEFAULT_PREFIXES;
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

    const startPos = usedPrefix.length;
    const bodyAfterPrefix = text.slice(startPos).trimStart();
    
    let spacePos = bodyAfterPrefix.indexOf(' ');
    if (spacePos === -1) spacePos = bodyAfterPrefix.length;

    const cleanCmd = bodyAfterPrefix.slice(0, spacePos).toLowerCase();
    if (!cleanCmd) return null;

    return { cleanCmd, usedPrefix };
}

async function executeCommand(
    sock: WASocket,
    rawMsg: any,
    msg: any
) {
    const text = msg.body?.trim();
    if (!text) return;

    const parsed = extractCommandInfo(text);
    if (!parsed) return;

    const { cleanCmd, usedPrefix } = parsed;

    const runFn = commandMap.get(cleanCmd) || commandMap.get(`${usedPrefix}${cleanCmd}`);
    if (!runFn) return;

    const startPos = usedPrefix.length;
    const bodyAfterPrefix = text.slice(startPos).trimStart();
    const firstSpaceIndex = bodyAfterPrefix.indexOf(' ');
    
    const args = firstSpaceIndex === -1 
        ? [] 
        : bodyAfterPrefix.slice(firstSpaceIndex + 1).trim().split(/\s+/);

    const dbHelpers = {
        getUser: () => getUser(msg.sender),
        getGroup: () => getGroup(msg.from),
        updateUser: (data: any) => updateUser(msg.sender, data),
        incrementCommandCount
    };

    const extra = {
        text,
        args,
        command: cleanCmd,
        pluginData
    };

    try {
        await runFn(
            sock,
            msg,
            extra,
            dbHelpers,
            rawMsg
        );
    } catch (error) {
        console.error(`[COMMAND ERROR] Fallo al ejecutar .${cleanCmd}:`, error);
        
        try {
            await sock.sendMessage(
                msg.from,
                { text: `Ocurrio un error al ejecutar el comando *${cleanCmd}*. Por favor reintenta.` },
                { quoted: msg }
            );
        } catch {}
    }
}

export function handler(sock: WASocket) {
    sock.ev.on(
        'messages.upsert',
        ({ messages, type }) => {
            if (type !== 'notify') return;

            for (let i = 0; i < messages.length; i++) {
                const rawMsg = messages[i];
                const msgId = rawMsg?.key?.id;
                if (!msgId || !rawMsg.message) continue;

                if (isDuplicate(msgId)) continue;

                const jid = rawMsg.key.remoteJid || '';
                if (jid === 'status@broadcast' || jid.endsWith('@broadcast')) continue;

                const msg = serialize(sock, rawMsg);
                if (!msg) continue;

                executeCommand(sock, rawMsg, msg).catch(() => {});
            }
        }
    );
}
