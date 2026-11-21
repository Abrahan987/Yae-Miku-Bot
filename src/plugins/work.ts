import { getUser, updateUser, getCooldown, setCooldown } from '../lib/database.ts';

export const command = ['work', 'trabajar', 'w', 'crime', 'crimen', 'slut', 'prostituirse', 'mine', 'minar', 'fish', 'pescar', 'hunt', 'cazar', 'adventure', 'aventura', 'dungeon', 'mazmorra', 'invoke', 'ritual', 'invocar'];
export const category = 'economia';
export const description = 'Trabaja y gana yen.';
export const admin = false;
export const botAdmin = false;

const trabajos = [
    'Trabajas como diseñador gráfico y ganas',
    'Eres programador freelance y ganas',
    'Trabajas en una tienda y ganas',
    'Haces un video viral y ganas',
    'Vendes artesanías y ganas',
    'Eres fotógrafo profesional y ganas',
    'Trabajas como chef y ganas',
    'Eres traductor y ganas',
    'Das tutorías online y ganas',
    'Vendes fotos stock y ganas',
    'Trabajas como community manager y ganas',
    'Diseñas logos y ganas',
    'Escribes artículos y ganas',
    'Editas videos y ganas',
    'Haces streaming y ganas'
];

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

    try {
        const action = String(extra.command || '').toLowerCase();
        const crimeActions = ['crime', 'crimen'];
        const resourceActions = ['mine', 'minar', 'fish', 'pescar', 'hunt', 'cazar'];
        const adventureActions = ['adventure', 'aventura', 'dungeon', 'mazmorra'];
        const ritualActions = ['invoke', 'ritual', 'invocar'];
        if (crimeActions.includes(action) || ['slut', 'prostituirse'].includes(action)) {
            const key = crimeActions.includes(action) ? 'crime' : 'slut';
            const until = getCooldown(sender, key);
            if (Date.now() < until) {
                return msg.reply(`⏱️ *COOLDOWN ACTIVO*\n\n🍥 Debes esperar *${formatTime(until - Date.now())}* antes de intentarlo de nuevo.`);
            }
            const success = Math.random() < 0.5;
            const user = getUser(sender);
            const amount = success
                ? 3500 + Math.floor(Math.random() * 2501)
                : 2000 + Math.floor(Math.random() * 2001);
            let yen = user.yen || 0;
            let bank = user.bank || 0;
            if (success) {
                yen += amount;
            } else {
                const loss = Math.min(amount, yen + bank);
                if (yen >= loss) yen -= loss;
                else {
                    const fromBank = loss - yen;
                    yen = 0;
                    bank = Math.max(0, bank - fromBank);
                }
            }
            updateUser(sender, { name: user.name, yen, bank, banned: user.banned });
            setCooldown(sender, key, Date.now() + (key === 'crime' ? 7 : 5) * 60 * 1000);
            const label = key === 'crime' ? 'CRIMEN' : 'TRABAJO DE RIESGO';
            return msg.reply(
                success
                    ? `✅ *${label} EXITOSO*\n\n🍓 Ganaste *¥${amount.toLocaleString()}*\n💰 Saldo: *¥${yen.toLocaleString()}*`
                    : `❌ *${label} FALLIDO*\n\n🍥 Perdiste *¥${amount.toLocaleString()}*\n💰 Saldo: *¥${yen.toLocaleString()}*`
            );
        }
        if (resourceActions.includes(action) || adventureActions.includes(action) || ritualActions.includes(action)) {
            const key = resourceActions.includes(action)
                ? (['mine', 'minar'].includes(action) ? 'mine' : ['fish', 'pescar'].includes(action) ? 'fish' : 'hunt')
                : adventureActions.includes(action)
                    ? (['dungeon', 'mazmorra'].includes(action) ? 'dungeon' : 'adventure')
                    : 'invoke';
            const delays: Record<string, number> = { mine: 10, fish: 8, hunt: 15, adventure: 20, dungeon: 17, invoke: 12 };
            const until = getCooldown(sender, key);
            if (Date.now() < until) {
                return msg.reply(`⏱️ *COOLDOWN ACTIVO*\n\n🍥 Debes esperar *${formatTime(until - Date.now())}* antes de volver.`);
            }
            const user = getUser(sender);
            const success = Math.random() < 0.55;
            const ranges: Record<string, [number, number]> = {
                mine: [7000, 9500], fish: [6000, 8000], hunt: [10000, 13000],
                adventure: [14000, 18000], dungeon: [12000, 15000], invoke: [8000, 11000]
            };
            const [min, max] = ranges[key];
            const amount = min + Math.floor(Math.random() * (max - min + 1));
            const yen = success
                ? (user.yen || 0) + amount
                : Math.max(0, (user.yen || 0) - amount);
            updateUser(sender, { name: user.name, yen, bank: success ? user.bank : user.bank, banned: user.banned });
            setCooldown(sender, key, Date.now() + delays[key] * 60 * 1000);
            const names: Record<string, string> = { mine: 'MINERÍA', fish: 'PESCA', hunt: 'CAZA', adventure: 'AVENTURA', dungeon: 'MAZMORRA', invoke: 'RITUAL' };
            return msg.reply(
                success
                    ? `✅ *${names[key]}*\n\n🍓 Ganaste *¥${amount.toLocaleString()}*\n💰 Saldo: *¥${yen.toLocaleString()}*`
                    : `❌ *${names[key]}*\n\n🍥 No obtuviste recompensa y perdiste *¥${amount.toLocaleString()}*\n💰 Saldo: *¥${yen.toLocaleString()}*`
            );
        }
        const now = Date.now();
        const until = getCooldown(sender, 'work');

        if (now < until) {
            const timeLeft = formatTime(until - now);
            return msg.reply(
                `⏱️ *COOLDOWN ACTIVO*\n\n` +
                `🍥 Ya trabajaste hace poco.\n` +
                `⏳ Vuelve en: *${timeLeft}*\n\n` +
                `📌 Descansa un poco antes de volver a trabajar.`
            );
        }

        const user = getUser(sender);
        const reward = 3000 + Math.floor(Math.random() * 7000);
        const trabajo = trabajos[Math.floor(Math.random() * trabajos.length)];
        const newBalance = (user.yen || 0) + reward;

        updateUser(sender, { name: user.name, yen: newBalance, banned: user.banned });
        setCooldown(sender, 'work', now + 60 * 60 * 1000);

        return msg.reply(
            `✅ *TRABAJO COMPLETADO*\n\n` +
            `⭐ ${trabajo} *¥${reward.toLocaleString()}*\n\n` +
            `💰 Saldo actual: *¥${newBalance.toLocaleString()}*\n` +
            `⏳ Próximo trabajo en: *1 hora*`
        );
    } catch (error: any) {
        console.error('[WORK ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al trabajar.');
    }
}
