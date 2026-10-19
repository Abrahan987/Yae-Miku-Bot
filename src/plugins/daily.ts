import { getUser, updateUser, getCooldown, setCooldown } from '../lib/database.ts';

export const command = ['daily', 'diario'];
export const category = 'economia';
export const description = 'Reclama tu recompensa diaria de yen.';
export const admin = false;
export const botAdmin = false;

function formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    
    const parts: string[] = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (mins) parts.push(`${mins}m`);
    if (secs || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
}

export default async function (sock: any, msg: any, extra: any) {
    const sender = msg.sender;

    try {
        const now = Date.now();
        const until = getCooldown(sender, 'daily');

        if (now < until) {
            const timeLeft = formatTime(until - now);
            return msg.reply(
                `⏱️ *COOLDOWN ACTIVO*\n\n` +
                `🪷 Ya reclamaste tu daily.\n` +
                `⏳ Vuelve en: *${timeLeft}*\n\n` +
                `📌 No intentes de nuevo, espera el tiempo indicado.`
            );
        }

        const user = getUser(sender);
        const reward = 5000 + Math.floor(Math.random() * 10000);
        const newBalance = (user.yen || 0) + reward;

        updateUser(sender, { name: user.name, yen: newBalance, banned: user.banned });
        setCooldown(sender, 'daily', now + 24 * 60 * 60 * 1000);

        return msg.reply(
            `✅ *RECOMPENSA DIARIA*\n\n` +
            `🪷 ¡Ganaste tu recompensa!\n` +
            `💰 Dinero: *+¥${reward.toLocaleString()}*\n` +
            `🏦 Saldo total: *¥${newBalance.toLocaleString()}*\n\n` +
            `⏳ Próximo daily en: *24 horas*`
        );
    } catch (error: any) {
        console.error('[DAILY ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al reclamar tu daily.');
    }
}
