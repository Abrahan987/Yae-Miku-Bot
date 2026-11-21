import { getUser, updateUser, getCooldown, setCooldown } from '../lib/database.ts';

export const command = ['bet', 'apostar', 'casino', 'cf', 'flip', 'coinflip', 'rt', 'roulette', 'ruleta', 'slot', 'ppt'];
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
        const action = String(extra.command || 'bet').toLowerCase();
        if (['cf', 'flip', 'coinflip'].includes(action)) {
            const amountIndex = args.findIndex((value: string) => /^\d+$/.test(value));
            const amount = amountIndex >= 0 ? parseInt(args[amountIndex], 10) : 0;
            const side = args.find((value: string) => ['cara', 'cruz'].includes(value.toLowerCase()))?.toLowerCase();
            if (amount < 100 || !side) return msg.reply(`❌ Uso: *.${action} 200 cara* o *.${action} cruz 200*`);
            const until = getCooldown(sender, 'coinflip');
            if (Date.now() < until) return msg.reply(`⏱️ Espera *${formatTime(until - Date.now())}* antes de volver.`);
            const user = getUser(sender);
            if (amount > (user.yen || 0)) return msg.reply(`❌ No tienes suficientes yenes para apostar *¥${amount.toLocaleString()}*.`);
            const result = Math.random() < 0.5 ? 'cara' : 'cruz';
            const won = result === side;
            const yen = (user.yen || 0) + (won ? amount : -amount);
            updateUser(sender, { name: user.name, yen: Math.max(0, yen), banned: user.banned });
            setCooldown(sender, 'coinflip', Date.now() + 10 * 1000);
            return msg.reply(won
                ? `🪙 *CARA O CRUZ*\n\nGanó *${result}*.\nGanaste *+¥${amount.toLocaleString()}*`
                : `🪙 *CARA O CRUZ*\n\nSalió *${result}*.\nPerdiste *-¥${amount.toLocaleString()}*`);
        }
        if (['rt', 'roulette', 'ruleta'].includes(action)) {
            const amount = parseInt(args.find((value: string) => /^\d+$/.test(value)) || '0', 10);
            const color = args.find((value: string) => ['red', 'black', 'green'].includes(value.toLowerCase()))?.toLowerCase();
            if (amount < 200 || !color) return msg.reply(`❌ Uso: *.${action} 200 red* o *.${action} black 200*`);
            const until = getCooldown(sender, 'roulette');
            if (Date.now() < until) return msg.reply(`⏱️ Espera *${formatTime(until - Date.now())}* antes de volver.`);
            const user = getUser(sender);
            if (amount > (user.yen || 0)) return msg.reply(`❌ No tienes suficientes yenes.`);
            const roll = Math.floor(Math.random() * 37);
            const result = roll < 9 ? 'green' : roll < 23 ? 'red' : 'black';
            const multiplier = result === 'green' ? 5 : 2;
            const won = result === color;
            const prize = won ? amount * multiplier : -amount;
            const yen = Math.max(0, (user.yen || 0) + prize);
            updateUser(sender, { name: user.name, yen, banned: user.banned });
            setCooldown(sender, 'roulette', Date.now() + 30 * 1000);
            return msg.reply(`🎡 *RULETA*\n\nSalió *${result}*.\n${won ? `Ganaste *¥${(amount * multiplier).toLocaleString()}*` : `Perdiste *¥${amount.toLocaleString()}*`}`);
        }
        if (action === 'ppt') {
            const choice = args[0]?.toLowerCase();
            if (!['piedra', 'papel', 'tijera'].includes(choice)) return msg.reply(`❌ Uso: *.ppt piedra*, *.ppt papel* o *.ppt tijera*`);
            const until = getCooldown(sender, 'ppt');
            if (Date.now() < until) return msg.reply(`⏱️ Espera *${formatTime(until - Date.now())}* antes de volver.`);
            const options = ['piedra', 'papel', 'tijera'];
            const botChoice = options[Math.floor(Math.random() * options.length)];
            const won = (choice === 'piedra' && botChoice === 'tijera') || (choice === 'papel' && botChoice === 'piedra') || (choice === 'tijera' && botChoice === 'papel');
            const tie = choice === botChoice;
            const user = getUser(sender);
            const change = tie ? 800 + Math.floor(Math.random() * 701) : won ? 3000 + Math.floor(Math.random() * 2501) : -(1000 + Math.floor(Math.random() * 2001));
            const yen = Math.max(0, (user.yen || 0) + change);
            updateUser(sender, { name: user.name, yen, banned: user.banned });
            setCooldown(sender, 'ppt', Date.now() + 60 * 1000);
            return msg.reply(`✂️ *PIEDRA, PAPEL O TIJERA*\n\nElegiste *${choice}* y Yae eligió *${botChoice}*\n${tie ? 'Empate' : won ? 'Ganaste' : 'Perdiste'}: *${change >= 0 ? '+' : '-'}¥${Math.abs(change).toLocaleString()}*`);
        }
        if (action === 'slot') {
            const bet = parseInt(args[0], 10);
            if (!bet || bet < 100) return msg.reply('❌ Uso: *.slot <cantidad>*');
            const until = getCooldown(sender, 'slot');
            if (Date.now() < until) return msg.reply(`⏱️ Espera *${formatTime(until - Date.now())}* antes de volver.`);
            const user = getUser(sender);
            if (bet > (user.yen || 0)) return msg.reply('❌ No tienes suficientes yenes.');
            const emojis = ['✾', '❃', '❁'];
            const reel = () => emojis[Math.floor(Math.random() * emojis.length)];
            const a = reel(), b = reel(), c = reel();
            const won = a === b && b === c;
            const pair = a === b || a === c || b === c;
            const change = won ? bet : pair ? 10 : -bet;
            const yen = Math.max(0, (user.yen || 0) + change);
            updateUser(sender, { name: user.name, yen, banned: user.banned });
            setCooldown(sender, 'slot', Date.now() + 30 * 1000);
            return msg.reply(`🎰 *SLOTS*\n\n${a} : ${b} : ${c}\n\n${change >= 0 ? `Ganaste +¥${change.toLocaleString()}` : `Perdiste -¥${Math.abs(change).toLocaleString()}`} `);
        }
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
