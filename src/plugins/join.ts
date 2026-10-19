import { isOwner, deco, warn } from '../lib/perms.ts';

export const command = ['join', 'unir'];
export const category = 'owner';
export const description = 'Unir el bot a un grupo (solo owner).';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    if (!isOwner(sock, msg, rawMsg)) {
        return sock.sendMessage(msg.from, { text: warn.owner() }, { quoted: msg });
    }

    const link = extra?.args?.[0];
    if (!link) {
        return sock.sendMessage(
            msg.from,
            { text: deco('𝚄𝙽𝙸𝚁𝙼𝙴', `🪷 𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n> ${(global as any).prefix[0]}join https://chat.whatsapp.com/XXXXXXXXXXXXXXXXXXXXXX`) },
            { quoted: msg }
        );
    }

    const match = link.match(/chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i);
    if (!match?.[1]) {
        return sock.sendMessage(
            msg.from,
            { text: deco('𝚄𝙽𝙸𝚁𝙼𝙴', '🪷 El enlace ingresado no es válido o está incompleto.') },
            { quoted: msg }
        );
    }

    try {
        await sock.groupAcceptInvite(match[1]);
        return sock.sendMessage(
            msg.from,
            { text: deco('𝚄𝙽𝙸𝚁𝙼𝙴', '🪷 El bot se ha unido exitosamente al grupo.') },
            { quoted: msg }
        );
    } catch (e: any) {
        const err = String(e?.message || e);
        let reason = 'No se pudo unir al grupo, verifica el enlace o los permisos.';
        if (err.includes('not-authorized') || err.includes('requires-admin')) {
            reason = 'La unión requiere aprobación de un administrador. Espera a que acepten la solicitud.';
        } else if (err.includes('not-in-group') || err.includes('removed')) {
            reason = 'No se pudo unir porque el bot fue eliminado recientemente del grupo.';
        }
        return sock.sendMessage(
            msg.from,
            { text: deco('𝚄𝙽𝙸𝚁𝙼𝙴', `🪷 ${reason}`) },
            { quoted: msg }
        );
    }
}
