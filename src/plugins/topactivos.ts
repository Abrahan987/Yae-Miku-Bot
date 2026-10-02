
import { getTopActive } from '../lib/database.ts';

export const command = ['topactivos', 'topmensajes', 'topmiembros', 'ranking'];
export const category = 'info';
export const description = 'Muestra los 30 usuarios más activos del grupo.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 𝙴𝚂𝚝𝚎 𝚌𝚘𝚖𝚊𝚗𝚍𝚘 𝚜𝚘𝚕𝚘 𝚏𝚞𝚗𝚌𝚒𝚘𝚗𝚊 𝚎𝚗 𝚐𝚛𝚞𝚙𝚘𝚜.');
    }

    const chatId = msg.from || msg.chat || extra?.chat;

    if (!chatId) {
        return msg.reply('⚠︎ 𝙽𝚘 𝚜𝚎 𝚙𝚞𝚍𝚘 𝚘𝚋𝚝𝚎𝚗𝚎𝚛 𝚎𝚕 𝙸𝙳 𝚍𝚎𝚕 𝚐𝚛𝚞𝚙𝚘.');
    }

    try {
        await msg.react('⏳');

        const topUsers = getTopActive(chatId, 30);

        if (!topUsers || topUsers.length === 0) {
            await msg.react('❌');

            return msg.reply(
                '⚠︎ 𝙽𝚘 𝚑𝚊𝚢 𝚍𝚊𝚝𝚘𝚜 𝚍𝚎 𝚖𝚎𝚗𝚜𝚊𝚓𝚎𝚜 𝚎𝚗 𝚎𝚜𝚝𝚎 𝚐𝚛𝚞𝚙𝚘.'
            );
        }

        let rankingText =
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝚃𝙾𝙿 𝙼𝙸𝙴𝙼𝙱𝚁𝙾𝚂 𝙰𝚃𝙸𝚅𝙾𝚂\n` +
            `🪷 𝙼𝚊𝚡𝚒𝚖𝚘 30 𝚖𝚒𝚎𝚖𝚋𝚛𝚘𝚜\n\n`;

        topUsers.forEach((user: any, index: number) => {
            const position = index + 1;

            let medal: string;

            if (position === 1) {
                medal = '🥇';
            } else if (position === 2) {
                medal = '🥈';
            } else if (position === 3) {
                medal = '🥉';
            } else if (position <= 10) {
                medal = '⭐';
            } else {
                medal = '•';
            }

            const jid = user.jid || '';
            const userNumber = jid.split('@')[0];
            const messages = Number(user.message_count) || 0;

            rankingText +=
                `${medal} #${position} • @${userNumber}\n` +
                `   💬 ${messages} mensajes\n\n`;
        });

        rankingText += `ꨄ︎ ${global.nmcreador}`;

        await msg.react('✅');

        return sock.sendMessage(
            chatId,
            {
                text: rankingText,
                mentions: topUsers
                    .map((user: any) => user.jid)
                    .filter(Boolean)
            },
            {
                quoted: msg
            }
        );
    } catch (error: any) {
        console.error('[TOPACTIVOS ERROR]:', error);

        try {
            await msg.react('❌');
        } catch {}

        return msg.reply(
            '⚠︎ 𝙾𝚌𝚞𝚛𝚛𝚒ó 𝚞𝚗 𝚎𝚛𝚛𝚘𝚛 𝚊𝚕 𝚘𝚋𝚝𝚎𝚗𝚎𝚛 𝚎𝚕 𝚛𝚊𝚗𝚔𝚒𝚗𝚐.'
        );
    }
}

