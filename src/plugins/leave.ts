import { isOwner, deco, warn } from '../lib/perms.ts';

export const command = ['leave', 'salir'];
export const category = 'owner';
export const description = 'Hacer que el bot salga de un grupo (solo owner).';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    if (!isOwner(sock, msg, rawMsg)) {
        return sock.sendMessage(msg.from, { text: warn.owner() }, { quoted: msg });
    }

    const groupId = extra?.args?.[0] || msg.from;
    if (!String(groupId).endsWith('@g.us')) {
        return sock.sendMessage(
            msg.from,
            { text: deco('𝚂𝙰𝙻𝙸𝚁', `🪷 𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n> ${(global as any).prefix[0]}leave 120363XXXXXXXXXX@g.us\n\nO usa el comando dentro del grupo que quieres abandonar.`) },
            { quoted: msg }
        );
    }

    try {
        await sock.groupLeave(groupId);
    } catch (e: any) {
        return sock.sendMessage(
            msg.from,
            { text: deco('𝚂𝙰𝙻𝙸𝚁', `🪷 No se pudo salir del grupo.\n> ${e?.message || e}`) },
            { quoted: msg }
        );
    }
}
