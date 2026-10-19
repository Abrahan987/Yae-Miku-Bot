export const command = ['close', 'cerrar'];
export const category = 'admin';
export const description = 'Cierra el grupo para que solo los administradores puedan enviar mensajes.';
export const admin = true;
export const botAdmin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) return;

    const chatId = msg.from || msg.chat || extra?.chat;

    try {
        const metadata = await sock.groupMetadata(chatId);

        if (metadata?.announce) {
            return msg.reply('✧ El grupo ya estaba *cerrado.*');
        }

        await sock.groupSettingUpdate(chatId, 'announcement');
        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
        return;
    } catch (error: any) {
        console.error('[CLOSE ERROR]:', error);

        if (error?.output?.statusCode === 401 || error?.output?.statusCode === 500 || error?.data === 401) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });

            const rawBotJid = sock.user?.id || '';
            const botNum = rawBotJid.split(':')[0].split('@')[0];
            const botJid = `${botNum}@s.whatsapp.net`;

            return sock.sendMessage(chatId, {
                text: `✧ @${botNum} debe ser administrador del grupo para poder cerrarlo.`,
                mentions: [botJid]
            }, { quoted: msg });
        }
        return;
    }
}
