import { db } from './database.ts';

export function getPrimary(groupJid: string): string {
    const row = db
        .prepare('SELECT botNumber FROM group_primary WHERE groupJid = ?')
        .get(groupJid) as any;
    return row?.botNumber || '';
}

export function setPrimary(groupJid: string, botNumber: string): void {
    db.prepare(`
        INSERT INTO group_primary (groupJid, botNumber)
        VALUES (?, ?)
        ON CONFLICT(groupJid) DO UPDATE SET botNumber = excluded.botNumber
    `).run(groupJid, botNumber);
}

export function clearPrimary(groupJid: string): void {
    db.prepare('DELETE FROM group_primary WHERE groupJid = ?').run(groupJid);
}
