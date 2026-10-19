import { UserJid } from '#simple';

export const command = ['userinfo', 'info', 'datos'];
export const category = 'utils';
export const description = 'Muestra información de WhatsApp de un usuario (JID, LID, número, foto y estado).';

const num = (x: any): string =>
    String(x || '').split('@')[0].split(':')[0].replace(/[^\d]/g, '');

export default async function (sock: any, msg: any) {
    const raw: string = (msg.mentionedJid || [])[0] || msg.quoted?.sender || msg.sender;

    if (!raw) {
        return msg.reply(
            `🍓 *USERINFO*\n\n` +
            `🪷 Uso:\n` +
            `> ${(global as any).prefix?.[0] || '.'}userinfo @usuario\n` +
            `> O responde a su mensaje\n\n` +
            `ꨄ︎ ${(global as any).nmcreador}`
        );
    }

    try {
        let jid = raw;
        let lid = raw.includes('@lid') ? raw : '';
        let name = '';

        // Si estamos en un grupo, buscamos al usuario en los participantes para obtener JID y LID reales.
        if (msg.isGroup) {
            try {
                const metadata = await sock.groupMetadata(msg.from);
                const wanted = num(raw);
                let resolved = raw;
                try { resolved = UserJid(sock, msg.from, raw) || raw; } catch {}
                const wantedAlt = num(resolved);

                const p = (metadata?.participants || []).find((x: any) =>
                    [x.id, x.lid, x.phoneNumber].map(num).some((n) => n && (n === wanted || n === wantedAlt))
                );

                if (p) {
                    if (p.phoneNumber) jid = p.phoneNumber;
                    else if (p.id && String(p.id).endsWith('@s.whatsapp.net')) jid = p.id;
                    else if (resolved.endsWith('@s.whatsapp.net')) jid = resolved;

                    if (p.lid) lid = p.lid;
                    else if (p.id && String(p.id).endsWith('@lid')) lid = p.id;

                    name = p.name || p.notify || '';
                } else if (resolved.endsWith('@s.whatsapp.net')) {
                    jid = resolved;
                }
            } catch {}
        } else {
            try { jid = UserJid(sock, msg.from, raw) || raw; } catch {}
        }

        if (!name && raw === msg.sender) name = msg.pushName || '';
        if (!name && msg.quoted && raw === msg.quoted.sender) name = msg.quoted.pushName || '';

        const number = num(jid.endsWith('@s.whatsapp.net') ? jid : raw);
        const jidShow = jid.endsWith('@s.whatsapp.net') ? jid : `${number}@s.whatsapp.net`;
        const lidShow = lid || 'No disponible';

        const target = jid.endsWith('@s.whatsapp.net') ? jid : raw;

        let profileUrl = '';
        try { profileUrl = (await sock.profilePictureUrl(target, 'image')) || ''; } catch {}

        let status = 'Sin estado';
        try {
            const s: any = await sock.fetchStatus(target);
            status = (Array.isArray(s) ? s[0]?.status?.status : s?.status) || 'Sin estado';
        } catch {}

        const text = [
            `${(global as any).namebot}`,
            '',
            '🔍 *INFORMACIÓN DE WHATSAPP*',
            '',
            `📱 *Número:* +${number || 'No disponible'}`,
            `🆔 *JID:* ${jidShow}`,
            `🔐 *LID:* ${lidShow}`,
            `👤 *Nombre:* ${name || 'Desconocido'}`,
            `📝 *Estado:* ${status}`,
            `📸 *Foto:* ${profileUrl ? 'Disponible' : 'Sin foto'}`,
            '',
            `ꨄ︎ ${(global as any).nmcreador}`
        ].join('\n');

        if (profileUrl) {
            return sock.sendMessage(
                msg.from,
                { image: { url: profileUrl }, caption: text, mentions: [target] },
                { quoted: msg }
            );
        }

        return sock.sendMessage(msg.from, { text, mentions: [target] }, { quoted: msg });
    } catch (error: any) {
        console.error('[USERINFO ERROR]:', error);
        return msg.reply(`🍥 Ocurrió un error al obtener la información del usuario.\n\n📌 ${error?.message || String(error)}`);
    }
}
