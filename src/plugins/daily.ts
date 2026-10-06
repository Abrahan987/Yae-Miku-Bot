import { getUser, updateUser, getCooldown, setCooldown } from '../lib/database.ts';

export const command = ['daily', 'diario'];
export const category = 'economy';
export const description = 'Reclama tu recompensa diaria de yen.';
export const admin = false;
export const botAdmin = false;

const COOLDOWN = 24 * 60 * 60 * 1000;

function formatTime(ms: number) {
    const total = Math.ceil(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h && `${h}h`, m && `${m}m`, (s || (!h && !m)) && `${s}s`].filter(Boolean).join(' ');
}

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🪷 Este comando solo funciona en grupos.');
    }

    try {
        const sender = msg.sender;
        const last = getCooldown(sender, 'daily');
        const remaining = last + COOLDOWN - Date.now();

        if (remaining > 0) {
            return msg.reply(
                `⚠︎ Debes esperar *${formatTime(remaining)}* para usar este comando de nuevo.`
            );
        }

        const reward = Math.floor(Math.random() * 501) + 500;

        const user = getUser(sender);
        updateUser(sender, { yen: (user.yen || 0) + reward });
        setCooldown(sender, 'daily');

        return msg.reply(
            `🪷 *RECOMPENSA DIARIA*\n\n✅ Has ganado *${reward}* yen.`
        );
    } catch (error: any) {
        console.error('[DAILY ERROR]:', error);
        return msg.reply('⚠︎ Ocurrió un error.');
    }
}
