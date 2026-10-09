import { isAntilinkEnabled, setAntilink } from '../lib/antilink.ts';

export const command = ['antilink', 'antienlace'];
export const category = 'admin';
export const description = 'Activa o desactiva el antilink: elimina los mensajes con links de los miembros.';
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

    if (arg === 'on' || arg === 'activar') {
        if (actual) return msg.reply('⚠️ El antilink ya estaba *activado*.');
        setAntilink(chatId, true);
        return msg.reply('✅ *ANTILINK ACTIVADO*\n\n🪷 Los mensajes con links de los miembros serán eliminados.');
    }

    if (arg === 'off' || arg === 'desactivar') {
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
