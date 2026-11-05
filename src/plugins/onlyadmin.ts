import { setSetting, getSetting } from '../lib/database.ts';
import { deco, warn } from '../lib/perms.ts';

export const command = ['onlyadmin', 'modoadmin'];
export const category = 'admin';
export const description = 'Activar o desactivar el modo solo admins en el grupo.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return sock.sendMessage(msg.from, { text: warn.group() }, { quoted: msg });
    }
    if (!extra?.isOwner && !extra?.isAdmin) {
        return sock.sendMessage(msg.from, { text: warn.admin() }, { quoted: msg });
    }

    const key = `onlyadmin:${msg.from}`;
    const arg = String((extra?.args || [])[0] || '').toLowerCase();
    const current = getSetting(key) === '1';
    const next = ['off', 'false', 'desactivar', 'no', '0'].includes(arg) ? false
        : ['on', 'true', 'activar', 'si', 'sí', '1'].includes(arg) ? true
        : !current;

    setSetting(key, next ? '1' : '0');

    const text = next
        ? '🪷 Modo *solo admins* activado.\n> El bot solo responderá al owner y a los administradores de este grupo.'
        : '🪷 Modo *solo admins* desactivado.\n> El bot responde a todos los miembros.';
    return sock.sendMessage(msg.from, { text: deco('𝙾𝙽𝙻𝚈 𝙰𝙳𝙼𝙸𝙽', text) }, { quoted: msg });
}
