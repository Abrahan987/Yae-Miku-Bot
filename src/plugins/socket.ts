import { getActiveBots } from '../lib/subbot.ts';
import { deco, isOwner, warn } from '../lib/perms.ts';

export const command = [
    'bots', 'sockets',
    'setusername', 'setpfp', 'setimage',
    'setbanner', 'setbotbanner', 'seticon', 'setboticon',
    'setlink', 'setbotlink', 'setchannel', 'setbotchannel',
    'setcurrency', 'setbotcurrency', 'setowner', 'setbotowner'
];
export const category = 'socket';
export const description = 'Herramientas y configuración de sockets.';
export const owner = false;

const clean = (jid = '') => String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');

function ownerOnly(sock: any, msg: any, rawMsg: any): boolean {
    return isOwner(sock, msg, rawMsg);
}

async function saveImageUrl(msg: any, args: string[]): Promise<string | null> {
    const url = args.join(' ').trim();
    if (/^https?:\/\//i.test(url)) return url;
    return null;
}

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    const cmd = String(extra.command || '').toLowerCase();
    const args = extra.args || [];
    const p = (global as any).prefix?.[0] || '.';

    // Visible para todos: lista el bot actual y los sub-bots conectados.
    if (cmd === 'bots' || cmd === 'sockets') {
        const main = clean(sock.user?.id || '');
        const subs = [...getActiveBots().keys()];
        const mentioned = [main, ...subs].filter(Boolean).map(n => `${n}@s.whatsapp.net`);
        const lines = [
            `🍓͜ᩧ𑂳ᰍ  𝚂𝙾𝙲𝙺𝙴𝚃𝚂 𝙰𝙲𝚃𝙸𝚅𝙾𝚂`,
            '',
            `🪷 𝙿𝚁𝙸𝙽𝙲𝙸𝙿𝙰𝙻 › ${main ? `@${main}` : 'No disponible'}`,
            `🪷 𝚂𝚄𝙱-𝙱𝙾𝚃𝚂 › *${subs.length}*`,
            '',
            ...(subs.length ? subs.map((n, i) => `${i + 1}. @${n}`) : ['> No hay sub-bots conectados actualmente.']),
            '',
            `ꨄ︎ ${(global as any).nmcreador}`
        ];
        return sock.sendMessage(msg.from, { text: lines.join('\n'), mentions: mentioned }, { quoted: msg });
    }

    if (!ownerOnly(sock, msg, rawMsg)) {
        return sock.sendMessage(msg.from, { text: warn.owner() }, { quoted: msg });
    }

    if (cmd === 'setusername') {
        const name = args.join(' ').trim();
        if (!name) return sock.sendMessage(msg.from, { text: deco('𝚂𝙴𝚃𝚄𝚂𝙴𝚁𝙽𝙰𝙼𝙴', `🪷 𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n> ${p}setusername Yae Miku`) }, { quoted: msg });
        await sock.updateProfileName(name);
        return sock.sendMessage(msg.from, { text: deco('𝚂𝙴𝚃𝚄𝚂𝙴𝚁𝙽𝙰𝙼𝙴', `🪷 Nombre de WhatsApp actualizado a *${name}*.`) }, { quoted: msg });
    }

    if (cmd === 'setpfp' || cmd === 'setimage') {
        const mime = String((msg as any)?.message?.imageMessage?.mimetype || '');
        if (!mime.startsWith('image/')) {
            return sock.sendMessage(msg.from, { text: deco('𝚂𝙴𝚃𝙿𝙵𝙿', `🪷 Envía una imagen con el texto *${p}${cmd}* como pie de foto.`) }, { quoted: msg });
        }
        const image = await msg.download();
        if (!image?.length) return sock.sendMessage(msg.from, { text: deco('𝚂𝙴𝚃𝙿𝙵𝙿', '🪷 No pude descargar la imagen.') }, { quoted: msg });
        await sock.updateProfilePicture(sock.user.id, image);
        return sock.sendMessage(msg.from, { text: deco('𝚂𝙴𝚃𝙿𝙵𝙿', '🪷 Foto de perfil del bot actualizada.') }, { quoted: msg });
    }

    if (cmd === 'setbanner' || cmd === 'setbotbanner' || cmd === 'seticon' || cmd === 'setboticon') {
        const url = await saveImageUrl(msg, args);
        if (!url) {
            return sock.sendMessage(msg.from, { text: deco(cmd.includes('banner') ? '𝚂𝙴𝚃𝙱𝙰𝙽𝙽𝙴𝚁' : '𝚂𝙴𝚃𝙸𝙲𝙾𝙽', `🪷 Envía una URL de imagen válida.\n> ${p}${cmd} https://ejemplo.com/imagen.jpg`) }, { quoted: msg });
        }
        if (cmd.includes('banner')) (global as any).banner = url;
        else (global as any).icono = url;
        return sock.sendMessage(msg.from, { text: deco(cmd.includes('banner') ? '𝚂𝙴𝚃𝙱𝙰𝙽𝙽𝙴𝚁' : '𝚂𝙴𝚃𝙸𝙲𝙾𝙽', `🪷 ${cmd.includes('banner') ? 'Banner' : 'Ícono'} actualizado. El cambio se mantiene hasta reiniciar; para hacerlo permanente edita *config.ts*.`) }, { quoted: msg });
    }

    if (cmd === 'setlink' || cmd === 'setbotlink') {
        const url = args.join(' ').trim();
        if (!/^https?:\/\//i.test(url)) return sock.sendMessage(msg.from, { text: deco('𝚂𝙴𝚃𝙻𝙸𝙽𝙺', `🪷 Usa una URL válida.\n> ${p}setlink https://github.com/Abrahan987/Yae-Miku-Bot`) }, { quoted: msg });
        (global as any).link = url;
        return sock.sendMessage(msg.from, { text: deco('𝚂𝙴𝚃𝙻𝙸𝙽𝙺', '🪷 Enlace del bot actualizado para esta sesión.') }, { quoted: msg });
    }

    if (cmd === 'setchannel' || cmd === 'setbotchannel') {
        const value = args.join(' ').trim();
        const invite = value.match(/whatsapp\.com\/channel\/([0-9A-Za-z]{22,24})/i)?.[1];
        if (!invite) return sock.sendMessage(msg.from, { text: deco('𝚂𝙴𝚃𝙲𝙷𝙰𝙽𝙽𝙴𝙻', `🪷 Envía un enlace válido de canal.\n> ${p}setchannel https://whatsapp.com/channel/XXXXXXXX`) }, { quoted: msg });
        try {
            const data = await sock.newsletterMetadata('invite', invite);
            (global as any).rcanal = data?.id || (global as any).rcanal;
            return sock.sendMessage(msg.from, { text: deco('𝚂𝙴𝚃𝙲𝙷𝙰𝙽𝙽𝙴𝙻', `🪷 Canal actualizado a *${data?.thread_metadata?.name?.text || 'Canal de WhatsApp'}* para esta sesión.`) }, { quoted: msg });
        } catch {
            return sock.sendMessage(msg.from, { text: deco('𝚂𝙴𝚃𝙲𝙷𝙰𝙽𝙽𝙴𝙻', '🪷 No pude validar ese canal. Revisa el enlace.') }, { quoted: msg });
        }
    }

    if (cmd === 'setcurrency' || cmd === 'setbotcurrency') {
        const value = args.join(' ').trim();
        if (!value) return sock.sendMessage(msg.from, { text: deco('𝚂𝙴𝚃𝙲𝚄𝚁𝚁𝙴𝙽𝙲𝚈', `🪷 𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n> ${p}setcurrency Yen`) }, { quoted: msg });
        (global as any).currency = value;
        return sock.sendMessage(msg.from, { text: deco('𝚂𝙴𝚃𝙲𝚄𝚁𝚁𝙴𝙽𝙲𝚈', `🪷 Moneda configurada como *${value}* para esta sesión.`) }, { quoted: msg });
    }

    if (cmd === 'setowner' || cmd === 'setbotowner') {
        const target = msg.mentionedJid?.[0] || msg.quoted?.sender || '';
        const text = args.join(' ').trim().toLowerCase();
        if (text === 'clear') {
            return sock.sendMessage(msg.from, { text: deco('𝚂𝙴𝚃𝙾𝚆𝙽𝙴𝚁', '🪷 Por seguridad, el owner principal solo se cambia editando *config.ts*.') }, { quoted: msg });
        }
        if (!target) return sock.sendMessage(msg.from, { text: deco('𝚂𝙴𝚃𝙾𝚆𝙽𝙴𝚁', `🪷 Menciona o responde al nuevo owner.\n> ${p}setowner @usuario`) }, { quoted: msg });
        (global as any).owner = clean(target);
        return sock.sendMessage(msg.from, { text: deco('𝚂𝙴𝚃𝙾𝚆𝙽𝙴𝚁', `🪷 Owner temporal actualizado a @${clean(target)}. Para hacerlo permanente edita *config.ts*.`), mentions: [target] }, { quoted: msg });
    }
}
