export const command = ['link', 'enlace'];
export const category = 'admin';
export const description = 'Muestra el enlace de invitación del grupo.';
export const admin = false;
export const botAdmin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;

    try {
        const code = await sock.groupInviteCode(chatId);

        return sock.sendMessage(
            chatId,
            {
                text:
                    `🪷 *ENLACE DEL GRUPO*\n\n` +
                    `🍓 https://chat.whatsapp.com/${code}`
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[LINK ERROR]:', error);
        return msg.reply('⚠️ No pude obtener el enlace. Verifica que el bot sea administrador.');
    }
}
