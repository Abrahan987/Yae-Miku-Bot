import { isBotMuted, setBotMuted } from '../lib/bot_mute.ts';
import { isSubbotPrivateModeOwner } from '../lib/private_mode.ts';
import { deco } from '../lib/perms.ts';

export const command = ['bot'];
export const category = 'admin';
export const description = 'Activa o desactiva el bot en el grupo.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const subbotOwner = sock?.subbotPhone
        ? isSubbotPrivateModeOwner(sock, msg, rawMsg, String(sock.subbotPhone))
        : false;
    if (!extra?.isAdmin && !extra?.isOwner && !subbotOwner) {
        return msg.reply(deco(
            '𝙰𝙲𝙲𝙴𝚂𝙾 𝙳𝙴𝙽𝙴𝙶𝙰𝙳𝙾',
            'Este comando solo puede ser usado por un administrador del grupo o por el propietario de esta instancia.'
        ));
    }

    const chatId = msg.from || msg.chat;
    const desactivado = isBotMuted(sock, chatId);
    const arg = ((extra?.args || [])[0] || '').toLowerCase();

    if (arg === 'off') {
        if (desactivado) return msg.reply('⚠️ Esta instancia del bot ya estaba desactivada en este grupo.');
        setBotMuted(sock, chatId, true);
        return msg.reply(`✅ ${sock?.subbotPhone ? 'Este sub-bot' : 'El bot'} fue desactivado en este grupo.`);
    }

    if (arg === 'on') {
        if (!desactivado) return msg.reply('⚠️ Esta instancia del bot ya estaba activada en este grupo.');
        setBotMuted(sock, chatId, false);
        return msg.reply(`✅ ${sock?.subbotPhone ? 'Este sub-bot' : 'El bot'} fue activado en este grupo.`);
    }

    const p = (global as any).prefix?.[0] || '.';
    return msg.reply(
        `🪷 *ESTADO DEL BOT*\n\n` +
        `🍓 Esta instancia: ${desactivado ? 'Desactivada' : 'Activada'}\n\n` +
        `> ${p}bot on\n` +
        `> ${p}bot off`
    );
}
