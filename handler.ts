import './config.ts';
import type { WASocket } from '@whiskeysockets/baileys';
import { serialize } from '#simple';
import { getUser, getGroup, updateUser, incrementCommandCount } from '#db';
import { loadPlugins, watchPlugins, commandMap, pluginData } from '#loader';

loadPlugins().catch(() => {});
watchPlugins();

const DUP_LIMIT = 2000;
const processedIdsSet = new Set<string>();
const processedIdsQueue: string[] = [];

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
    const text = msg.body?.trim();
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
        : text.slice(firstSpaceIndex + 1).trim().split(/\s+/);

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
        await runFn(sock, msg, extra, dbHelpers, rawMsg);
    } catch (error) {
        console.error(`[COMMAND ERROR] Fallo al ejecutar .${cleanCmd}:`, error);
        
        void sock.sendMessage(
            msg.from,
            { text: `Ocurrio un error al ejecutar el comando *${cleanCmd}*. Por favor reintenta.` },
            { quoted: msg }
        ).catch(() => {});
    }
}

export function handler(sock: WASocket) {
    sock.ev.on(
        'messages.upsert',
        ({ messages, type }) => {
            if (type !== 'notify') return;

            const len = messages.length;
            for (let i = 0; i < len; i++) {
                const rawMsg = messages[i];
                const msgId = rawMsg?.key?.id;
                if (!msgId || !rawMsg.message) continue;

                if (isDuplicate(msgId)) continue;

                const jid = rawMsg.key.remoteJid || '';
                if (jid === 'status@broadcast' || jid.endsWith('@broadcast')) continue;

                const msg = serialize(sock, rawMsg);
                if (!msg) continue;

                void executeCommand(sock, rawMsg, msg);
            }
        }
    );
}
