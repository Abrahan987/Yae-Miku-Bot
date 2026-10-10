import { isOwner, deco, warn } from '../lib/perms.ts';

export const command = ['setprefix', 'setbotprefix'];
export const category = 'owner';
export const description = 'Cambiar el prefijo del bot (solo owner).';
export const admin = false;
export const botAdmin = false;

const DEFAULT_PREFIX = ['.', '#'];

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    if (!isOwner(sock, msg, rawMsg)) {
        return sock.sendMessage(msg.from, { text: warn.owner() }, { quoted: msg });
    }

    const value = (extra?.args || []).join(' ').trim();
    const current = ([] as string[]).concat((global as any).prefix || DEFAULT_PREFIX);
    const p = current[0] || '.';

    if (!value) {
        return sock.sendMessage(
            msg.from,
            {
                text: deco(
                    '𝚂𝙴𝚃𝙿𝚁𝙴𝙵𝙸𝚇',
                    `🪷 𝙿𝚁𝙴𝙵𝙸𝙹𝙾𝚂 𝙰𝙲𝚃𝚄𝙰𝙻𝙴𝚂\n> ${current.join(' ')}\n\n🪷 𝙴𝙹𝙴𝙼𝙿𝙻𝙾𝚂\n> ${p}setprefix .\n> ${p}setprefix . # !\n> ${p}setprefix reset`
                )
            },
            { quoted: msg }
        );
    }

    if (value.toLowerCase() === 'reset') {
        (global as any).prefix = [...DEFAULT_PREFIX];
        return sock.sendMessage(
            msg.from,
            { text: deco('𝚂𝙴𝚃𝙿𝚁𝙴𝙵𝙸𝚇', `🪷 Prefijos restaurados: *${DEFAULT_PREFIX.join(' ')}*`) },
            { quoted: msg }
        );
    }

    const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
    const list: string[] = [];
    for (const { segment } of segmenter.segment(value)) {
        const g = String(segment).trim();
        if (!g || /^[a-zA-Z0-9]+$/.test(g)) continue;
        if (!list.includes(g)) list.push(g);
    }

    if (!list.length) {
        return sock.sendMessage(
            msg.from,
            { text: deco('𝚂𝙴𝚃𝙿𝚁𝙴𝙵𝙸𝚇', '🪷 No se detectaron prefijos válidos. Incluye al menos un símbolo o emoji.') },
            { quoted: msg }
        );
    }
    if (list.length > 6) {
        return sock.sendMessage(
            msg.from,
            { text: deco('𝚂𝙴𝚃𝙿𝚁𝙴𝙵𝙸𝚇', '🪷 Máximo 6 prefijos permitidos.') },
            { quoted: msg }
        );
    }

    (global as any).prefix = list;

    return sock.sendMessage(
        msg.from,
        { text: deco('𝚂𝙴𝚃𝙿𝚁𝙴𝙵𝙸𝚇', `🪷 Prefijos actualizados a: *${list.join(' ')}*\n> Se mantienen hasta que el bot se reinicie. Para hacerlo permanente cámbialo en config.ts.`) },
        { quoted: msg }
    );
}
