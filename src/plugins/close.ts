export const command = ['close', 'cerrar'];
export const category = 'admin';
export const description = 'Cierra el grupo para que solo los administradores puedan enviar mensajes.';
export const admin = true;
export const botAdmin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('Necesitas estar en un grupo para usar este comando.');
    }

    const chatId = msg.from || msg.chat || extra?.chat;
    const botJid = sock.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : '';

    try {
        await sock.groupMetadata(chatId).catch(() => null);
        await sock.groupSettingUpdate(chatId, 'announcement');
        await msg.reply('Grupo cerrado. Ahora solo los administradores pueden enviar mensajes.');
    } catch (error: any) {
        console.error('[CLOSE ERROR]:', error);
        
        if (error?.output?.statusCode === 401 || error?.output?.statusCode === 500 || error?.data === 401) {
            const botNum = botJid ? botJid.split('@')[0] : '';
            const replyText = `✧ @${botNum} debe ser administrador del grupo para poder cerrarlo.`;

            return sock.sendMessage(chatId, {
                text: replyText,
                mentions: botJid ? [botJid] : []
            }, { quoted: msg });
        }

        await msg.reply('Ocurrió un error al intentar cerrar el grupo.');
    }
}
