import { isOwner, deco, warn } from '../lib/perms.ts';

export const command = ['nuevofotobot', 'setfotobot', 'setbannerbot'];
export const category = 'owner';
export const description = 'Cambiar el banner del bot principal (solo owner).';
export const owner = true;
export const admin = false;
export const botAdmin = false;

function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i) !== null;
    } catch {
        return false;
    }
}

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    if (!isOwner(sock, msg, rawMsg)) {
        return sock.sendMessage(msg.from, { text: warn.owner() }, { quoted: msg });
    }

    const p = (global as any).prefix?.[0] || '.';
    let bannerUrl: string = '';

    if ((extra?.args || []).length > 0) {
        bannerUrl = (extra?.args || []).join(' ').trim();
    } else if (msg.quoted?.imageMessage) {
        bannerUrl = msg.quoted?.download?.() || '';
    }

    if (!bannerUrl && (extra?.args || []).length === 0 && !msg.quoted?.imageMessage) {
        return sock.sendMessage(
            msg.from,
            {
                text:
                    `${(global as any).namebot}\n\n` +
                    `🍓͜ᩧ𑂳ᰍ  𝗖𝗔𝗠𝗕𝗜𝗔𝗥 𝗕𝗔𝗡𝗡𝗘𝗥\n\n` +
                    `🪷 Este comando cambia el banner del bot principal.\n\n` +
                    `📌 Formas de uso:\n` +
                    `> ${p}nuevofotobot https://ejemplo.com/banner.jpg\n` +
                    `> Responde a una imagen con ${p}nuevofotobot\n\n` +
                    `ꨄ︎ ${(global as any).nmcreador}`
            },
            { quoted: msg }
        );
    }

    if (!bannerUrl) {
        return sock.sendMessage(
            msg.from,
            { text: deco('𝗕𝗔𝗡𝗡𝗘𝗥 𝗘𝗥𝗢𝗥', '⚠️ No se proporcionó URL válida ni imagen.') },
            { quoted: msg }
        );
    }

    if (!isValidUrl(bannerUrl)) {
        return sock.sendMessage(
            msg.from,
            {
                text: deco(
                    '𝗕𝗔𝗡𝗡𝗘𝗥 𝗘𝗥𝗢𝗥',
                    '⚠️ La URL no es válida. Debe ser una URL de imagen (jpg, png, gif, webp, bmp).'
                )
            },
            { quoted: msg }
        );
    }

    if (bannerUrl.length > 500) {
        return sock.sendMessage(
            msg.from,
            { text: deco('𝗕𝗔𝗡𝗡𝗘𝗥 𝗘𝗥𝗢𝗥', '⚠️ La URL del banner es muy larga.') },
            { quoted: msg }
        );
    }

    (global as any).bannerbot = bannerUrl;

    return sock.sendMessage(
        msg.from,
        {
            text:
                `${(global as any).namebot}\n\n` +
                `🍓͜ᩧ𑂳ᰍ  𝗕𝗔𝗡𝗡𝗘𝗥 𝗔𝗖𝗧𝗨𝗔𝗟𝗜𝗭𝗔𝗗𝗢\n\n` +
                `🪷 El banner del bot ha sido actualizado.\n` +
                `📌 Este cambio se mantiene hasta que el bot se reinicie.\n\n` +
                `ꨄ︎ ${(global as any).nmcreador}`
        },
        { quoted: msg }
    );
}
