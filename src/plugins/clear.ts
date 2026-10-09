import { db } from '#db';

export const command = ['clear', 'limpiar'];
export const category = 'group';
export const description = 'Limpia usuarios inactivos del grupo.';
export const admin = true;

export default async function (sock: any, msg: any, extra: any) {
    try {
        const participants = extra.participants || [];
        const stmt = db.prepare('SELECT userJid, message_count FROM message_stats WHERE groupJid = ?');
        const stats = stmt.all(msg.from) as any[];

        let inactive: string[] = [];
        participants.forEach((p: any) => {
            const stat = stats.find((s: any) => s.userJid === p.id);
            if (!stat || stat.message_count === 0) {
                inactive.push(p.id);
            }
        });

        let text = `*Usuarios Inactivos*\n\nTotal: ${inactive.length}\n\n`;
        inactive.forEach((jid: string) => {
            text += `@${jid.split('@')[0]}\n`;
        });

        await sock.sendMessage(msg.from, { text }, { quoted: msg });
    } catch (err: any) {
        return msg.reply(`Error: ${err?.message}`);
    }
}
