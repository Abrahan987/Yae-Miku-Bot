import { UserJid } from '#simple';

const norm = (x: any): string => String(x || '').split('@')[0].split(':')[0].replace(/\D/g, '');
const strip = (n: string): string => (n.startsWith('521') ? '52' + n.slice(3) : n);

/** true si quien escribe es el owner (global.owner) o el propio bot */
export function isOwner(sock: any, msg: any, rawMsg?: any): boolean {
    if (rawMsg?.key?.fromMe) return true;

    const owners = ([] as any[])
        .concat((global as any).owner || [])
        .map(norm)
        .filter(Boolean)
        .flatMap((n) => [n, strip(n)]);

    let resolved = msg.sender;
    try {
        if (msg.isGroup) resolved = UserJid(sock, msg.from, msg.sender) || msg.sender;
    } catch {}

    const nums = [resolved, msg.sender]
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
