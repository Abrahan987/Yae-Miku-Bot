export const command = ['pfp', 'getpic'];
export const category = 'utils';
export const description = 'Ver la foto de perfil de un usuario.';

export default async function (sock: any, msg: any) {
    const who = msg.mentionedJid?.[0] || msg.quoted?.sender || null;

    if (!who) {
        return msg.reply('🪷 *FOTO DE PERFIL*\n\n🍓 Menciona o responde al usuario del que quieras ver su foto.');
    }

    try {
        const img = await sock.profilePictureUrl(who, 'image').catch(() => null);
        if (!img) {
            return sock.sendMessage(
                msg.from,
                { text: `🍥 No se pudo obtener la foto de perfil de @${who.split('@')[0]}.`, mentions: [who] },
                { quoted: msg }
            );
        }
        return sock.sendMessage(msg.from, { image: { url: img }, caption: '🪷 *FOTO DE PERFIL*' }, { quoted: msg });
    } catch (e: any) {
        console.error('[GETPIC]', e);
        return msg.reply(`🍥 Ocurrió un error al obtener la foto.\n🪷 ${e?.message || String(e)}`);
    }
}
