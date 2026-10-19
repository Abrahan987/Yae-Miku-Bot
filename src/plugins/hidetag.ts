export const command = ['hidetag', 'tag', 'notify'];
export const category = 'admin';
export const description = 'Envia un mensaje mencionando a todos sin mostrar la lista.';
export const admin = true;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;

    try {
        const metadata = await sock.groupMetadata(chatId);
        const mentions = (metadata?.participants || []).map((p: any) => p.id).filter(Boolean);

        const texto = (extra?.args || []).join(' ').trim() || (msg.quoted?.body || '').trim();

        if (!texto) {
            return msg.reply(
                `🍓 Uso\n\n` +
                `> ${(global as any).prefix?.[0] || '.'}tag mensaje\n` +
                `> O responde a un mensaje con ${(global as any).prefix?.[0] || '.'}tag`
            );
        }

        return sock.sendMessage(chatId, { text: texto, mentions });
    } catch (error: any) {
        console.error('[TAG ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al enviar el mensaje.');
    }
}
