import { db } from './database.ts';
import { UserJid } from '#simple';

db.exec(`
    CREATE TABLE IF NOT EXISTS marriages (
        userNum TEXT PRIMARY KEY,
        partnerNum TEXT NOT NULL,
        since INTEGER DEFAULT 0
    )
`);

export const toNum = (x: any): string =>
    String(x || '').split('@')[0].split(':')[0].replace(/\D/g, '');

export const toJid = (n: string): string => `${n}@s.whatsapp.net`;

/** Devuelve el numero de la pareja (solo digitos) o null si no esta casado. */
export function getPartner(user: string): string | null {
    const n = toNum(user);
    if (!n) return null;
    const row = db.prepare('SELECT partnerNum FROM marriages WHERE userNum = ?').get(n) as any;
    return row?.partnerNum || null;
}

export function getMarriageDate(user: string): number {
    const n = toNum(user);
    const row = db.prepare('SELECT since FROM marriages WHERE userNum = ?').get(n) as any;
    return Number(row?.since || 0);
}

export function marry(a: string, b: string): void {
    const x = toNum(a);
    const y = toNum(b);
    const now = Date.now();
    db.exec('BEGIN');
    try {
        const stmt = db.prepare(`
            INSERT INTO marriages (userNum, partnerNum, since) VALUES (?, ?, ?)
            ON CONFLICT(userNum) DO UPDATE SET partnerNum = excluded.partnerNum, since = excluded.since
        `);
        stmt.run(x, y, now);
        stmt.run(y, x, now);
        db.exec('COMMIT');
    } catch (e) {
        db.exec('ROLLBACK');
        throw e;
    }
}

/** Divorcia al usuario y devuelve el numero de su ex pareja (o null). */
export function divorce(user: string): string | null {
    const n = toNum(user);
    const partner = getPartner(n);
    if (!partner) return null;
    db.prepare('DELETE FROM marriages WHERE userNum = ? OR userNum = ?').run(n, partner);
    return partner;
}

/** Resuelve un JID (posible LID) al numero real usando la metadata del grupo. */
export async function resolveNumber(sock: any, msg: any, raw: string): Promise<string> {
    let resolved = raw;
    try { resolved = UserJid(sock, msg.from, raw) || raw; } catch {}

    if (resolved.endsWith('@s.whatsapp.net')) return toNum(resolved);

    if (msg.isGroup) {
        try {
            const metadata = await sock.groupMetadata(msg.from);
            const wanted = toNum(raw);
            const p = (metadata?.participants || []).find((x: any) =>
                [x.id, x.lid, x.phoneNumber].map(toNum).includes(wanted)
            );
            const phone = p?.phoneNumber || (String(p?.id || '').endsWith('@s.whatsapp.net') ? p.id : '');
            if (phone) return toNum(phone);
        } catch {}
    }

    return toNum(resolved);
}
