import { getUser, updateUser, getCooldown, setCooldown } from '../lib/database.ts';

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
    'Das tutorías online y ganas',
    'Vendes fotos stock y ganas'
];

export default async function (sock: any, msg: any, extra: any) {
    const sender = msg.sender;

    try {
        const now = Date.now();
        const until = getCooldown(sender, 'work');

        if (now < until) {
            const timeLeft = Math.ceil((until - now) / 1000 / 60);
            return msg.reply(
                `⚠︎ Ya trabajaste.\n\n🪷 Descansa *${timeLeft} minutos*`
            );
        }

        const user = getUser(sender);
        const reward = 3000 + Math.floor(Math.random() * 7000);
        const trabajo = trabajos[Math.floor(Math.random() * trabajos.length)];
        const newBalance = (user.yen || 0) + reward;

        updateUser(sender, { name: user.name, yen: newBalance, banned: user.banned });
        setCooldown(sender, 'work', now + 60 * 60 * 1000);

        return msg.reply(
            `❀ ${trabajo} *¥${reward.toLocaleString()}*\n\n💰 Saldo: *¥${newBalance.toLocaleString()}*`
        );
    } catch (error: any) {
        console.error('[WORK ERROR]:', error);
        return msg.reply('⚠︎ Ocurrió un error al trabajar.');
    }
}
