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
    'Vendes fotos stock y ganas',
    'Trabajas como community manager y ganas',
    'Diseñas logos y ganas',
    'Escribes artículos y ganas',
    'Editas videos y ganas',
    'Haces streaming y ganas'
];

function formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    
    const parts: string[] = [];
    if (hours) parts.push(`${hours}h`);
    if (mins) parts.push(`${mins}m`);
    if (secs || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
}

export default async function (sock: any, msg: any, extra: any) {
    const sender = msg.sender;

    try {
        const now = Date.now();
        const until = getCooldown(sender, 'work');

        if (now < until) {
            const timeLeft = formatTime(until - now);
            return msg.reply(
                `⏱️ *COOLDOWN ACTIVO*\n\n` +
                `🍥 Ya trabajaste hace poco.\n` +
                `⏳ Vuelve en: *${timeLeft}*\n\n` +
                `📌 Descansa un poco antes de volver a trabajar.`
            );
        }

        const user = getUser(sender);
        const reward = 3000 + Math.floor(Math.random() * 7000);
        const trabajo = trabajos[Math.floor(Math.random() * trabajos.length)];
        const newBalance = (user.yen || 0) + reward;

        updateUser(sender, { name: user.name, yen: newBalance, banned: user.banned });
        setCooldown(sender, 'work', now + 60 * 60 * 1000);

        return msg.reply(
            `✅ *TRABAJO COMPLETADO*\n\n` +
            `⭐ ${trabajo} *¥${reward.toLocaleString()}*\n\n` +
            `💰 Saldo actual: *¥${newBalance.toLocaleString()}*\n` +
            `⏳ Próximo trabajo en: *1 hora*`
        );
    } catch (error: any) {
        console.error('[WORK ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al trabajar.');
    }
}
