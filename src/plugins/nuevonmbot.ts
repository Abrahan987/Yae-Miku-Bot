import { isOwner, isMainBot, deco, warn } from '../lib/perms.ts';

export const command = ['nuevonmbot', 'setnombrebot'];
export const category = 'owner';
export const description = 'Cambiar el nombre del bot principal (solo owner).';
export const owner = true;
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    if (!isMainBot(sock) || !isOwner(sock, msg, rawMsg)) {
        return sock.sendMessage(msg.from, { text: warn.owner() }, { quoted: msg });
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
                    `🪷 Este comando cambia el nombre del bot principal.\n\n` +
                    `📌 Uso:\n> ${p}nuevonmbot Mi Nuevo Nombre\n\n` +
                    `🍓 Ejemplo:\n> ${p}nuevonmbot Yae Miku Bot\n\n` +
                    `ꨄ︎ ${(global as any).nmcreador}`
            },
            { quoted: msg }
        );
    }

    if (value.length > 100) {
        return sock.sendMessage(
            msg.from,
            { text: deco('𝗡𝗢𝗠𝗕𝗥𝗘 𝗘𝗥𝗥𝗢𝗥', '⚠️ El nombre es muy largo (máximo 100 caracteres).') },
            { quoted: msg }
        );
    }

    (global as any).namebot = value;

    return sock.sendMessage(
        msg.from,
        {
            text:
                `${value}\n\n` +
                `🍓͜ᩧ𑂳ᰍ  𝗡𝗢𝗠𝗕𝗥𝗘 𝗔𝗖𝗧𝗨𝗔𝗟𝗜𝗭𝗔𝗗𝗢\n\n` +
                `🪷 El nombre del bot ha sido cambiado a *${value}*.\n` +
                `📌 Este cambio se mantiene hasta que el bot se reinicie.\n` +
                `Para hacerlo permanente, edita \`config.ts\`.\n\n` +
                `ꨄ︎ ${(global as any).nmcreador}`
        },
        { quoted: msg }
    );
}
