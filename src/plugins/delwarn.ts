import { getWarnings, removeWarning, resetWarnings } from '../lib/database.ts';

export const command = ['delwarn'];
export const category = 'admin';
export const description = 'Elimina una advertencia de un usuario.';
export const admin = true;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;
    const targetJid = (msg.mentionedJid || [])[0] || msg.quoted?.sender;

    if (!targetJid) {
        return msg.reply(
            `🍓 Uso\n\n` +
            `> ${(global as any).prefix?.[0] || '.'}delwarn @usuario\n` +
            `> ${(global as any).prefix?.[0] || '.'}delwarn @usuario all`
        );
    }

    try {
        if (getWarnings(chatId, targetJid) === 0) {
            return msg.reply('⚠️ Este usuario no tiene advertencias.');
        }

        const todas = ((extra?.args || []).join(' ') || '').toLowerCase().includes('all');
        const restantes = todas ? resetWarnings(chatId, targetJid) : removeWarning(chatId, targetJid);

        return sock.sendMessage(
            chatId,
            {
                text:
                    `✅ *ADVERTENCIA ELIMINADA*\n\n` +
                    `🪷 @${targetJid.split('@')[0]}\n` +
                    `📌 Tiene ${restantes}/3 advertencias.`,
                mentions: [targetJid]
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[DELWARN ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al eliminar la advertencia.');
    }
}
