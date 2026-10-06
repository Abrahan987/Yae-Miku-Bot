import { getUser, updateUser, getCooldown, setCooldown } from '../lib/database.ts';

export const command = ['daily', 'diario'];
export const category = 'economia';
export const description = 'Reclama tu recompensa diaria de yen.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    const sender = msg.sender;

    try {
        const now = Date.now();
        const until = getCooldown(sender, 'daily');

        if (now < until) {
            const timeLeft = Math.ceil((until - now) / 1000 / 60);
            return msg.reply(
                `⚠︎ Ya reclamaste tu daily.\n\n🪷 Vuelve en *${timeLeft} minutos*`
            );
        }

        const user = getUser(sender);
        const reward = 5000 + Math.floor(Math.random() * 10000);
        const newBalance = (user.yen || 0) + reward;

        updateUser(sender, { name: user.name, yen: newBalance, banned: user.banned });
        setCooldown(sender, 'daily', now + 24 * 60 * 60 * 1000);

        return msg.reply(
            `✅ Recompensa diaria\n\n🪷 Ganaste *¥${reward.toLocaleString()}*\n💰 Saldo: *¥${newBalance.toLocaleString()}*`
        );
    } catch (error: any) {
        console.error('[DAILY ERROR]:', error);
        return msg.reply('⚠︎ Ocurrió un error al reclamar tu daily.');
    }
}
