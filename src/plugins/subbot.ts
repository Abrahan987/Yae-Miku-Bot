import { startSubBot, listActiveBots, normalizePhone } from '../lib/subbot.ts';

export const command = ['qr', 'code'];
export const category = 'socket';
export const description = 'Vincula un sub-bot con QR o código. Si no detecta tu número: .code +número';
export const admin = false;
export const botAdmin = false;

const ESPERA_MS = 80000;
const MAX_SUBS = 50;
const tiempos = new Map<string, number>();

function formatearTiempo(ms: number): string {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

export default async function (sock: any, msg: any, extra: any) {
    const sender: string = msg.sender;
    const esCode = extra.command === 'code';

    try {
        // Número escrito manualmente: .code +595 981 123456
        const argsTexto: string = Array.isArray(extra.args)
            ? extra.args.join('')
            : String(extra.args || '');
        const digitosManual = argsTexto.replace(/\D/g, '');
        const tieneManual = digitosManual.length > 0;

        if (tieneManual && (digitosManual.length < 8 || digitosManual.length > 15)) {
            return msg.reply(
                '⚠️ El número no es válido.\n\n' +
                'Ejemplo: *.code +595981123456*'
            );
        }

        const ahora = Date.now();
        const ultimo = tiempos.get(sender) || 0;
        if (ahora - ultimo < ESPERA_MS) {
            return msg.reply(
                `⏳ *ESPERA UN MOMENTO*\n\n` +
                `🪷 Debes esperar *${formatearTiempo(ESPERA_MS - (ahora - ultimo))}* antes de intentar de nuevo.`
            );
        }

        if (listActiveBots().length >= MAX_SUBS) {
            return msg.reply('❌ No hay espacios disponibles. El bot tiene demasiados sub-bots activos.');
        }

        // Resolver el número: manual > detectado del sender
        let numero: string | null = null;

        if (tieneManual) {
            numero = normalizePhone(digitosManual);
        } else if (!sender.endsWith('@lid')) {
            numero = normalizePhone(sender.split('@')[0]);
        }

        if (!numero) {
            return msg.reply(
                '⚠️ *No pude obtener tu número*\n\n' +
                'Tu cuenta usa nombre de usuario de WhatsApp, así que no puedo ver tu número.\n\n' +
                '🪷 Escribe tu número manualmente:\n' +
                '*.code +595981123456*\n\n' +
                '_(con código de país, sin espacios)_'
            );
        }

        tiempos.set(sender, ahora);

        await startSubBot({
            phone: numero,
            isCode: esCode,
            mainSocket: sock,
            mainChat: msg.from,
            mainMsg: msg
        });

        if (!esCode) {
            await msg.reply('🪷 Generando tu código QR, espera un momento...');
        } else {
            await msg.reply('🪷 Generando tu código de emparejamiento, espera un momento...');
        }
    } catch (error: any) {
        tiempos.delete(sender);
        console.error('[SUBBOT ERROR]:', error);
        return msg.reply(`⚠️ ${error?.message || 'Error al vincular el sub-bot.'}`);
    }
}
