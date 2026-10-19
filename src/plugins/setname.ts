import { isOwner, deco, warn } from '../lib/perms.ts';

export const command = ['setname', 'setbotname'];
export const category = 'owner';
export const description = 'Cambiar el nombre del bot (solo owner).';
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
            { text: deco('𝚂𝙴𝚃𝙽𝙰𝙼𝙴', `🪷 𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n> ${(global as any).prefix[0]}setname Yae Miku Bot`) },
            { quoted: msg }
        );
    }

    (global as any).namebot = value;

    return sock.sendMessage(
        msg.from,
        { text: deco('𝚂𝙴𝚃𝙽𝙰𝙼𝙴', `🪷 Nombre del bot actualizado a *${value}*.\n> Se mantiene hasta que el bot se reinicie. Para hacerlo permanente cámbialo en config.ts.`) },
        { quoted: msg }
    );
}
