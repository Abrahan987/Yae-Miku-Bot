import { getUser, updateUser, getCooldown, setCooldown } from '../lib/database.ts';

export const command = ['steal', 'robar', 'rob'];
export const category = 'economia';
export const description = 'Intenta robar yen a otro usuario.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const sender = msg.sender;

    try {
        const now = Date.now();
        const until = getCooldown(sender, 'steal');

        if (now < until) {
            const timeLeft = Math.ceil((until - now) / 1000 / 60);
            return msg.reply(
                `⚠︎ Ya intentaste robar.\n\n🪷 Espera *${timeLeft} minutos*`
            );
        }

        const target = msg.mentionedJid?.[0] || msg.quoted?.sender;

        if (!target) {
            return msg.reply(
                `🍓 Uso:\n\n> ${global.prefix[0]}steal @usuario\n> O responde a su mensaje`
            );
        }

        if (sender === target) {
            return msg.reply('⚠︎ No puedes robarte a ti mismo.');
        }

        const sender_user = getUser(sender);
        const target_user = getUser(target);

        if ((target_user.yen || 0) < 1000) {
            return msg.reply('⚠︎ Ese usuario tiene muy poco dinero.');
        }

        const chance = Math.random();
        const targetNumber = target.split('@')[0];

        setCooldown(sender, 'steal', now + 2 * 60 * 60 * 1000);

        if (chance < 0.5) {
            const stolen = Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000;
            const newTargetBalance = Math.max(0, (target_user.yen || 0) - stolen);
            const newSenderBalance = (sender_user.yen || 0) + stolen;

            updateUser(target, {
                name: target_user.name,
                yen: newTargetBalance,
                banned: target_user.banned
            });

            updateUser(sender, {
                name: sender_user.name,
                yen: newSenderBalance,
                banned: sender_user.banned
            });

            return msg.reply(
                `✅ Robo exitoso\n\n🪷 Le robaste *¥${stolen.toLocaleString()}* a @${targetNumber}\n💰 Tu saldo: *¥${newSenderBalance.toLocaleString()}*`
            );
        } else {
            const loss = Math.floor(Math.random() * (2000 - 500 + 1)) + 500;
            const newSenderBalance = Math.max(0, (sender_user.yen || 0) - loss);

            updateUser(sender, {
                name: sender_user.name,
                yen: newSenderBalance,
                banned: sender_user.banned
            });

            return msg.reply(
                `⚠︎ El robo fracasó\n\n🪷 Perdiste *¥${loss.toLocaleString()}* en el intento\n💰 Tu saldo: *¥${newSenderBalance.toLocaleString()}*`
            );
        }
    } catch (error: any) {
        console.error('[STEAL ERROR]:', error);
        return msg.reply('⚠︎ Ocurrió un error al robar.');
    }
}
