import { getTopActive } from '../lib/database.ts';

export const command = ['top'];
export const category = 'info';
export const description = 'Muestra el top 10 de usuarios más activos por mensajes.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🪷 𝙴𝚂𝚝𝚎 𝚌𝚘𝚖𝚊𝚗𝚍𝚘 𝚜𝚘𝚕𝚘 𝚏𝚞𝚗𝚌𝚒𝚘𝚗𝚊 𝚎𝚗 𝚐𝚛𝚞𝚙𝚘𝚜.');
    }

    const chatId = msg.from || msg.chat || extra?.chat;

    try {
        const topUsers = getTopActive(chatId, 10);

        if (!topUsers.length) {
            return msg.reply('⚠︎ 𝙽𝚘 𝚑𝚊𝚢 𝚍𝚊𝚝𝚘𝚜 𝚍𝚎 𝚖𝚎𝚗𝚜𝚊𝚓𝚎𝚜.');
        }

        let messageText = `🪷 𝚃𝙾𝙿 10 𝙼Á𝚂 𝙰𝙲𝚃𝙸𝚅𝙾𝚂\n\n`;

        topUsers.forEach((user: any, index: number) => {
            const position = index + 1;
            let medal = '•';

            if (position === 1) medal = '🥇';
            else if (position === 2) medal = '🥈';
            else if (position === 3) medal = '🥉';
            else if (position <= 10) medal = '⭐';

            const jid = user.jid || '';
            messageText += `${medal} #${position} • @${jid.split('@')[0]} • ${user.message_count} 𝚖𝚎𝚗𝚜𝚊𝚓𝚎𝚜\n`;
        });

        messageText += `\n✅ 𝚃𝚘𝚝𝚊𝚕: ${topUsers.length} 𝚞𝚜𝚞𝚊𝚛𝚒𝚘𝚜`;

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
