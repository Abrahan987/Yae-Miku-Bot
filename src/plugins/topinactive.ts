import { db } from '../lib/database.ts';

export const command = ['topinactive', 'topinactivos'];
export const category = 'admin';
export const description = 'Muestra el top de usuarios con menos mensajes.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;

    try {
        const rows = db
            .prepare('SELECT userJid, message_count FROM message_stats WHERE groupJid = ? ORDER BY message_count ASC LIMIT 10')
            .all(chatId) as any[];

        if (!rows.length) {
            return msg.reply('⚠️ Aún no hay actividad registrada en este grupo.');
        }

        let texto = `🪷 *TOP INACTIVOS*\n\n`;
        rows.forEach((u: any, i: number) => {
            texto += `🍓 ${i + 1}. @${u.userJid.split('@')[0]} » ${u.message_count}\n`;
        });

        return sock.sendMessage(
            chatId,
            { text: texto, mentions: rows.map((u: any) => u.userJid) },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[TOPINACTIVE ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al obtener el top.');
    }
}
