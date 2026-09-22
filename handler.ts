import './config.ts';
import type { WASocket } from '@whiskeysockets/baileys';
import { serialize } from '#simple';
import { getUser, getGroup, updateUser, incrementCommandCount } from '#db';
import { loadPlugins, watchPlugins, commandMap, pluginData } from '#loader';

loadPlugins().catch(() => {});
watchPlugins();

const processedMsgIds = new Set<string>();
const MAX_CACHE_SIZE = 1500;

function isDuplicate(msgId: string): boolean {
    if (processedMsgIds.has(msgId)) return true;
    if (processedMsgIds.size >= MAX_CACHE_SIZE) {
        const oldestId = processedMsgIds.values().next().value;
        if (oldestId) processedMsgIds.delete(oldestId);
    }
    processedMsgIds.add(msgId);
    return false;
}

function getPrefix(text: string): string | null {
    const prefixes = global.prefix;
    
    if (Array.isArray(prefixes)) {
        for (const p of prefixes) {
            if (text.startsWith(p)) return p;
        }
        return null;
    }
    
    if (prefixes instanceof RegExp) {
        const match = text.match(prefixes);
        return match ? match[0] : null;
    }

    if (typeof prefixes === 'string') {
        return text.startsWith(prefixes) ? prefixes : null;
    }

    return null;
}

async function executeCommand(
    sock: WASocket,
    rawMsg: any,
    msg: any
) {
    if (!msg.body) return;

    const text = msg.body.trim();
    if (!text) return;

    const usedPrefix = getPrefix(text);

    let cleanText = text;
    if (usedPrefix) {
        cleanText = text.slice(usedPrefix.length).trim();
    }

    const firstSpaceIndex = cleanText.indexOf(' ');
    const cleanCmd = (firstSpaceIndex === -1 ? cleanText : cleanText.slice(0, firstSpaceIndex)).toLowerCase();

    if (!cleanCmd) return;

    const runFn = commandMap.get(cleanCmd) || commandMap.get(`${usedPrefix || ''}${cleanCmd}`);
    if (!runFn) return;

    const args = firstSpaceIndex === -1 ? [] : cleanText.slice(firstSpaceIndex + 1).trim().split(/\s+/);

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

            for (const rawMsg of messages) {
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
