import { getUser } from '../lib/database.ts';

export const command = ['balance', 'bal', 'saldo', 'dinero'];
export const category = 'economia';
export const description = 'Ver tu saldo de yen.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    const sender = msg.sender;

    try {
        const target = msg.mentionedJid?.[0] || msg.quoted?.sender || sender;
        const user = getUser(target);
        const displayName = user.name || target.split('@')[0];

        return msg.reply(
            `🪷 𝙱𝙰𝙻𝙰𝙽𝙲𝙴 𝙳𝙴 𝚈𝙴𝙽\n\n` +
            `👤 𝚄𝚜𝚞𝚊𝚛𝚒𝚘: *${displayName}*\n` +
            `💰 𝚃𝚊𝚕𝚍𝚘: *¥${(user.yen || 0).toLocaleString()}*`
        );
    } catch (error: any) {
        console.error('[BALANCE ERROR]:', error);
        return msg.reply('⚠︎ 𝙾𝚌𝚞𝚛𝚛𝚒ó 𝚞𝚗 𝚎𝚛𝚛𝚘𝚛 𝚊𝚕 𝚟𝚎𝚛 𝚝𝚞 𝚜𝚊𝚕𝚍𝚘.');
    }
}
