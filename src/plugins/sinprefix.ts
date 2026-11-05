import { setSetting } from '../lib/database.ts';
import { isOwner, deco, warn } from '../lib/perms.ts';

export const command = ['notprefix', 'prefixnull', 'sinprefix'];
export const category = 'owner';
export const description = 'Activar o desactivar el modo sin prefijo (solo owner).';
export const admin = false;
export const botAdmin = false;
export const owner = true;

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    if (!isOwner(sock, msg, rawMsg)) {
        return sock.sendMessage(msg.from, { text: warn.owner() }, { quoted: msg });
    }

    const arg = String((extra?.args || [])[0] || '').toLowerCase();
    const current = !!(global as any).noPrefix;
    const next = ['off', 'false', 'desactivar', 'no', '0'].includes(arg) ? false
        : ['on', 'true', 'activar', 'si', 'sí', '1'].includes(arg) ? true
        : !current;

    setSetting('noprefix', next ? '1' : '0');
    (global as any).noPrefix = next;

    const text = next
        ? '🪷 Modo *sin prefijo* activado.\n> Los comandos responden sin prefijo (con prefijo también funcionan).\n> Desactívalo con *sinprefix off*.'
        : '🪷 Modo *sin prefijo* desactivado.\n> Los comandos vuelven a requerir prefijo.';
    return sock.sendMessage(msg.from, { text: deco('𝚂𝙸𝙽 𝙿𝚁𝙴𝙵𝙸𝙹𝙾', text) }, { quoted: msg });
}
