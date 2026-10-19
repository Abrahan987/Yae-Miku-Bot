import { isAntilinkEnabled, setAntilink } from '../lib/antilink.ts';

export const command = ['antilink', 'antienlace', 'antienlaces', 'antilinks'];
export const category = 'admin';
export const description = 'Activa o desactiva el antilink: borra links y expulsa si es link de WhatsApp.';
export const admin = true;
export const botAdmin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;
    const p = (global as any).prefix?.[0] || '.';
    const arg = ((extra?.args || [])[0] || '').toLowerCase();
    const actual = isAntilinkEnabled(chatId);

    if (arg === 'on' || arg === 'enable' || arg === 'activar') {
        if (actual) return msg.reply('⚠️ El antilink ya estaba *activado*.');
        setAntilink(chatId, true);
        return msg.reply(
            '✅ *ANTILINK ACTIVADO*\n\n' +
            '🪷 Links normales: se elimina el mensaje.\n' +
            '🍓 Links de WhatsApp: se elimina el mensaje y se expulsa al usuario.'
        );
    }

    if (arg === 'off' || arg === 'disable' || arg === 'desactivar') {
        if (!actual) return msg.reply('⚠️ El antilink ya estaba *desactivado*.');
        setAntilink(chatId, false);
        return msg.reply('✅ *ANTILINK DESACTIVADO*');
    }

    return msg.reply(
        `🪷 *ANTILINK*\n\n` +
        `🍓 Estado: ${actual ? 'Activado' : 'Desactivado'}\n\n` +
        `> ${p}antilink on\n` +
        `> ${p}antilink off`
    );
}
