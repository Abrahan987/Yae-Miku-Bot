import './config.js';
import type { WASocket } from '@whiskeysockets/baileys';
import { serialize } from '#simple';
import { getUser, getGroup, updateUser, incrementCommandCount } from '#db';
import { loadPlugins, watchPlugins, commandMap, pluginData } from '#loader';

loadPlugins().catch(() => {});
watchPlugins();

async function executeCommand(
    sock: WASocket,
    rawMsg: any,
    msg: any
) {
    if (!msg.body) return;

    const text = msg.body.trim();
    const args = text.split(/\s+/);

    const rawCmd = args.shift()?.toLowerCase() || '';
    const cleanCmd = rawCmd.replace(/^[./#!]/, '');

    const runFn =
        commandMap.get(rawCmd) ||
        commandMap.get(cleanCmd);

    if (!runFn) return;

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

    await runFn(
        sock,
        msg,
        extra,
        dbHelpers,
        rawMsg
    );
}

export function handler(sock: WASocket) {
    sock.ev.on(
        'messages.upsert',
        ({ messages, type }) => {
            if (type !== 'notify') return;

            for (const rawMsg of messages) {
                if (
                    !rawMsg?.key?.id ||
                    !rawMsg.message
                ) {
                    continue;
                }

                const jid =
                    rawMsg.key.remoteJid || '';

                if (
                    jid === 'status@broadcast' ||
                    jid.endsWith('@broadcast')
                ) {
                    continue;
                }

                const msg = serialize(
                    sock,
                    rawMsg
                );

                if (!msg) continue;

                executeCommand(
                    sock,
                    rawMsg,
                    msg
                ).catch(() => {});
            }
        }
    );
}
