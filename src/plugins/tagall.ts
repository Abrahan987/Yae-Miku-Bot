export const command = ['tagall', 'todos', 'invocar'];
export const category = 'admin';
export const description = 'Menciona a todos los miembros del grupo.';
export const admin = true;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;

    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants: any[] = metadata?.participants || [];
        const jids = participants.map((p: any) => p.id).filter(Boolean);
        const pesan = (extra?.args || []).join(' ').trim() || 'Revivan 🪷';

        let texto = `🪷 *INVOCACIÓN GENERAL*\n\n` +
            `🍓 ${pesan}\n\n` +
            `🍥 Miembros: ${jids.length}\n\n`;

        for (const jid of jids) {
            texto += `> @${jid.split('@')[0]}\n`;
        }

        return sock.sendMessage(chatId, { text: texto, mentions: jids }, { quoted: msg });
    } catch (error: any) {
        console.error('[TAGALL ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al mencionar a todos.');
    }
}
