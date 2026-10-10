const num = (x: any): string =>
    String(x || '').split('@')[0].split(':')[0].replace(/[^\d]/g, '');

const normalizeJid = (value: any): string => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.includes('@')) return raw;
    return `${raw}@s.whatsapp.net`;
};

const detectLid = (msg: any, fallbackJid: string): string => {
    const candidates = [
        msg?.key?.participant,
        msg?.participant,
        msg?.quoted?.key?.participant,
        msg?.quoted?.participant,
        msg?.sender,
        fallbackJid
    ];

    const lid = candidates
        .map((v) => String(v || '').trim())
        .find((v) => !!v && v.includes('@lid'));

    return lid || 'No disponible';
};

export const command = ['userinfo', 'info', 'datos'];
export const category = 'utils';
export const description = 'Muestra información de WhatsApp de un usuario (JID, LID, número, foto y estado).';

export default async function (sock: any, msg: any) {
    const target = (msg.mentionedJid || [])[0] || msg.quoted?.sender || msg.sender;
    if (!target) {
        return msg.reply(
            `🍓 *USERINFO*\n\n` +
            `🪷 Uso:\n` +
            `> ${(global as any).prefix?.[0] || '.'}userinfo @usuario\n` +
            `> O responde a su mensaje\n\n` +
            `ꨄ︎ ${(global as any).nmcreador}`
        );
    }

    try {
        const rawJid = normalizeJid(target);
        const number = num(rawJid);
        const lid = detectLid(msg, rawJid);

        let profileUrl = '';
        try {
            profileUrl = await sock.profilePictureUrl(rawJid, 'image');
        } catch {
            profileUrl = '';
        }

        let statusText = 'Sin estado';
        try {
            const status = await sock.fetchStatus(rawJid);
            statusText = status?.status || 'Sin estado';
        } catch {
            statusText = 'Sin estado';
        }

        const displayName = (await sock.getName(rawJid).catch(() => '')) || msg.pushName || 'Desconocido';

        const lines = [
            `${(global as any).namebot}`,
            '',
            '🔍 *INFORMACIÓN DE WHATSAPP*',
            '',
            `📱 *Número:* ${number || 'No disponible'}`,
            `🆔 *JID:* ${rawJid || 'No disponible'}`,
            `🔐 *LID:* ${lid}`,
            `👤 *Nombre:* ${displayName}`,
            `📝 *Estado:* ${statusText}`,
            `📸 *Foto de perfil:* ${profileUrl ? 'Disponible' : 'Sin foto'}`,
            '',
            `ꨄ︎ ${(global as any).nmcreador}`
        ].join('\n');

        if (profileUrl) {
            return sock.sendMessage(
                msg.from,
                {
                    image: { url: profileUrl },
                    caption: lines,
                    mentions: [rawJid]
                },
                { quoted: msg }
            );
        }

        return sock.sendMessage(
            msg.from,
            {
                text: lines,
                mentions: [rawJid]
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[USERINFO ERROR]:', error);
        return msg.reply(
            `🍥 Ocurrió un error al obtener la información del usuario.\n\n` +
            `📌 ${error?.message || String(error)}`
        );
    }
}
