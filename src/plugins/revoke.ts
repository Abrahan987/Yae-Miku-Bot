export const command = ['revoke', 'restablecer'];
export const category = 'admin';
export const description = 'Restablece el enlace de invitación del grupo.';
export const admin = true;
export const botAdmin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;

    try {
        await sock.groupRevokeInvite(chatId);
        const code = await sock.groupInviteCode(chatId);

        return sock.sendMessage(
            chatId,
            {
                text:
                    `✅ *ENLACE RESTABLECIDO*\n\n` +
                    `🍓 https://chat.whatsapp.com/${code}`
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[REVOKE ERROR]:', error);
        return msg.reply('⚠️ No pude restablecer el enlace. Verifica que el bot sea administrador.');
    }
}
