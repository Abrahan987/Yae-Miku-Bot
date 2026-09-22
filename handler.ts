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

async function executeCommand(
    sock: WASocket,
    rawMsg: any,
    msg: any
) {
    if (!msg.body) return;

    const text = msg.body.trim();
    if (!text) return;

    const firstSpaceIndex = text.indexOf(' ');
    const rawCmd = (firstSpaceIndex === -1 ? text : text.slice(0, firstSpaceIndex)).toLowerCase();
    
    if (!rawCmd) return;

    const prefixRegex = global.prefix || /^[./#!]/;
    const cleanCmd = rawCmd.replace(prefixRegex, '');

    const runFn = commandMap.get(rawCmd) || commandMap.get(cleanCmd);
    if (!runFn) return;

    const args = firstSpaceIndex === -1 ? [] : text.slice(firstSpaceIndex + 1).trim().split(/\s+/);

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
