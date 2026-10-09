import { clearPrimary, getPrimary } from '../lib/primary.ts';

export const command = ['resetprimary', 'clearprimary', 'fixprimary'];
export const category = 'admin';
export const description = 'Restablece el bot primario del grupo. Todos los bots volverán a responder.';
export const admin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;
    const actual = getPrimary(chatId);

    if (!actual) {
        return msg.reply('⚠️ Este grupo no tiene un bot primario establecido.');
    }

    clearPrimary(chatId);
    return msg.reply(`✅ Bot primario restablecido.\n\n🪷 Ahora todos los bots del sistema responderán en este grupo.`);
}
