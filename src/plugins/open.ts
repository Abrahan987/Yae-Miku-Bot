export const command = ['open', 'abrir'];
export const category = 'admin';
export const description = 'Abre el grupo para que todos los participantes puedan enviar mensajes.';
export const admin = true;
export const botAdmin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) return;

    const chatId = msg.from || msg.chat || extra?.chat;

    try {
        const metadata = extra?.groupMetadata || await sock.groupMetadata(chatId).catch(() => null);

        if (metadata && !metadata.announce) {
            return msg.reply('✧ El grupo ya estaba *abierto.*');
        }

        await sock.groupSettingUpdate(chatId, 'not_announcement');
        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
        return;
    } catch (error: any) {
        console.error('[OPEN ERROR]:', error);

        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });

        if (error?.output?.statusCode === 401 || error?.output?.statusCode === 500 || error?.data === 401) {
            const rawBotJid = sock.user?.id || '';
            const botNum = rawBotJid.split(':')[0].split('@')[0];
            const botJid = `${botNum}@s.whatsapp.net`;

            return sock.sendMessage(chatId, {
                text: `✧ @${botNum} debe ser administrador del grupo para poder abrirlo.`,
                mentions: [botJid]
            }, { quoted: msg });
        }
        return;
    }
}
