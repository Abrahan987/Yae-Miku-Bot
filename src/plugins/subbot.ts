import { getActiveBots, getBotSessions, startSubBot, removeSubBot, listActiveBots } from '../lib/subbot.ts';
import { getUser, updateUser } from '../lib/database.ts';

export const command = ['subbot', 'qr', 'code'];
export const category = 'socket';
export const description = 'Vincular sub-bots con WhatsApp usando QR o código.';
export const admin = false;
export const botAdmin = false;

const COOLDOWN_MS = 80000; // 80 segundos
const MAX_SUBS = 50;
const userCooldowns = new Map<string, number>();

function formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return mins > 0
        ? `${mins} minuto${mins !== 1 ? 's' : ''} y ${secs} segundo${secs !== 1 ? 's' : ''}`
        : `${secs} segundo${secs !== 1 ? 's' : ''}`;
}

function normalizePhone(input: string): string {
    let s = String(input).replace(/\D/g, '');
    if (!s) return '';
    if (s.startsWith('0')) s = s.replace(/^0+/, '');
    if (s.length === 10 && s.startsWith('3')) s = '57' + s;
    if (s.startsWith('52') && !s.startsWith('521') && s.length >= 12) s = '521' + s.slice(2);
    if (s.startsWith('54') && !s.startsWith('549') && s.length >= 11) s = '549' + s.slice(2);
    return s;
}

export default async function (sock: any, msg: any, extra: any) {
    const sender = msg.sender;
    const args = extra.args || [];
    const command = extra.command;
    const prefix = (global as any).prefix?.[0] || '.';
    const nameBot = (global as any).namebot || 'Yae Miku Bot';
    const creador = (global as any).nmcreador || '';

    try {
        // Cooldown check
        const lastUsed = userCooldowns.get(sender) || 0;
        const now = Date.now();
        if (now - lastUsed < COOLDOWN_MS) {
            const remaining = COOLDOWN_MS - (now - lastUsed);
            return msg.reply(
                `⏱️ *COOLDOWN ACTIVO*\n\n` +
                `🪷 Debes esperar *${formatTime(remaining)}* para vincular otro sub-bot.\n\n` +
                `📌 Sé paciente, los sub-bots son recursos valiosos.`
            );
        }

        // Help
        if (!args.length || args[0] === 'help' || args[0] === '-list') {
            return msg.reply(
                `🪷 *SUB-BOT*\n\n` +
                `─────── ❀ ───────\n\n` +
                `🍓 *Uso:*\n` +
                `> ${prefix}qr <número>\n` +
                `> ${prefix}code <número>\n\n` +
                `✦ QR: Escanea un código QR\n` +
                `✦ CODE: Recibe un código de 8 dígitos\n\n` +
                `📌 Ejemplos:\n` +
                `> ${prefix}qr 573237649689\n` +
                `> ${prefix}code 521234567890\n\n` +
                `✓ Máximo de sub-bots: *${MAX_SUBS}*\n` +
                `✓ Sub-bots activos: *${listActiveBots().length}/${MAX_SUBS}*\n\n` +
                `─────── ❀ ───────`
            );
        }

        // Check active subs limit
        const activeSubs = listActiveBots();
        if (activeSubs.length >= MAX_SUBS) {
            return msg.reply(
                `⚠️ *LÍMITE DE SUB-BOTS ALCANZADO*\n\n` +
                `🍥 No hay espacios disponibles.\n` +
                `📊 Activos: *${activeSubs.length}/${MAX_SUBS}*\n\n` +
                `📌 Elimina un sub-bot antes de agregar otro.`
            );
        }

        // Get phone number
        const rawPhone = args.join(' ').split(/[|•/]/)[0].trim();
        const phone = normalizePhone(rawPhone || sender.split('@')[0]);

        if (!phone) {
            return msg.reply('⚠️ Número de teléfono inválido.');
        }

        // Check if already active
        if (activeSubs.includes(phone)) {
            return msg.reply(
                `⚠️ *SUB-BOT YA ACTIVO*\n\n` +
                `🪷 El sub-bot *${phone}* ya está conectado.\n\n` +
                `📌 Usa ${prefix}unsub ${phone} para desconectarlo.`
            );
        }

        // Update cooldown
        userCooldowns.set(sender, now);

        // Start sub-bot
        const isCode = command === 'code';
        const message = isCode
            ? `🪷 *CÓDIGO DE EMPAREJAMIENTO*\n\n` +
              `📱 Número: *${phone}*\n` +
              `✓ Recibe un código de 8 dígitos\n\n` +
              `📌 Sigue las instrucciones en tu WhatsApp`
            : `🪷 *CÓDIGO QR*\n\n` +
              `📱 Número: *${phone}*\n` +
              `✓ Escanea el código QR\n\n` +
              `📌 Sigue las instrucciones en tu WhatsApp`;

        await msg.reply(message);

        try {
            await startSubBot({
                phone,
                isCode,
                sender,
                mainSocket: sock,
                mainChat: msg.from,
                mainMsg: msg
            });
        } catch (error: any) {
            userCooldowns.delete(sender);
            return msg.reply(
                `❌ *ERROR AL VINCULAR SUB-BOT*\n\n` +
                `🍥 ${error?.message || 'Error desconocido'}\n\n` +
                `📌 Intenta de nuevo.`
            );
        }
    } catch (error: any) {
        console.error('[SUBBOT ERROR]:', error);
        return msg.reply(
            `⚠️ *ERROR*\n\n` +
            `🍥 ${error?.message || 'Error desconocido'}\n\n` +
            `📌 Contacta al soporte si el problema persiste.`
        );
    }
}
