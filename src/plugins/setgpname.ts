export const command = ['setgpname', 'setname'];
export const category = 'admin';
export const description = 'Cambia el nombre del grupo.';
export const admin = true;
export const botAdmin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;
    const nombre = (extra?.args || []).join(' ').trim();

    if (!nombre) {
        return msg.reply(
            `🍓 Uso\n\n` +
            `> ${(global as any).prefix?.[0] || '.'}setgpname nuevo nombre`
        );
    }

    try {
        await sock.groupUpdateSubject(chatId, nombre);
        return sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
    } catch (error: any) {
        console.error('[SETGPNAME ERROR]:', error);
        return msg.reply('⚠️ No pude cambiar el nombre. Verifica que el bot sea administrador.');
    }
}
