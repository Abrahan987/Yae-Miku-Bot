import { db } from '../lib/database.ts';

export const command = ['clear'];
export const category = 'admin';
export const description = 'Lista los usuarios sin mensajes registrados en el grupo.';
export const admin = true;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;

    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants: any[] = metadata?.participants || [];
        const rows = db
            .prepare('SELECT userJid, message_count FROM message_stats WHERE groupJid = ?')
            .all(chatId) as any[];

        const activos = new Set(rows.filter((r: any) => r.message_count > 0).map((r: any) => r.userJid));
        const inactivos = participants
            .filter((p: any) => !p.admin && !activos.has(p.id))
            .map((p: any) => p.id);

        if (!inactivos.length) {
            return msg.reply('✅ No hay usuarios inactivos en este grupo.');
        }

        let texto = `🪷 *USUARIOS INACTIVOS*\n\n🍥 Total: ${inactivos.length}\n\n`;
        inactivos.forEach((jid: string) => {
            texto += `> @${jid.split('@')[0]}\n`;
        });

        return sock.sendMessage(chatId, { text: texto, mentions: inactivos }, { quoted: msg });
    } catch (error: any) {
        console.error('[CLEAR ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al buscar inactivos.');
    }
}
