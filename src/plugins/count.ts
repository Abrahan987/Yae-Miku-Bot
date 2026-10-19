import { db } from '../lib/database.ts';

export const command = ['count', 'mensajes', 'msgcount'];
export const category = 'admin';
export const description = 'Muestra cuántos mensajes ha enviado un usuario.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;
    const who = (msg.mentionedJid || [])[0] || msg.quoted?.sender || msg.sender;

    try {
        const row = db
            .prepare('SELECT message_count FROM message_stats WHERE groupJid = ? AND userJid = ?')
            .get(chatId, who) as any;

        return sock.sendMessage(
            chatId,
            {
                text:
                    `🪷 *CONTADOR DE MENSAJES*\n\n` +
                    `🍓 @${who.split('@')[0]}\n` +
                    `📌 Total: ${row?.message_count || 0} mensajes`,
                mentions: [who]
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[COUNT ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al obtener los mensajes.');
    }
}
