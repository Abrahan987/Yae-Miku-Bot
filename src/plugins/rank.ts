import { db } from '../lib/database.ts';

export const command = ['rank', 'ranking'];
export const category = 'economia';
export const description = 'Ver ranking de los más ricos del grupo.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    const groupJid = msg.from;
    const args = extra.args;

    try {
        if (!msg.isGroup) {
            return msg.reply('❌ Este comando solo funciona en grupos.');
        }

        const limit = parseInt(args[0], 10) || 10;
        const safeLimnt = Math.max(1, Math.min(limit, 50));

        const stmt = db.prepare(`
            SELECT 
                jid,
                name,
                yen
            FROM users
            ORDER BY yen DESC
            LIMIT ?
        `);

        const topUsers = stmt.all(safeLimnt) as any[];

        if (!topUsers || topUsers.length === 0) {
            return msg.reply('❌ No hay datos disponibles en el ranking.');
        }

        let response = `💰 *RANKING DE RICOS* 💰\n\n`;
        response += `🏆 Top ${topUsers.length} Usuarios\n`;
        response += `${`─`.repeat(30)}\n\n`;

        topUsers.forEach((user, index) => {
            const medal = 
                index === 0 ? '🥇' : 
                index === 1 ? '🥈' : 
                index === 2 ? '🥉' : 
                `${index + 1}️⃣`;

            const userNumber = user.jid.split('@')[0];
            const displayName = user.name || `Usuario ${userNumber}`;
            const balance = user.yen || 0;

            response += `${medal} *${index + 1}. ${displayName}*\n`;
            response += `   💰 ¥${balance.toLocaleString()}\n\n`;
        });

        response += `${`─`.repeat(30)}\n`;
        response += `\n📊 ¡Acumula más yen para escalar en el ranking!`;

        return msg.reply(response);
    } catch (error: any) {
        console.error('[RANK ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al obtener el ranking.');
    }
}
