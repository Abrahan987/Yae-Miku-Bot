import { db } from '#db';

export const command = ['clear'];
export const category = 'group';
export const description = 'Limpiar usuarios inactivos del grupo.';
export const admin = true;

export default async function (sock: any, msg: any, extra: any) {
    try {
        const participants = extra.participants || [];
        const textLower = extra.text?.toLowerCase() || '';
        const isViewMode = textLower.includes('view') || textLower.includes('views');
        
        if (!participants || participants.length === 0) {
            return msg.reply('ꕥ No se pudo obtener la lista de miembros del grupo.');
        }
        
        const stmt = db.prepare('SELECT userJid, message_count FROM message_stats WHERE groupJid = ?');
        const stats = stmt.all(msg.from) as any[];
        
        let inactiveCount = 0;
        let userList = '';
        
        participants.forEach((p: any) => {
            const userStat = stats.find((s: any) => s.userJid === p.id);
            if (!userStat || userStat.message_count === 0) {
                userList += `*${p.id.split('@')[0]}*\n`;
                inactiveCount++;
            }
        });
        
        let report = '';
        if (isViewMode) {
            report = `✰ *Usuarios Inactivos* (${inactiveCount})\n\n${userList || 'No hay inactivos'}`;
        } else {
            report = `ꕥ Usuarios inactivos encontrados: ${inactiveCount}\n\n${userList || 'No hay inactivos'}`;
        }
        
        await msg.reply(report);
    } catch (e: any) {
        return msg.reply(`Error: ${e.message}`);
    }
}