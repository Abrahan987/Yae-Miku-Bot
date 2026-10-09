import { db, getGroup } from '../lib/database.ts';

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
    const grupo = getGroup(chatId);
    const desactivado = Number(grupo.mute) === 1;
    const arg = ((extra?.args || [])[0] || '').toLowerCase();

    if (arg === 'off') {
        if (desactivado) return msg.reply('⚠️ El bot ya estaba desactivado en este grupo.');
        db.prepare('UPDATE groups SET mute = 1 WHERE jid = ?').run(chatId);
        return msg.reply('✅ El bot fue desactivado en este grupo.');
    }

    if (arg === 'on') {
        if (!desactivado) return msg.reply('⚠️ El bot ya estaba activado en este grupo.');
        db.prepare('UPDATE groups SET mute = 0 WHERE jid = ?').run(chatId);
        return msg.reply('✅ El bot fue activado en este grupo.');
    }

    const p = (global as any).prefix?.[0] || '.';
    return msg.reply(
        `🪷 *ESTADO DEL BOT*\n\n` +
        `🍓 Actual: ${desactivado ? 'Desactivado' : 'Activado'}\n\n` +
        `> ${p}bot on\n` +
        `> ${p}bot off`
    );
}
