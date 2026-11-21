import { getUser, updateUser, getCooldown, setCooldown } from '../lib/database.ts';

export const command = ['daily', 'diario', 'weekly', 'semanal', 'monthly', 'mensual', 'coffer', 'cofre'];
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
        const action = String(extra.command || 'daily').toLowerCase();
        if (['weekly', 'semanal'].includes(action)) {
            const now = Date.now();
            const until = getCooldown(sender, 'weekly');
            if (now < until) return msg.reply(`⏱️ *COOLDOWN ACTIVO*\n\n🍥 Ya reclamaste tu semanal.\n⏳ Vuelve en: *${formatTime(until - now)}*`);
            const user = getUser(sender);
            const reward = 40000 + Math.floor(Math.random() * 20001);
            updateUser(sender, { name: user.name, yen: (user.yen || 0) + reward, banned: user.banned });
            setCooldown(sender, 'weekly', now + 7 * 24 * 60 * 60 * 1000);
            return msg.reply(`✅ *RECOMPENSA SEMANAL*\n\n🪷 Recibiste *¥${reward.toLocaleString()}*\n💰 Saldo: *¥${((user.yen || 0) + reward).toLocaleString()}*`);
        }
        if (['monthly', 'mensual'].includes(action)) {
            const now = Date.now();
            const until = getCooldown(sender, 'monthly');
            if (now < until) return msg.reply(`⏱️ *COOLDOWN ACTIVO*\n\n🍥 Ya reclamaste tu mensual.\n⏳ Vuelve en: *${formatTime(until - now)}*`);
            const user = getUser(sender);
            const reward = 60000 + Math.floor(Math.random() * 20001);
            updateUser(sender, { name: user.name, yen: (user.yen || 0) + reward, banned: user.banned });
            setCooldown(sender, 'monthly', now + 30 * 24 * 60 * 60 * 1000);
            return msg.reply(`✅ *RECOMPENSA MENSUAL*\n\n🪷 Recibiste *¥${reward.toLocaleString()}*\n💰 Saldo: *¥${((user.yen || 0) + reward).toLocaleString()}*`);
        }
        if (['coffer', 'cofre'].includes(action)) {
            const now = Date.now();
            const until = getCooldown(sender, 'coffer');
            if (now < until) return msg.reply(`⏱️ *COOLDOWN ACTIVO*\n\n🍥 Ya abriste tu cofre.\n⏳ Vuelve en: *${formatTime(until - now)}*`);
            const user = getUser(sender);
            const roll = Math.random();
            const reward = roll < 0.5 ? 25000 : roll < 0.8 ? 40000 : 0;
            updateUser(sender, { name: user.name, yen: (user.yen || 0) + reward, banned: user.banned });
            setCooldown(sender, 'coffer', now + 24 * 60 * 60 * 1000);
            return msg.reply(reward
                ? `🧰 *COFRE ABIERTO*\n\n🍓 Encontraste *¥${reward.toLocaleString()}*\n💰 Saldo: *¥${((user.yen || 0) + reward).toLocaleString()}*`
                : `🧰 *COFRE VACÍO*\n\n🍥 El cofre no contenía monedas.`);
        }
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
