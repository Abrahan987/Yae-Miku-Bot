import { getTopActive } from '#db';

export const command = ['topcount', 'topmensajes', 'topmsgcount', 'topmessages'];
export const category = 'group';
export const description = 'Ver el top de usuarios con más mensajes en el grupo.';

export default async function (sock: any, msg: any, extra: any) {
    try {
        const topUsers = getTopActive(msg.from, 10);
        
        if (topUsers.length === 0) {
            return msg.reply(`「✎」 No hay actividad registrada.`);
        }
        
        let report = `❀ Top de mensajes en el grupo\n\n`;
        
        topUsers.forEach((u: any, i: number) => {
            const name = u.jid.split('@')[0];
            report += `*${i + 1}.* @${name}\n`;
            report += `   » Mensajes: \`${u.message_count}\`\n`;
        });
        
        await msg.reply(report);
    } catch (e: any) {
        return msg.reply(`Error: ${e.message}`);
    }
}