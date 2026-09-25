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

    try {
        await sock.groupSettingUpdate(chatId, 'announcement');
        await msg.reply('Grupo cerrado. Ahora solo los administradores pueden enviar mensajes.');
    } catch (error) {
        console.error('[CLOSE ERROR]:', error);
        await msg.reply('Ocurrió un error al intentar cerrar el grupo.');
    }
}
