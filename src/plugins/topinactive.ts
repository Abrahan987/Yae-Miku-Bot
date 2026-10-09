import { db } from '#db';

export const command = ['topinactive', 'topinactivos', 'topinactiveusers'];
export const category = 'group';
export const description = 'Ver el top de usuarios más inactivos del grupo.';

export default async function (sock: any, msg: any, extra: any) {
    try {
        const stmt = db.prepare('SELECT userJid, message_count FROM message_stats WHERE groupJid = ? ORDER BY message_count ASC LIMIT 10');
        const inactiveUsers = stmt.all(msg.from) as any[];
        
        if (inactiveUsers.length === 0) {
            return msg.reply(`「✎」 No hay datos registrados.`);
        }
        
        let report = `❀ Top de usuarios inactivos ❀\n\n`;
        const mentions = [];
        
        inactiveUsers.forEach((u: any, i: number) => {
            const name = u.userJid.split('@')[0];
            report += `*${i + 1}.* @${name}\n`;
            report += `   » Mensajes: \`${u.message_count}\`\n`;
            mentions.push(u.userJid);
        });
        
        await sock.sendMessage(msg.from, { text: report }, { quoted: msg, mentions });
    } catch (e: any) {
        return msg.reply(`Error: ${e.message}`);
    }
}