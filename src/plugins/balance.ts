import { getUserBalance, db, getCooldown } from '../lib/database.ts';

export const command = ['balance', 'bal', 'saldo', 'dinero', 'economyboard', 'eboard', 'baltop', 'einfo', 'cooldowns', 'economyinfo', 'infoeconomy'];
export const category = 'economia';
export const description = 'Ver tu saldo de yen.';
export const admin = false;
export const botAdmin = false;

function formatCooldown(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const parts: string[] = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (mins) parts.push(`${mins}m`);
    if (secs || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
}

function formatYen(value: string | number | bigint | null | undefined): string {
    const amount = BigInt(value || 0);
    return amount.toLocaleString();
}

export default async function (sock: any, msg: any, extra: any) {
    const sender = msg.sender;

    try {
        const action = String(extra.command || '').toLowerCase();
        if (['economyboard', 'eboard', 'baltop'].includes(action)) {
            const limit = Math.max(1, Math.min(parseInt(extra.args[0], 10) || 10, 50));
            const rows = db.prepare(`
                SELECT jid, name, CAST(yen AS TEXT) AS yen, CAST(bank AS TEXT) AS bank
                FROM users
                WHERE yen + bank > 0
                ORDER BY yen + bank DESC
                LIMIT ?
            `).all(limit) as any[];
            if (!rows.length) return msg.reply('❌ No hay datos disponibles en el ranking económico.');
            let text = `🍓 *ECONOMY BOARD*\n\n`;
            rows.forEach((row, index) => {
                const total = BigInt(row.yen || 0) + BigInt(row.bank || 0);
                text += `${index + 1}. *${row.name || row.jid.split('@')[0]}* — ¥${formatYen(total)}\n`;
            });
            return msg.reply(text);
        }
        if (['einfo', 'cooldowns', 'economyinfo', 'infoeconomy'].includes(action)) {
            const now = Date.now();
            const keys = ['daily', 'weekly', 'monthly', 'coffer', 'work', 'crime', 'slut', 'mine', 'fish', 'hunt', 'adventure', 'dungeon', 'invoke', 'steal', 'bet'];
            let text = `🍓 *INFORMACIÓN ECONÓMICA*\n\n`;
            for (const key of keys) {
                const until = getCooldown(sender, key);
                text += `• ${key}: *${until > now ? formatCooldown(until - now) : 'Disponible'}*\n`;
            }
            return msg.reply(text);
        }
        const target = msg.mentionedJid?.[0] || msg.quoted?.sender || sender;
        const user = getUserBalance(target);
        const displayName = user.name || target.split('@')[0];

        return msg.reply(
            `💰 *SALDO DE YEN*\n\n` +
            `🪷 Usuario: *${displayName}*\n` +
            `💵 Dinero: *¥${formatYen(user.yen)}*\n` +
            `🏦 Banco: *¥${formatYen(user.bank)}*`
        );
    } catch (error: any) {
        console.error('[BALANCE ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al obtener tu saldo.');
    }
}
