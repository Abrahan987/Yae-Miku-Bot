import { decodeJid, UserJid } from '#simple';

const norm = (x: any): string => String(x || '').split('@')[0].split(':')[0].replace(/\D/g, '');
const strip = (n: string): string => (n.startsWith('521') ? '52' + n.slice(3) : n);

export function isMainBot(sock: any): boolean {
    return !sock?.subbotPhone;
}

export function isOwner(sock: any, msg: any, rawMsg?: any): boolean {
    const owners = ([] as any[])
        .concat((global as any).owner || [])
        .map(norm)
        .filter(Boolean)
        .flatMap((n) => [n, strip(n)]);

    const key = rawMsg?.key || {};
    if (key.fromMe && isMainBot(sock)) return true;
    if (key.fromMe) {
        return [sock?.user?.id, sock?.subbotPhone]
            .filter((id) => typeof id === 'string' && (id.endsWith('@s.whatsapp.net') || /^\d+$/.test(id)))
            .map(norm)
            .flatMap((n) => [n, strip(n)])
            .some((n) => !!n && owners.includes(n));
    }

    const ids = msg?.isGroup
        ? [key.participant, key.participantPn, key.participantAlt]
        : [key.remoteJid, key.remoteJidAlt];
    const nums = ids
        .filter((id) => typeof id === 'string' && !!id)
        .map((id) => UserJid(sock, msg?.from, decodeJid(id)))
        .filter((id) => id.endsWith('@s.whatsapp.net'))
        .map(norm)
        .filter(Boolean)
        .flatMap((n) => [n, strip(n)]);

    return nums.some((n) => owners.includes(n));
}

/** Mensaje con la decoracion de Yae */
export function deco(title: string, body: string): string {
    return `${(global as any).namebot}\n\n🍓͜ᩧ𑂳ᰍ  ${title}\n\n${body}\n\nꨄ︎ ${(global as any).nmcreador}`;
}

export const warn = {
    owner: () =>
        deco('𝙰𝙲𝙲𝙴𝚂𝙾 𝙳𝙴𝙽𝙴𝙶𝙰𝙳𝙾', '🪷 Este comando solo puede ser usado por el *owner* del bot.'),
    admin: () =>
        deco('𝙰𝙲𝙲𝙴𝚂𝙾 𝙳𝙴𝙽𝙴𝙶𝙰𝙳𝙾', '🪷 Este comando solo puede ser usado por los *administradores* del grupo.'),
    botAdmin: () =>
        deco('𝙰𝙲𝙲𝙴𝚂𝙾 𝙳𝙴𝙽𝙴𝙶𝙰𝙳𝙾', '🪷 El bot necesita ser *administrador* del grupo para ejecutar este comando.'),
    group: () =>
        deco('𝚂𝙾𝙻𝙾 𝙶𝚁𝚄𝙿𝙾𝚂', '🪷 Este comando solo puede usarse dentro de un *grupo*.'),
};
