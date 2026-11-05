import { getActiveBots } from '../lib/subbot.ts';
import { canModifySubBot, setSubBotName, getSubBotConfiguration } from '../lib/subbot_config.ts';

const normalizePhone = (input: string): string => {
    let s = String(input).replace(/\D/g, '');
    if (!s) return '';
    if (s.startsWith('0')) s = s.replace(/^0+/, '');
    if (s.length === 10 && s.startsWith('3')) s = '57' + s;
    if (s.startsWith('52') && !s.startsWith('521') && s.length >= 12) s = '521' + s.slice(2);
    if (s.startsWith('54') && !s.startsWith('549') && s.length >= 11) s = '549' + s.slice(2);
    return s;
};

const cleanJid = (jid: string = ''): string => {
    return jid.replace(/:\d+/, '').split('@')[0];
};

export const command = ['setnamebot', 'setsubbotname'];
export const category = 'info';
export const description = 'Cambia el nombre de tu subbot vinculado.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    const subs = Array.from(getActiveBots().values());

    // FIXED: Debería FUNCIONAR SOLO en subbots, no en el bot principal
    if (!subs.includes(sock)) {
        return msg.reply('🪷 Este comando solo funciona desde un subbot vinculado.');
    }

    const value = (extra?.args || []).join(' ').trim();

    if (!value) {
        const p = (global as any).prefix?.[0] || '.';
        return sock.sendMessage(
            msg.from,
            {
                text:
                    `${(global as any).namebot}\n\n` +
                    `🍓͜ᩧ𑂳ᰍ  𝗖𝗔𝗠𝗕𝗜𝗔𝗥 𝗡𝗢𝗠𝗕𝗥𝗘\n\n` +
                    `🪷 Este comando cambia el nombre de tu subbot vinculado.\n\n` +
                    `📌 Uso:\n> ${p}setnamebot Mi Nuevo Nombre\n\n` +
                    `🍓 Ejemplo:\n> ${p}setnamebot Hatsune-Bot\n\n` +
                    `ꨄ︎ ${(global as any).nmcreador}`
            },
            { quoted: msg }
        );
    }

    try {
        let botPhone = '';

        for (const [phone, bot] of getActiveBots().entries()) {
            if (bot === sock) {
                botPhone = phone;
                break;
            }
        }

        if (!botPhone) {
            return msg.reply('⚠️ No se pudo identificar este subbot.');
        }

        if (!canModifySubBot(botPhone, msg.sender)) {
            return msg.reply(
                `${(global as any).namebot}\n\n` +
                `🍓͜ᩧ𑂳ᰍ  𝙰𝙲𝙲𝙴𝚂𝙾 𝙳𝙴𝙽𝙴𝙶𝙰𝙳𝙾\n\n` +
                `🪷 Solo el propietario de este subbot puede cambiar su nombre.\n\n` +
                `ꨄ︎ ${(global as any).nmcreador}`
            );
        }

        if (value.length > 100) {
            return msg.reply('⚠️ El nombre es muy largo (máximo 100 caracteres).');
        }

        setSubBotName(botPhone, value);

        return sock.sendMessage(
            msg.from,
            {
                text:
                    `${(global as any).namebot}\n\n` +
                    `🍓͜ᩧ𑂳ᰍ  𝗖𝗔𝗠𝗕𝗜𝗔𝗗𝗢\n\n` +
                    `🪷 Nombre de tu subbot actualizado a *${value}*.\n` +
                    `📌 Este cambio se ha guardado permanentemente.\n\n` +
                    `ꨄ︎ ${(global as any).nmcreador}`
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[SETNAMEBOT ERROR]:', error);
        return msg.reply(`⚠️ Error al cambiar el nombre: ${error.message || 'Intenta de nuevo.'}`);
    }
}
