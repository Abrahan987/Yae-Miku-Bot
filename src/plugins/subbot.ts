import { startSubBot, listActiveBots, normalizePhone } from '../lib/subbot.ts';

export const command = ['qr', 'code'];
export const category = 'socket';
export const description = 'Vincula un sub-bot con QR o código (usa tu mismo número).';
export const admin = false;
export const botAdmin = false;

const COOLDOWN_MS = 80000;
const MAX_SUBS = 50;
const cooldowns = new Map<string, number>();

function formatTime(ms: number): string {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

export default async function (sock: any, msg: any, extra: any) {
    const sender: string = msg.sender;
    const isCode = extra.command === 'code';

    try {
        const now = Date.now();
        const last = cooldowns.get(sender) || 0;
        if (now - last < COOLDOWN_MS) {
            return msg.reply(
                `⏱️ *COOLDOWN ACTIVO*\n\n` +
                `🪷 Espera *${formatTime(COOLDOWN_MS - (now - last))}* para volver a intentar.`
            );
        }

        if (listActiveBots().length >= MAX_SUBS) {
            return msg.reply('⚠️ No hay espacios disponibles para nuevos sub-bots.');
        }

        if (sender.endsWith('@lid')) {
            return msg.reply('⚠️ No pude obtener tu número real. Intenta de nuevo en unos segundos.');
        }

        const phone = normalizePhone(sender.split('@')[0]);
        if (!phone) return msg.reply('⚠️ No pude obtener tu número.');

        cooldowns.set(sender, now);

        await startSubBot({
            phone,
            isCode,
            mainSocket: sock,
            mainChat: msg.from,
            mainMsg: msg
        });

        if (!isCode) {
            await msg.reply('🪷 Generando tu QR, un momento...');
        } else {
            await msg.reply('🪷 Generando tu código, un momento...');
        }
    } catch (error: any) {
        cooldowns.delete(sender);
        console.error('[SUBBOT ERROR]:', error);
        return msg.reply(`⚠️ ${error?.message || 'Error al vincular el sub-bot.'}`);
    }
}
