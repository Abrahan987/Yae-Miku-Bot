import { getUser, updateUser } from '../lib/database.ts';

export const command = ['work', 'trabajar', 'w'];
export const category = 'economia';
export const description = 'Trabaja y gana yen.';
export const admin = false;
export const botAdmin = false;

const trabajos = [
    'Trabajas como diseñador gráfico y ganas',
    'Eres programador freelance y ganas',
    'Trabajas en una tienda y ganas',
    'Haces un video viral y ganas',
    'Vendes artesanías y ganas',
    'Eres fotógrafo profesional y ganas',
    'Trabajas como chef y ganas',
    'Eres traductor y ganas',
    'Haces tutoría online y ganas',
    'Vendes fotos stock y ganas'
];

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 𝙴𝚂𝚃𝙴 𝙲𝙾𝙼𝙰𝙽𝙳𝙾 𝚂𝙾𝙻𝙾 𝙵𝚄𝙽𝙲𝙸𝙾𝙽𝙰 𝙴𝙽 𝙶𝚁𝚄𝙿𝙾𝚂.');
    }

    const chatId = msg.from || msg.chat || extra?.chat;
    const sender = msg.sender;

    try {
        const user = getUser(sender);
        const now = Date.now();
        const workKey = `work_${chatId}_${sender}`;
        const lastWork = (global as any)[workKey] || 0;
        const cooldown = 60 * 60 * 1000; // 1 hora

        if (now < lastWork) {
            const timeLeft = Math.ceil((lastWork - now) / 1000 / 60);
            return msg.reply(
                `⚠︎ 𝚈𝙰 𝚃𝚁𝙰𝙱𝙰𝙹𝙰𝚂𝚃𝙴\n\n` +
                `🪷 𝙳𝚎𝚜𝚌𝚊𝚗𝚜𝚊 𝚞𝚗 𝚙𝚘𝚌𝚘 𝚎𝚗 ${timeLeft} 𝚖𝚒𝚗𝚞𝚝𝚘𝚜`
            );
        }

        const reward = 3000 + Math.floor(Math.random() * 7000);
        const trabajo = trabajos[Math.floor(Math.random() * trabajos.length)];
        const newBalance = (user.yen || 0) + reward;

        updateUser(sender, {
            name: user.name,
            yen: newBalance,
            banned: user.banned
        });

        (global as any)[workKey] = now + cooldown;

        return msg.reply(
            `❀ ${trabajo} *¥${reward.toLocaleString()}*\n\n` +
            `💰 𝚃𝚊𝚕𝚍𝚘: *¥${newBalance.toLocaleString()}*`
        );
    } catch (error: any) {
        console.error('[WORK ERROR]:', error);
        return msg.reply('⚠︎ 𝙾𝚌𝚞𝚛𝚛𝚒ó 𝚞𝚗 𝚎𝚛𝚛𝚘𝚛 𝚊𝚕 𝚝𝚛𝚊𝚋𝚊𝚓𝚊𝚛.');
    }
}
