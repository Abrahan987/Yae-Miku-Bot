import { isOwner, deco, warn } from '../lib/perms.ts';
import { getImageFromMessage, isHttpUrl } from '../lib/subbot_config.ts';
import fs from 'fs';
import path from 'path';

export const command = ['nuevofotobot', 'setfotobot', 'setbannerbot'];
export const category = 'owner';
export const description = 'Cambiar el banner del bot principal (solo owner).';
export const owner = true;
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    if (!isOwner(sock, msg, rawMsg)) {
        return sock.sendMessage(msg.from, { text: warn.owner() }, { quoted: msg });
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
                    `🪷 Este comando cambia el banner del bot principal.\n\n` +
                    `📌 Formas de uso:\n` +
                    `> ${p}nuevofotobot https://ejemplo.com/banner.jpg\n` +
                    `> Responde a una imagen con ${p}nuevofotobot\n\n` +
                    `ꨄ︎ ${(global as any).nmcreador}`
            },
            { quoted: msg }
        );
    }

    let value = bannerUrl;

    if (image) {
        const dir = path.join(process.cwd(), 'banners');
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, 'main.jpg');
        fs.writeFileSync(file, image);
        value = file;
    } else if (!isHttpUrl(bannerUrl) || bannerUrl.length > 500) {
        return sock.sendMessage(
            msg.from,
            { text: deco('𝗕𝗔𝗡𝗡𝗘𝗥 𝗘𝗥𝗥𝗢𝗥', '⚠️ La URL no es válida. Debe empezar con http:// o https://') },
            { quoted: msg }
        );
    }

    (global as any).icono = value;
    (global as any).banner = value;

    return sock.sendMessage(
        msg.from,
        {
            text:
                `${(global as any).namebot}\n\n` +
                `🍓͜ᩧ𑂳ᰍ  𝗕𝗔𝗡𝗡𝗘𝗥 𝗔𝗖𝗧𝗨𝗔𝗟𝗜𝗭𝗔𝗗𝗢\n\n` +
                `🪷 El banner del bot principal ha sido actualizado y ya se aplica en el menú.\n` +
                `📌 Se mantiene hasta que el bot se reinicie.\n\n` +
                `ꨄ︎ ${(global as any).nmcreador}`
        },
        { quoted: msg }
    );
}
