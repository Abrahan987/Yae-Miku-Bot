import { getUser, updateUser } from '../lib/database.ts';

export const command = ['steal', 'robar', 'rob'];
export const category = 'economia';
export const description = 'Intenta robar yen a otro usuario.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 𝙴𝚂𝚃𝙴 𝙲𝙾𝙼𝙰𝙽𝙳𝙾 𝚂𝙾𝙻𝙾 𝙵𝚄𝙽𝙲𝙸𝙾𝙽𝙰 𝙴𝙽 𝙶𝚁𝚄𝙿𝙾𝚂.');
    }

    const chatId = msg.from || msg.chat || extra?.chat;
    const sender = msg.sender;

    try {
        const target = msg.mentionedJid?.[0] || msg.quoted?.sender;

        if (!target) {
            return msg.reply(
                `🍓 𝚄𝚜𝚘\n\n` +
                `> ${global.prefix[0]}steal @usuario\n` +
                `> 𝚜𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚍𝚎 𝚊 𝚞𝚗 𝚖𝚎𝚗𝚜𝚊𝚓𝚎`
            );
        }

        if (sender === target) {
            return msg.reply('⚠︎ 𝙽𝙾 𝙿𝚄𝙴𝙳𝙴𝚂 𝚁𝙾𝙱𝙰𝚁𝚃𝙴 𝙰 𝚃𝙸 𝙼𝙸𝚂𝙼𝙾.');
        }

        const sender_user = getUser(sender);
        const target_user = getUser(target);

        if ((target_user.yen || 0) < 1000) {
            return msg.reply('⚠︎ 𝙴𝚕 𝚞𝚜𝚞𝚊𝚛𝚒𝚘 𝚝𝚒𝚎𝚗𝚎 𝚖𝚞𝚢 𝚙𝚘𝚌𝚘 𝚍𝚒𝚗𝚎𝚛𝚘.');
        }

        const chance = Math.random();
        const targetNumber = target.split('@')[0];

        if (chance < 0.5) {
            const stolen = Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000;
            const newTargetBalance = Math.max(0, (target_user.yen || 0) - stolen);
            const newSenderBalance = (sender_user.yen || 0) + stolen;

            updateUser(target, {
                name: target_user.name,
                yen: newTargetBalance,
                banned: target_user.banned
            });

            updateUser(sender, {
                name: sender_user.name,
                yen: newSenderBalance,
                banned: sender_user.banned
            });

            return msg.reply(
                `✅ 𝚁𝙾𝙱𝙾 𝙴𝚡𝙸𝚃𝙾𝚂𝙾\n\n` +
                `🪷 𝙻𝚎 𝚛𝚘𝚋𝚊𝚛𝚘𝚗 *¥${stolen.toLocaleString()}* 𝚊 @${targetNumber}\n` +
                `💰 𝚃𝚞 𝚗𝚞𝚎𝚟𝚘 𝚝𝚊𝚕𝚍𝚘: *¥${newSenderBalance.toLocaleString()}*`
            );
        } else {
            const loss = Math.floor(Math.random() * (2000 - 500 + 1)) + 500;
            const newSenderBalance = Math.max(0, (sender_user.yen || 0) - loss);

            updateUser(sender, {
                name: sender_user.name,
                yen: newSenderBalance,
                banned: sender_user.banned
            });

            return msg.reply(
                `⚠︎ 𝙴𝚕 𝚛𝚘𝚋𝚘 𝚏𝚛𝚊𝚌𝚊𝚜ó\n\n` +
                `🪷 𝙿𝚎𝚛𝚍𝚒𝚜𝚝𝚎 *¥${loss.toLocaleString()}* 𝚎𝚗 𝚎𝚕 𝚒𝚗𝚝𝚎𝚗𝚝𝚘\n` +
                `💰 𝚃𝚞 𝚗𝚞𝚎𝚟𝚘 𝚝𝚊𝚕𝚍𝚘: *¥${newSenderBalance.toLocaleString()}*`
            );
        }
    } catch (error: any) {
        console.error('[STEAL ERROR]:', error);
        return msg.reply('⚠︎ 𝙾𝚌𝚞𝚛𝚛𝚒ó 𝚞𝚗 𝚎𝚛𝚛𝚘𝚛 𝚊𝚕 𝚛𝚘𝚋𝚊𝚛.');
    }
}
