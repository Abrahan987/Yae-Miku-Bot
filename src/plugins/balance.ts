import { getUser, updateUser, getCooldown, setCooldown } from '../lib/database.ts';

export const command = ['balance', 'bal', 'saldo', 'dinero'];
export const category = 'economia';
export const description = 'Ver tu saldo de yen.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    const sender = msg.sender;

    try {
        const target = msg.mentionedJid?.[0] || msg.quoted?.sender || sender;
        const user = getUser(target);
        const displayName = user.name || target.split('@')[0];

        return msg.reply(
            `💰 *SALDO DE YEN*\n\n` +
            `🪷 Usuario: *${displayName}*\n` +
            `💵 Dinero: *¥${(user.yen || 0).toLocaleString()}*`
        );
    } catch (error: any) {
        console.error('[BALANCE ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al obtener tu saldo.');
    }
}
