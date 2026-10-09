import { getActiveBots } from '../lib/subbot.ts';
import { getPrimary, setPrimary, clearPrimary } from '../lib/primary.ts';

export const command = ['setprimary'];
export const category = 'admin';
export const description = 'Establece un bot como primario del grupo.';
export const admin = true;
export const botAdmin = false;

const num = (x: any): string =>
    String(x || '').split('@')[0].split(':')[0].replace(/[^\d]/g, '');

const strip = (n: string): string => (n.startsWith('521') ? '52' + n.slice(3) : n);

function botNumbers(bot: any): string[] {
    return [num(bot?.user?.id), num(bot?.user?.lid)].filter(Boolean).map(strip);
}

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const subs: any[] = Array.from(getActiveBots().values());

    if (subs.includes(sock)) return;

    const chatId = msg.from || msg.chat;
    const p = (global as any).prefix?.[0] || '.';
    const arg = ((extra?.args || [])[0] || '').toLowerCase();

    if (arg === 'reset' || arg === 'off') {
        if (!getPrimary(chatId)) {
            return msg.reply('⚠️ Este grupo no tiene un bot primario.');
        }
        clearPrimary(chatId);
        return msg.reply('✅ Bot primario eliminado. Ahora responderán todos los bots.');
    }

    const targetJid = (msg.mentionedJid || [])[0] || msg.quoted?.sender;

    if (!targetJid) {
        const actual = getPrimary(chatId);
        return msg.reply(
            `🍓 Uso\n\n` +
            `> ${p}setprimary @bot\n` +
            `> ${p}setprimary reset\n\n` +
            `🪷 Primario actual: ${actual ? '@' + actual : 'Ninguno'}`
        );
    }

    try {
        const participants: any[] = extra?.participants || [];
        const wanted = num(targetJid);

        const participant = participants.find((pt: any) =>
            [pt?.id, pt?.lid, pt?.phoneNumber].map(num).includes(wanted)
        );

        const candidates = new Set<string>(
            [targetJid, participant?.id, participant?.lid, participant?.phoneNumber]
                .map(num)
                .filter(Boolean)
                .map(strip)
        );

        const bots: any[] = [sock, ...subs];
        const found = bots.find((b: any) => botNumbers(b).some((n) => candidates.has(n)));

        if (!found) {
            return msg.reply('⚠️ El usuario mencionado no es una instancia de este bot.');
        }

        const botNumber = num(found.user?.id);

        if (!participants.some((pt: any) =>
            [pt?.id, pt?.lid, pt?.phoneNumber].map(num).map(strip).includes(strip(botNumber)) ||
            [pt?.id, pt?.lid, pt?.phoneNumber].map(num).includes(num(found.user?.lid))
        )) {
            return msg.reply('⚠️ El bot mencionado no está presente en este grupo.');
        }

        if (getPrimary(chatId) === botNumber) {
            return msg.reply(`🪷 @${botNumber} ya es el bot primario de este grupo.`);
        }

        setPrimary(chatId, botNumber);

        return sock.sendMessage(
            chatId,
            {
                text:
                    `✅ *BOT PRIMARIO*\n\n` +
                    `🪷 @${botNumber} ahora es el bot primario de este grupo.\n` +
                    `📌 Solo él responderá a los comandos aquí.`,
                mentions: [`${botNumber}@s.whatsapp.net`]
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[SETPRIMARY ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al establecer el bot primario.');
    }
}
