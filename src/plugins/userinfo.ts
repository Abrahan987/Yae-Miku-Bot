import { UserJid, decodeJid } from '#simple';

export const command = ['userinfo', 'info', 'datos'];
export const category = 'utils';
export const description = 'Muestra la información de WhatsApp de un usuario.';

const num = (x: any): string =>
    String(x || '').split('@')[0].split(':')[0].replace(/[^\d]/g, '');

export default async function (sock: any, msg: any, extra: any) {
    let target = (msg.mentionedJid || [])[0] || msg.quoted?.sender || msg.sender;

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
        const rawJid = String(target);
        const decodedJid = decodeJid(rawJid);
        const number = num(decodedJid);
        const isSelf = target === msg.sender;

        // Intenta obtener el perfil del usuario
        let profilePicUrl = '';
        let profileName = '';
        try {
            const profilePic = await sock.profilePictureUrl(rawJid, 'image');
            profilePicUrl = profilePic || '';
        } catch (e) {
            profilePicUrl = '(Sin foto de perfil)';
        }

        try {
            const profile = await sock.fetchStatus(rawJid);
            profileName = profile?.status || '(Sin estado)';
        } catch (e) {
            profileName = '(No disponible)';
        }

        // Construir la respuesta
        const info = [
            `${(global as any).namebot}`,
            '',
            `🔍 *INFORMACIÓN DEL USUARIO*`,
            '',
            `📱 *Número:* +${number}`,
            `🆔 *JID:* ${decodedJid}`,
            `🪪 *LID:* ${rawJid.includes(':') ? rawJid.split(':')[0] : '(No disponible)'}`,
            `👤 *Nombre:* ${msg.pushName || isSelf ? (global as any).namebot : '(Desconocido)'}`,
            `📝 *Estado:* ${profileName}`,
            `🤳 *Foto:* ${profilePicUrl === '(Sin foto de perfil)' ? profilePicUrl : '✅ Disponible'}`,
            `💬 *Es chat:* ${isSelf ? 'Tú mismo' : 'Otro usuario'}`,
            `🔐 *Verificado:* ${rawJid.includes('@s.whatsapp.net') ? '✅ Sí' : '⚠️ Posible bot/sistema'}`,
            '',
            `ꨄ︎ ${(global as any).nmcreador}`
        ];

        // Si hay foto de perfil, enviar con imagen
        if (profilePicUrl && profilePicUrl !== '(Sin foto de perfil)') {
            try {
                return sock.sendMessage(
                    msg.from,
                    {
                        image: { url: profilePicUrl },
                        caption: info.join('\n'),
                        mentions: [rawJid]
                    },
                    { quoted: msg }
                );
            } catch (e) {
                console.error('[USERINFO IMAGE]:', e);
            }
        }

        return sock.sendMessage(
            msg.from,
            {
                text: info.join('\n'),
                mentions: [rawJid]
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[USERINFO ERROR]:', error);
        return msg.reply(
            `🍥 Ocurrió un error al obtener la información.\n\n` +
            `📌 ${error?.message || String(error)}`
        );
    }
}
