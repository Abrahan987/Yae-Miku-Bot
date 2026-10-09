export const command = ['setgpdesc', 'setdesc'];
export const category = 'admin';
export const description = 'Cambia la descripción del grupo.';
export const admin = true;
export const botAdmin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;
    const desc = (extra?.args || []).join(' ').trim();

    if (!desc) {
        return msg.reply(
            `🍓 Uso\n\n` +
            `> ${(global as any).prefix?.[0] || '.'}setgpdesc nueva descripción`
        );
    }

    try {
        await sock.groupUpdateDescription(chatId, desc);
        return sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
    } catch (error: any) {
        console.error('[SETGPDESC ERROR]:', error);
        return msg.reply('⚠️ No pude cambiar la descripción. Verifica que el bot sea administrador.');
    }
}
