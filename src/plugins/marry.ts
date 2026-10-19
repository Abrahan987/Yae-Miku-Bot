import { getUser } from '../lib/database.ts';
import { getPartner, marry, divorce, toNum, toJid, resolveNumber } from '../lib/marry.ts';

export const command = ['marry', 'casarse', 'divorce', 'divorciarse'];
export const category = 'economia';
export const description = 'Proponer o aceptar matrimonio, o divorciarte.';
export const admin = false;
export const botAdmin = false;

const PROPOSAL_MS = 120000;
// pendientes: numero de quien recibe -> { from, expires }
const proposals = new Map<string, { from: string; expires: number }>();

const deco = (title: string, body: string) =>
    `${(global as any).namebot}\n\n🍓͜ᩧ𑂳ᰍ  ${title}\n\n${body}\n\nꨄ︎ ${(global as any).nmcreador}`;

const nameOf = (num: string): string => {
    try { return getUser(toJid(num))?.name || num; } catch { return num; }
};

export default async function (sock: any, msg: any, extra: any) {
    const chatId = msg.from || msg.chat;
    const p = (global as any).prefix?.[0] || '.';
    const cmd = String(extra?.command || '').toLowerCase();
    const me = toNum(msg.sender);

    // ---------- DIVORCIO ----------
    if (cmd === 'divorce' || cmd === 'divorciarse') {
        const ex = divorce(me);
        if (!ex) {
            return sock.sendMessage(chatId, { text: deco('𝙳𝙸𝚅𝙾𝚁𝙲𝙸𝙾', '🪷 No estás casado con nadie.') }, { quoted: msg });
        }
        return sock.sendMessage(
            chatId,
            {
                text: deco('𝙳𝙸𝚅𝙾𝚁𝙲𝙸𝙾', `💔 @${me} y @${ex} ya no están casados.`),
                mentions: [toJid(me), toJid(ex)]
            },
            { quoted: msg }
        );
    }

    // ---------- MATRIMONIO ----------
    const raw: string = (msg.mentionedJid || [])[0] || msg.quoted?.sender || '';

    if (!raw) {
        return sock.sendMessage(
            chatId,
            { text: deco('𝙼𝙰𝚁𝚁𝚈', `🪷 Menciona o responde a la persona.\n> ${p}marry @usuario\n\nPara aceptar, la otra persona usa el mismo comando mencionándote.\nPara terminar: ${p}divorce`) },
            { quoted: msg }
        );
    }

    try {
        const target = await resolveNumber(sock, msg, raw);
        const botNum = toNum(sock.user?.id);

        if (!target) {
            return sock.sendMessage(chatId, { text: deco('𝙼𝙰𝚁𝚁𝚈', '🪷 No pude identificar a esa persona.') }, { quoted: msg });
        }
        if (target === me) {
            return sock.sendMessage(chatId, { text: deco('𝙼𝙰𝚁𝚁𝚈', '🪷 No puedes casarte contigo mismo.') }, { quoted: msg });
        }
        if (target === botNum) {
            return sock.sendMessage(chatId, { text: deco('𝙼𝙰𝚁𝚁𝚈', '🪷 El bot no puede casarse, lo siento.') }, { quoted: msg });
        }

        const myPartner = getPartner(me);
        if (myPartner) {
            return sock.sendMessage(
                chatId,
                { text: deco('𝙼𝙰𝚁𝚁𝚈', `🪷 Ya estás casado con @${myPartner}.\n> Usa ${p}divorce si quieres terminar.`), mentions: [toJid(myPartner)] },
                { quoted: msg }
            );
        }

        const theirPartner = getPartner(target);
        if (theirPartner) {
            return sock.sendMessage(
                chatId,
                { text: deco('𝙼𝙰𝚁𝚁𝚈', `🪷 @${target} ya está casado con @${theirPartner}.`), mentions: [toJid(target), toJid(theirPartner)] },
                { quoted: msg }
            );
        }

        // ¿la otra persona ya me había propuesto? entonces acepto
        const pending = proposals.get(me);
        if (pending && pending.from === target && pending.expires > Date.now()) {
            proposals.delete(me);
            marry(me, target);
            return sock.sendMessage(
                chatId,
                {
                    text: deco('𝙼𝙰𝚁𝚁𝚈', `💍 ¡Se han casado!\n\n🪷 @${me} 💖 @${target}\n\nAhora aparecerán como pareja en su perfil.`),
                    mentions: [toJid(me), toJid(target)]
                },
                { quoted: msg }
            );
        }

        // nueva propuesta
        proposals.set(target, { from: me, expires: Date.now() + PROPOSAL_MS });
        return sock.sendMessage(
            chatId,
            {
                text: deco(
                    '𝙿𝚁𝙾𝙿𝚄𝙴𝚂𝚃𝙰',
                    `💌 @${nameOf(me)} le propuso matrimonio a @${target}.\n\n` +
                    `🪷 Para aceptar: *${p}marry @${me}*\n` +
                    `⏳ La propuesta expira en 2 minutos.`
                ).replace(`@${nameOf(me)}`, `@${me}`),
                mentions: [toJid(me), toJid(target)]
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[MARRY ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al procesar el matrimonio.');
    }
}
