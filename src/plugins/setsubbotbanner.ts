import { getActiveBots } from '../lib/subbot.ts';
import { isSubBotOwner, setSubBotBanner, setSubBotBannerImage, getImageFromMessage, isHttpUrl } from '../lib/subbot_config.ts';

const normalizePhone = (input: string): string => {
    let s = String(input).replace(/\D/g, '');
    if (!s) return '';
    if (s.startsWith('0')) s = s.replace(/^0+/, '');
    if (s.length === 10 && s.startsWith('3')) s = '57' + s;
    if (s.startsWith('52') && !s.startsWith('521') && s.length >= 12) s = '521' + s.slice(2);
    if (s.startsWith('54') && !s.startsWith('549') && s.length >= 11) s = '549' + s.slice(2);
    return s;
};

export const command = ['setbanner', 'setsubbotbanner'];
export const category = 'info';
export const description = 'Cambia el banner de tu subbot vinculado.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    const subs = Array.from(getActiveBots().values());

    if (!subs.includes(sock)) {
        return msg.reply('🪷 Este comando solo funciona desde un subbot vinculado.');
    }

    const p = (global as any).prefix?.[0] || '.';
    const bannerUrl = (extra?.args || []).join(' ').trim();
    const image = bannerUrl ? null : await getImageFromMessage(msg);

    if (!bannerUrl && !image) {
        return sock.sendMessage(
            msg.from,
            {
                text:
                    `${(global as any).namebot}\n\n` +
                    `🍓͜ᩧ𑂳ᰍ  𝗖𝗔𝗠𝗕𝗜𝗔𝗥 𝗕𝗔𝗡𝗡𝗘𝗥\n\n` +
                    `🪷 Este comando cambia el banner de tu subbot.\n\n` +
                    `📌 Formas de uso:\n` +
                    `> ${p}setbanner https://ejemplo.com/banner.jpg\n` +
                    `> Responde a una imagen con ${p}setbanner\n\n` +
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

        if (!isSubBotOwner(sock, msg, rawMsg, botPhone)) {
            return msg.reply(
                `${(global as any).namebot}\n\n` +
                `🍓͜ᩧ𑂳ᰍ  𝙰𝙲𝙲𝙴𝚂𝙾 𝙳𝙴𝙽𝙴𝙶𝙰𝙳𝙾\n\n` +
                `🪷 Solo el propietario de este subbot puede cambiar su banner.\n\n` +
                `ꨄ︎ ${(global as any).nmcreador}`
            );
        }

        if (image) {
            setSubBotBannerImage(botPhone, image);
        } else {
            if (!isHttpUrl(bannerUrl)) {
                return msg.reply('⚠️ La URL no es válida. Debe empezar con http:// o https://');
            }
            if (bannerUrl.length > 500) {
                return msg.reply('⚠️ La URL del banner es muy larga.');
            }
            setSubBotBanner(botPhone, bannerUrl);
        }

        return sock.sendMessage(
            msg.from,
            {
                text:
                    `${(global as any).namebot}\n\n` +
                    `🍓͜ᩧ𑂳ᰍ  𝗖𝗔𝗠𝗕𝗜𝗔𝗗𝗢\n\n` +
                    `🪷 Banner de tu subbot actualizado.\n` +
                    `📌 Ya se aplica en el menú, sin reiniciar.\n\n` +
                    `ꨄ︎ ${(global as any).nmcreador}`
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[SETBANNER ERROR]:', error);
        return msg.reply(`⚠️ Error al cambiar el banner: ${error.message || 'Intenta de nuevo.'}`);
    }
}
