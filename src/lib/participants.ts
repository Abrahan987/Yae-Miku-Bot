import { UserJid } from '#simple';

export const num = (x: any): string =>
    String(x || '').split('@')[0].split(':')[0].replace(/[^\d]/g, '');

const strip = (n: string): string => (n.startsWith('521') ? '52' + n.slice(3) : n);

export function participantIds(p: any): string[] {
    return [p?.id, p?.lid, p?.phoneNumber]
        .map(num)
        .filter(Boolean)
        .flatMap((n) => [n, strip(n)]);
}

export function findParticipant(participants: any[], ...jids: any[]): any {
    const wanted = jids.map(num).filter(Boolean).flatMap((n) => [n, strip(n)]);
    if (!wanted.length) return null;
    return participants.find((p: any) => participantIds(p).some((i) => wanted.includes(i))) || null;
}

export const isAdminP = (p: any): boolean => p?.admin === 'admin' || p?.admin === 'superadmin';

/** Obtiene el usuario objetivo (mencion o mensaje citado) y lo busca en el grupo, soportando LID y numero. */
export async function resolveTarget(sock: any, msg: any, chatId: string) {
    const raw: string = (msg.mentionedJid || [])[0] || msg.quoted?.sender || '';
    if (!raw) return { raw: '', target: null as any, participants: [] as any[] };

    let resolved = raw;
    try { resolved = UserJid(sock, chatId, raw) || raw; } catch {}

    const metadata = await sock.groupMetadata(chatId);
    const participants: any[] = metadata?.participants || [];
    const target = findParticipant(participants, raw, resolved, msg.quoted?.key?.participant);

    return { raw, resolved, target, participants };
}
