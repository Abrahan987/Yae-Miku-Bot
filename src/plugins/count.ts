import { db } from '#db';

export const command = ['count', 'mensajes', 'messages', 'msgcount'];
export const category = 'group';
export const description = 'Obtener el conteo de mensajes de un usuario.';

export default async function (sock: any, msg: any, extra: any) {
    const who = msg.mentionedJid?.[0] || msg.quoted?.sender || msg.sender;
    
    try {
        const stmt = db.prepare('SELECT message_count FROM message_stats WHERE groupJid = ? AND userJid = ?');
        const result = stmt.get(msg.from, who) as any;
        const count = result?.message_count || 0;
        
        let report = `❀ Contador de mensajes de @${who.split('@')[0]}\n`;
        report += `> Total en este grupo: \`${count}\` mensajes\n`;
        
        await sock.sendMessage(msg.from, { text: report }, { quoted: msg, mentions: [who] });
    } catch (e: any) {
        return msg.reply(`Error: ${e.message}`);
    }
}