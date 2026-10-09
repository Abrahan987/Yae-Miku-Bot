import { getTopActive } from '../lib/database.ts';

export const command = ['topcount', 'topmensajes', 'topmsgcount'];
export const category = 'admin';
export const description = 'Muestra el top de usuarios con más mensajes.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;

    try {
        const top = getTopActive(chatId, 10);

        if (!top.length) {
            return msg.reply('⚠️ Aún no hay actividad registrada en este grupo.');
        }

        let texto = `🪷 *TOP MENSAJES*\n\n`;
        top.forEach((u: any, i: number) => {
            texto += `🍓 ${i + 1}. @${u.jid.split('@')[0]} » ${u.message_count}\n`;
        });

        return sock.sendMessage(
            chatId,
            { text: texto, mentions: top.map((u: any) => u.jid) },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[TOPCOUNT ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al obtener el top.');
    }
}
