import { isOwner, deco, warn } from '../lib/perms.ts';

export const command = ['setstatus', 'setbio'];
export const category = 'owner';
export const description = 'Cambiar el estado/bio del bot (solo owner).';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    if (!isOwner(sock, msg, rawMsg)) {
        return sock.sendMessage(msg.from, { text: warn.owner() }, { quoted: msg });
    }

    const value = (extra?.args || []).join(' ').trim();
    if (!value) {
        return sock.sendMessage(
            msg.from,
            { text: deco('𝚂𝙴𝚃𝚂𝚃𝙰𝚃𝚄𝚂', `🪷 𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n> ${(global as any).prefix[0]}setstatus Hola! soy Yae Miku`) },
            { quoted: msg }
        );
    }

    try {
        await sock.updateProfileStatus(value);
        return sock.sendMessage(
            msg.from,
            { text: deco('𝚂𝙴𝚃𝚂𝚃𝙰𝚃𝚄𝚂', `🪷 Estado del bot actualizado a:\n> ${value}`) },
            { quoted: msg }
        );
    } catch (e: any) {
        return sock.sendMessage(
            msg.from,
            { text: deco('𝚂𝙴𝚃𝚂𝚃𝙰𝚃𝚄𝚂', `🪷 No se pudo actualizar el estado.\n> ${e?.message || e}`) },
            { quoted: msg }
        );
    }
}
