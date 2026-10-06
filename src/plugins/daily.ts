import { getUser, updateUser } from '../lib/database.ts';

export const command = ['daily', 'diario'];
export const category = 'economia';
export const description = 'Reclama tu recompensa diaria de yen.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 𝙴𝚂𝚃𝙴 𝙲𝙾𝙼𝙰𝙽𝙳𝙾 𝚂𝙾𝙻𝙾 𝙵𝚄𝙽𝙲𝙸𝙾𝙽𝙰 𝙴𝙽 𝙶𝚁𝚄𝙿𝙾𝚂.');
    }

    const chatId = msg.from || msg.chat || extra?.chat;
    const sender = msg.sender;

    try {
        const user = getUser(sender);
        const now = Date.now();
        const dailyKey = `daily_${chatId}_${sender}`;
        const lastDaily = (global as any)[dailyKey] || 0;
        const cooldown = 24 * 60 * 60 * 1000; // 24 horas

        if (now < lastDaily) {
            const timeLeft = Math.ceil((lastDaily - now) / 1000 / 60);
            return msg.reply(
                `⚠︎ 𝚈𝙰 𝚁𝙴𝙲𝙻𝙰𝙼𝙰𝚂𝚃𝙴 𝚃𝚄 𝙳𝙸𝙰𝚁𝙸𝙾\n\n` +
                `🪷 𝚅𝚞𝚎𝚕𝚟𝚎 𝚎𝚗 ${timeLeft} 𝚖𝚒𝚗𝚞𝚝𝚘𝚜`
            );
        }

        const reward = 5000 + Math.floor(Math.random() * 10000);
        const newBalance = (user.yen || 0) + reward;

        updateUser(sender, {
            name: user.name,
            yen: newBalance,
            banned: user.banned
        });

        (global as any)[dailyKey] = now + cooldown;

        return msg.reply(
            `✅ 𝚁𝙴𝙲𝙾𝙼𝙿𝙴𝙽𝚂𝙰 𝙳𝙸𝙰𝚁𝙸𝙰\n\n` +
            `🪷 𝚐𝚊𝚗𝚊𝚜𝚝𝚎 *¥${reward.toLocaleString()}*\n` +
            `💰 𝚃𝚊𝚕𝚍𝚘: *¥${newBalance.toLocaleString()}*`
        );
    } catch (error: any) {
        console.error('[DAILY ERROR]:', error);
        return msg.reply('⚠︎ 𝙾𝚌𝚞𝚛𝚛𝚒ó 𝚞𝚗 𝚎𝚛𝚛𝚘𝚛 𝚊𝚕 𝚛𝚎𝚌𝚕𝚊𝚖𝚊𝚛 𝚝𝚞 𝚏𝚞𝚎𝚛𝚣𝚊.');
    }
}
