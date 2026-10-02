
import { getTopActive } from '../lib/database.ts';

export const command = [
    'topactivos',
    'topmensajes',
    'topmiembros',
    'ranking'
];

export const category = 'info';

export const description =
    'Muestra los 30 usuarios más activos del grupo.';

export const admin = false;
export const botAdmin = false;

export default async function (
    sock: any,
    msg: any,
    extra: any
) {
    if (!msg.isGroup) {
        return msg.reply(
            '🍓 𝙴𝚂𝚃𝙴 𝙲𝙾𝙼𝙰𝙽𝙳𝙾 𝚂𝙾𝙻𝙾 𝙵𝚄𝙽𝙲𝙸𝙾𝙽𝙰 𝙴𝙽 𝙶𝚁𝚄𝙿𝙾𝚂.'
        );
    }

    const chatId =
        msg.from ||
        msg.chat ||
        extra?.chat;

    if (!chatId) {
        return msg.reply(
            '⚠︎ 𝙽𝙾 𝚂𝙴 𝙿𝚄𝙳𝙾 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙸𝙳 𝙳𝙴𝙻 𝙶𝚁𝚄𝙿𝙾.'
        );
    }

    try {
        const topUsers =
            getTopActive(
                chatId,
                30
            );

        if (
            !topUsers ||
            topUsers.length === 0
        ) {
            return msg.reply(
                '⚠︎ 𝙽𝙾 𝙷𝙰𝚈 𝙳𝙰𝚃𝙾𝚂 𝙳𝙴 𝙼𝙴𝙽𝚂𝙰𝙹𝙴𝚂 𝙴𝙽 𝙴𝚂𝚃𝙴 𝙶𝚁𝚄𝙿𝙾.'
            );
        }

        let rankingText =
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝚃𝙾𝙿 𝙼𝙸𝙴𝙼𝙱𝚁𝙾𝚂 𝙰𝚃𝙸𝚅𝙾𝚂\n` +
            `🪷 𝙼𝙰𝚇𝙸𝙼𝙾 30 𝙼𝙸𝙴𝙼𝙱𝚁𝙾𝚂\n\n`;

        topUsers.forEach(
            (
                user: any,
                index: number
            ) => {
                const position =
                    index + 1;

                let medal = '';

                if (
                    position === 1
                ) {
                    medal = '🥇';
                } else if (
                    position === 2
                ) {
                    medal = '🥈';
                } else if (
                    position === 3
                ) {
                    medal = '🥉';
                } else if (
                    position <= 10
                ) {
                    medal = '⭐';
                } else {
                    medal = '•';
                }

                const jid =
                    user.jid || '';

                const userNumber =
                    jid.split('@')[0];

                const messages =
                    Number(
                        user.message_count
                    ) || 0;

                rankingText +=
                    `${medal} #${position} • @${userNumber}\n` +
                    `   💬 ${messages} mensajes\n\n`;
            }
        );

        rankingText +=
            `ꨄ︎ ${global.nmcreador}`;

        return sock.sendMessage(
            chatId,
            {
                text: rankingText,
                mentions:
                    topUsers
                        .map(
                            (user: any) =>
                                user.jid
                        )
                        .filter(Boolean)
            },
            {
                quoted: msg
            }
        );

    } catch (error: any) {
        console.error(
            '[TOPACTIVOS ERROR]:',
            error
        );

        return msg.reply(
            '⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝚁𝙰𝙽𝙺𝙸𝙽𝙶.'
        );
    }
}
