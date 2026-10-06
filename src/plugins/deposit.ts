import { getUser, updateUser, getCooldown, setCooldown } from '../lib/database.ts';

export const command = ['deposit', 'dep'];
export const category = 'economia';
export const description = 'Depositar dinero en el banco (seguro de robos).';
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

export default async function (sock: any, msg: any, extra: any) {
    const sender = msg.sender;
    const args = extra.args;

    try {
        if (!args.length || args[0].toLowerCase() === 'help') {
            return msg.reply(
                `💰 *DEPÓSITO BANCARIO*\n\n` +
                `📌 Uso: *.dep <cantidad>*\n\n` +
                `Ejemplos:\n` +
                `• *.dep 5000* → Deposita 5000 yen\n` +
                `• *.dep all* → Deposita todo tu dinero\n\n` +
                `🏦 El dinero depositado está seguro de robos.`
            );
        }

        const user = getUser(sender);
        const currentBalance = user.yen || 0;
        let amountToDeposit = 0;

        if (args[0].toLowerCase() === 'all') {
            amountToDeposit = currentBalance;
        } else {
            amountToDeposit = parseInt(args[0], 10);
        }

        if (isNaN(amountToDeposit) || amountToDeposit <= 0) {
            return msg.reply('❌ Cantidad inválida. Usa un número válido o "all".');
        }

        if (amountToDeposit > currentBalance) {
            return msg.reply(
                `❌ *DINERO INSUFICIENTE*\n\n` +
                `💰 Tienes: *¥${currentBalance.toLocaleString()}*\n` +
                `💸 Intentas depositar: *¥${amountToDeposit.toLocaleString()}*`
            );
        }

        const newBalance = currentBalance - amountToDeposit;
        updateUser(sender, { name: user.name, yen: newBalance, banned: user.banned });

        return msg.reply(
            `✅ *DEPÓSITO EXITOSO*\n\n` +
            `🏦 Dinero depositado: *+¥${amountToDeposit.toLocaleString()}*\n` +
            `💰 Dinero en mano: *¥${newBalance.toLocaleString()}*\n\n` +
            `🔒 Tu dinero está seguro en el banco.`
        );
    } catch (error: any) {
        console.error('[DEPOSIT ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al depositar.');
    }
}
