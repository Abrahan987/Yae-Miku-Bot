import { getUser, updateUser, getCooldown, setCooldown } from '../lib/database.ts';
import { isOwner, deco, warn } from '../lib/perms.ts';

export const command = ['gift', 'regalo', 'regalar', 'givecoins', 'pay', 'coinsgive', 'chetar', 'daryenes'];
export const category = 'economia';
export const description = 'Regalar dinero a otros usuarios.';
export const admin = false;
export const botAdmin = false;

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

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    const sender = msg.sender;
    const args = extra.args;
    const mentioned = msg.mentions || [];

    try {
        const action = String(extra.command || 'gift').toLowerCase();
        if (action === 'chetar') {
            if (!isOwner(sock, msg, rawMsg)) {
                return sock.sendMessage(msg.from, { text: warn.owner() }, { quoted: msg });
            }
            const amount = parseInt(args.find((value: string) => /^\d+$/.test(value)) || '', 10);
            if (!Number.isSafeInteger(amount) || amount < 0) {
                return msg.reply(deco('𝙲𝙷𝙴𝚃𝙰𝚁', `🪷 𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n> ${(global as any).prefix[0]}chetar 1000000`));
            }
            const ownerUser = getUser(sender);
            updateUser(sender, { name: ownerUser.name, yen: amount, bank: ownerUser.bank, banned: ownerUser.banned });
            return msg.reply(deco('𝙲𝙷𝙴𝚃𝙰𝚁', `🪷 Tus yenes fueron establecidos en *¥${amount.toLocaleString()}*.`));
        }
        if (action === 'daryenes') {
            if (!isOwner(sock, msg, rawMsg)) {
                return sock.sendMessage(msg.from, { text: warn.owner() }, { quoted: msg });
            }
            const recipient = msg.mentionedJid?.[0] || msg.quoted?.sender;
            const amount = parseInt(args.find((value: string) => /^\d+$/.test(value)) || '', 10);
            if (!recipient) {
                return msg.reply(deco('𝙳𝙰𝚁𝙴𝙽𝙴𝚂', `🪷 𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n> ${(global as any).prefix[0]}daryenes @usuario 5000`));
            }
            if (!Number.isSafeInteger(amount) || amount < 1) {
                return msg.reply(deco('𝙳𝙰𝚁𝙴𝙽𝙴𝚂', '🪷 Indica una cantidad válida mayor a cero.'));
            }
            const recipientUser = getUser(recipient);
            const newBalance = (recipientUser.yen || 0) + amount;
            if (!Number.isSafeInteger(newBalance)) {
                return msg.reply(deco('𝙳𝙰𝚁𝙴𝙽𝙴𝚂', '🪷 La cantidad excede el límite permitido.'));
            }
            updateUser(recipient, {
                name: recipientUser.name,
                yen: newBalance,
                bank: recipientUser.bank,
                banned: recipientUser.banned
            });
            return sock.sendMessage(
                msg.from,
                {
                    text: deco('𝙳𝙰𝚁𝙴𝙽𝙴𝚂', `🪷 Entregaste *¥${amount.toLocaleString()}* a @${recipient.split('@')[0]}.\n> Nuevo saldo: *¥${((recipientUser.yen || 0) + amount).toLocaleString()}*`),
                    mentions: [recipient]
                },
                { quoted: msg }
            );
        }
        if (['givecoins', 'pay', 'coinsgive'].includes(action)) {
            const recipient = msg.mentionedJid?.[0] || msg.quoted?.sender;
            const amountArg = args.find((value: string) => /^\d+$/.test(value));
            const amount = amountArg ? parseInt(amountArg, 10) : 0;
            if (!recipient) return msg.reply('❌ Debes mencionar a quien quieras transferir yenes.');
            if (amount <= 0) return msg.reply('❌ Ingresa una cantidad válida para transferir.');
            if (recipient === sender) return msg.reply('❌ No puedes transferirte a ti mismo.');
            const senderUser = getUser(sender);
            const recipientUser = getUser(recipient);
            if (amount > (senderUser.bank || 0)) return msg.reply(`❌ No tienes suficientes yenes en el banco. Disponible: *¥${(senderUser.bank || 0).toLocaleString()}*`);
            updateUser(sender, { name: senderUser.name, yen: senderUser.yen, bank: (senderUser.bank || 0) - amount, banned: senderUser.banned });
            updateUser(recipient, { name: recipientUser.name, yen: recipientUser.yen, bank: (recipientUser.bank || 0) + amount, banned: recipientUser.banned });
            return msg.reply(`🏦 *TRANSFERENCIA*\n\nTransferiste *¥${amount.toLocaleString()}* al banco de @${recipient.split('@')[0]}.\nBanco restante: *¥${((senderUser.bank || 0) - amount).toLocaleString()}*`);
        }
        if (!args.length || args[0].toLowerCase() === 'help') {
            return msg.reply(
                `🎁 *REGALO*\n\n` +
                `📌 Uso: *.gift @usuario <cantidad>*\n\n` +
                `Ejemplos:\n` +
                `• *.gift @usuario 5000* → Regala 5000 yen\n\n` +
                `⏱️ Cooldown: *1 hora*`
            );
        }

        if (!mentioned.length) {
            return msg.reply('❌ Debes mencionar a un usuario. Uso: *.gift @usuario <cantidad>*');
        }

        const now = Date.now();
        const until = getCooldown(sender, 'gift');

        if (now < until) {
            const timeLeft = formatTime(until - now);
            return msg.reply(
                `⏱️ *COOLDOWN ACTIVO*\n\n` +
                `🎁 Ya regalaste hace poco.\n` +
                `⏳ Vuelve en: *${timeLeft}*`
            );
        }

        const recipient = mentioned[0];
        const giftAmount = parseInt(args[args.length - 1], 10);

        if (isNaN(giftAmount) || giftAmount <= 0) {
            return msg.reply('❌ Cantidad inválida. Usa un número válido.');
        }

        const senderUser = getUser(sender);
        const senderBalance = senderUser.yen || 0;

        if (giftAmount > senderBalance) {
            return msg.reply(
                `❌ *DINERO INSUFICIENTE*\n\n` +
                `💰 Tienes: *¥${senderBalance.toLocaleString()}*\n` +
                `🎁 Intentas regalar: *¥${giftAmount.toLocaleString()}*`
            );
        }

        const recipientUser = getUser(recipient);
        const recipientBalance = recipientUser.yen || 0;

        const newSenderBalance = senderBalance - giftAmount;
        const newRecipientBalance = recipientBalance + giftAmount;

        updateUser(sender, { name: senderUser.name, yen: newSenderBalance, banned: senderUser.banned });
        updateUser(recipient, { name: recipientUser.name, yen: newRecipientBalance, banned: recipientUser.banned });
        setCooldown(sender, 'gift', now + 60 * 60 * 1000);

        const recipientMention = msg.mentions && msg.mentions.length > 0 
            ? `@${recipient.split('@')[0]}` 
            : 'Usuario';

        return msg.reply(
            `✅ *REGALO ENVIADO*\n\n` +
            `🎁 Regalaste: *¥${giftAmount.toLocaleString()}*\n` +
            `👤 Destinatario: *${recipientMention}*\n\n` +
            `💰 Tu saldo: *¥${newSenderBalance.toLocaleString()}*\n\n` +
            `⏳ Próximo regalo en: *1 hora*`
        );
    } catch (error: any) {
        console.error('[GIFT ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al regalar dinero.');
    }
}
