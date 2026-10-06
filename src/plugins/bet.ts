import { getUser, updateUser, getCooldown, setCooldown } from '../lib/database.ts';

export const command = ['bet', 'apostar'];
export const category = 'economia';
export const description = 'Apostar dinero.';
export const admin = false;
export const botAdmin = false;

function formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    
    const parts: string[] = [];
    if (mins) parts.push(`${mins}m`);
    if (secs || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
}

export default async function (sock: any, msg: any, extra: any) {
    const sender = msg.sender;
    const args = extra.args;

    try {
        if (!args.length || args[0].toLowerCase() === 'help') {
            return msg.reply(
                `🎰 *APUESTA*\n\n` +
                `📌 Uso: *.bet <cantidad>*\n\n` +
                `Ejemplos:\n` +
                `• *.bet 5000* → Apuesta 5000 yen\n` +
                `• *.bet all* → Apuesta todo tu dinero\n\n` +
                `🎲 50% de probabilidad de ganar el doble.\n` +
                `⏱️ Cooldown: *30 minutos*`
            );
        }

        const now = Date.now();
        const until = getCooldown(sender, 'bet');

        if (now < until) {
            const timeLeft = formatTime(until - now);
            return msg.reply(
                `⏱️ *COOLDOWN ACTIVO*\n\n` +
                `🎰 Ya apostaste hace poco.\n` +
                `⏳ Vuelve en: *${timeLeft}*`
            );
        }

        const user = getUser(sender);
        const currentBalance = user.yen || 0;
        let betAmount = 0;

        if (args[0].toLowerCase() === 'all') {
            betAmount = currentBalance;
        } else {
            betAmount = parseInt(args[0], 10);
        }

        if (isNaN(betAmount) || betAmount <= 0) {
            return msg.reply('❌ Cantidad inválida. Usa un número válido o "all".');
        }

        if (betAmount > currentBalance) {
            return msg.reply(
                `❌ *DINERO INSUFICIENTE*\n\n` +
                `💰 Tienes: *¥${currentBalance.toLocaleString()}*\n` +
                `🎰 Intentas apostar: *¥${betAmount.toLocaleString()}*`
            );
        }

        const won = Math.random() < 0.5;
        let newBalance: number;
        let message: string;

        if (won) {
            newBalance = currentBalance + betAmount;
            message = 
                `🎉 *¡GANASTE!*\n\n` +
                `🎲 Resultado: *GANADOR*\n` +
                `💰 Ganancia: *+¥${betAmount.toLocaleString()}*\n` +
                `💸 Saldo total: *¥${newBalance.toLocaleString()}*\n\n` +
                `⏳ Próxima apuesta en: *30 minutos*`;
        } else {
            newBalance = currentBalance - betAmount;
            message = 
                `😢 *¡PERDISTE!*\n\n` +
                `🎲 Resultado: *PERDEDOR*\n` +
                `💸 Pérdida: *-¥${betAmount.toLocaleString()}*\n` +
                `💰 Saldo total: *¥${newBalance.toLocaleString()}*\n\n` +
                `⏳ Próxima apuesta en: *30 minutos*`;
        }

        updateUser(sender, { name: user.name, yen: newBalance, banned: user.banned });
        setCooldown(sender, 'bet', now + 30 * 60 * 1000);

        return msg.reply(message);
    } catch (error: any) {
        console.error('[BET ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al realizar la apuesta.');
    }
}
