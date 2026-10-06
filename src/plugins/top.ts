/*import { getTopActive } from '../lib/database.ts';

export const command = ['top'];
export const category = 'info';
export const description = 'Muestra los 10 usuarios más activos según el mensaje que envíes.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 𝙴𝚂𝚝𝚎 𝚌𝚘𝚖𝚊𝚗𝚍𝚘 𝚜𝚘𝚕𝚘 𝚏𝚞𝚗𝚌𝚒𝚘𝚗𝚊 𝚎𝚗 𝚐𝚛𝚞𝚙𝚘𝚜.');
    }

    const chatId = msg.from || msg.chat || extra?.chat;
    const text = (extra?.text || '').trim();

    if (!text) {
        return msg.reply(
            `🍓 𝚄𝚜𝚘: .𝚝𝚘𝚙 + 𝚝𝚎𝚡𝚝𝚘\n\n` +
            `𝙰𝙷𝙾𝚁𝙰 𝙿𝚘𝚍𝚛𝚊́𝚜 𝚞𝚜𝚊𝚛\n` +
            `• .𝚝𝚘𝚙 𝚟𝚎𝚛𝚐𝚊\n` +
            `• .𝚝𝚘𝚙 𝚛𝚎𝚞𝚗𝚒𝚘𝚗\n` +
            `• .𝚝𝚘𝚙 𝚋𝚞𝚎𝚗𝚞𝚜 𝚊𝚖𝚘𝚛 𝚕𝚎𝚖𝚊\n` +
            `• .𝚝𝚘𝚙 𝙿𝚕𝚊𝚝𝚒𝚌𝚊`
        );
    }

    try {
        const topUsers = getTopActive(chatId, 10);

        if (!topUsers.length) {
            return msg.reply('⚠︎ 𝙽𝚘 𝚑𝚊𝚢 𝚍𝚊𝚝𝚘𝚜 𝚍𝚎 𝚖𝚎𝚗𝚜𝚊𝚓𝚎𝚜.');
        }

        let messageText = `🍓͜ᩧ𑂳ᰍ  𝚃𝙾𝙿 10 - ${text.toUpperCase()}\n\n`;

        topUsers.forEach((user: any, index: number) => {
            const position = index + 1;
            let medal = '•';

            if (position === 1) medal = '🥇';
            else if (position === 2) medal = '🥈';
            else if (position === 3) medal = '🥉';
            else if (position <= 10) medal = '⭐';

            const jid = user.jid || '';
            messageText += `${medal} #${position} • @${jid.split('@')[0]}\n`;
        });

        return sock.sendMessage(
            chatId,
            {
                text: messageText,
                mentions: topUsers.map((u: any) => u.jid).filter(Boolean)
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[TOP ERROR]:', error);
        return msg.reply('⚠︎ 𝙾𝚌𝚞𝚛𝚛𝚒ó 𝚞𝚗 𝚎𝚛𝚛𝚘𝚛.');
    }
}
*/
