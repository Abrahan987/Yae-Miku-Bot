import { isBotMuted, setBotMuted } from '../lib/bot_mute.ts';

export const command = ['bot'];
export const category = 'admin';
export const description = 'Activa o desactiva el bot en el grupo.';
export const admin = true;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
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
