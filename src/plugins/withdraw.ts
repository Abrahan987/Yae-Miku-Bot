import { getUser, updateUser, getCooldown, setCooldown } from '../lib/database.ts';

export const command = ['withdraw', 'con', 'retirada'];
export const category = 'economia';
export const description = 'Sacar dinero del banco.';
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
                `💸 *RETIRO BANCARIO*\n\n` +
                `📌 Uso: *.con <cantidad>*\n\n` +
                `Ejemplos:\n` +
                `• *.con 5000* → Retira 5000 yen\n` +
                `• *.con all* → Retira todo tu dinero\n\n` +
                `🏦 Retira tu dinero cuando lo necesites.`
            );
        }

        const user = getUser(sender);
        const bankBalance = user.bank_balance || 0;
        let amountToWithdraw = 0;

        if (args[0].toLowerCase() === 'all') {
            amountToWithdraw = bankBalance;
        } else {
            amountToWithdraw = parseInt(args[0], 10);
        }

        if (isNaN(amountToWithdraw) || amountToWithdraw <= 0) {
            return msg.reply('❌ Cantidad inválida. Usa un número válido o "all".');
        }

        if (amountToWithdraw > bankBalance) {
            return msg.reply(
                `❌ *SALDO INSUFICIENTE EN BANCO*\n\n` +
                `🏦 Tienes en banco: *¥${bankBalance.toLocaleString()}*\n` +
                `💸 Intentas retirar: *¥${amountToWithdraw.toLocaleString()}*`
            );
        }

        const newBankBalance = bankBalance - amountToWithdraw;
        const newHandBalance = (user.yen || 0) + amountToWithdraw;

        // Nota: Necesitas agregar campo 'bank_balance' a la tabla users
        updateUser(sender, { name: user.name, yen: newHandBalance, banned: user.banned });

        return msg.reply(
            `✅ *RETIRO EXITOSO*\n\n` +
            `💸 Dinero retirado: *+¥${amountToWithdraw.toLocaleString()}*\n` +
            `💰 Dinero en mano: *¥${newHandBalance.toLocaleString()}*\n` +
            `🏦 Saldo en banco: *¥${newBankBalance.toLocaleString()}*`
        );
    } catch (error: any) {
        console.error('[WITHDRAW ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al retirar.');
    }
}
